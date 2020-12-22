import re
import functools
import importlib
from lark import Lark
from lark import Transformer
from lark import tree
import lark

class Variable:
	def __init__(self, t, value):
		self.type = t
		self.value = value

class Function(Variable):
	def __init__(self, scope, arguments, returntype, codeblock, defaultreturn):
		super(Function, self).__init__("function", self)

		self.scope = scope
		# Discarding types for now
		self.arguments = [(argument.children[1].value, argument.children[0].value) for argument in arguments]
		self.returntype = returntype
		self.codeblock = codeblock
		self.defaultreturn = defaultreturn

	def run(self, arguments):
		scope = self.scope.new_scope()
		if len(arguments) < len(self.arguments):
			raise TypeError("Missing arguments %s" % ', '.join(name for _, name in self.arguments[len(arguments):]))
		for value, (arg_type, arg_name) in zip(arguments, self.arguments):
			scope.variables[arg_name] = Variable(arg_type, value)
		for instruction in self.codeblock.children:
			exit, value = scope.eval_command(instruction)
			if exit:
				return value
		return scope.eval_expr(self.defaultreturn)

class Scope:
	def __init__(self, parent=None):
		self.parent = parent
		self.imports = []
		self.variables = {}

	def find_import(self, name):
		for imp in self.imports:
			if imp.__name__ == name:
				return imp

	def new_scope(self):
		return Scope(self)

	def get_variable(self, name):
		variable = self.variables.get(name)
		if variable is None:
			if self.parent:
				return self.parent.get_variable(name)
			else:
				raise NameError("You tried to get a variable/function `%s`, but it isn't defined." % name)
		else:
			return variable

	def eval_value(self, value):
		if value.type == "NUMBER":
			# QUESTION: Float or int?
			return int(value)
		elif value.type == "STRING":
			# TODO: Character escapes
			return value[1:-1]
		elif value.type == "BOOLEAN":
			if value.value == "false":
				return False
			elif value.value == "true":
				return True
			else:
				raise SyntaxError("Unexpected boolean value %s" % value.value)
		elif value.type == "NAME":
			return self.get_variable(value.value).value
		else:
			raise SyntaxError("Unexpected value type %s value %s" % (value.type, value.value))

	"""
	Evaluate a parsed expression with Trees and Tokens from Lark.
	"""
	def eval_expr(self, expr):
		if type(expr) == lark.Token:
			return self.eval_value(expr)

		if expr.data == "ifelse_expr":
			condition, ifTrue, ifFalse = expr.children
			if self.eval_expr(condition):
				return self.eval_expr(ifTrue)
			else:
				return self.eval_expr(ifFalse)
		elif expr.data == "function_callback":
			function, *arguments = expr.children[0].children
			return self.eval_expr(function).run([self.eval_expr(arg) for arg in arguments])
		elif expr.data == "imported_command":
			l, c, *args = command.children
			library = self.find_import(l)
			if library == None:
				raise SyntaxError("Library %s not found" %(l))
			com = getattr(library, c)
			if com == None:
				raise SyntaxError("Command %s not found" %(c))
			return com([a.children[0] for a in args])
		elif expr.data == "or_expression":
			left, _, right = expr.children
			return self.eval_expr(left) or self.eval_expr(right)
		elif expr.data == "and_expression":
			left, _, right = expr.children
			return self.eval_expr(left) and self.eval_expr(right)
		elif expr.data == "compare_expression":
			# compare_expression chains leftwards. It's rather complex because it
			# chains but doesn't accumulate a value unlike addition. Also, there's a
			# lot of comparison operators.
			# For example, (1 = 2) = 3 (in code as `1 = 2 = 3`).
			left, comparison, right = expr.children
			if left.data == "compare_expression":
				# If left side is a comparison, it also needs to be true for the
				# entire expression to be true.
				if not self.eval_expr(left):
					return False
				# Use the left side's right value as the comparison value for this
				# comparison. For example, for `1 = 2 = 3`, where `1 = 2` is `left`,
				# we'll use `2`, which is `left`'s `right`.
				left = left.children[2]
			comparison = comparison.type
			if comparison == "EQUALS":
				return self.eval_expr(left) == self.eval_expr(right)
			elif comparison == "GORE":
				return self.eval_expr(left) >= self.eval_expr(right)
			elif comparison == "LORE":
				return self.eval_expr(left) <= self.eval_expr(right)
			elif comparison == "LESS":
				return self.eval_expr(left) < self.eval_expr(right)
			elif comparison == "GREATER":
				return self.eval_expr(left) > self.eval_expr(right)
			elif comparison == "NEQUALS" or comparison == "NEQUALS_QUIRKY":
				return self.eval_expr(left) != self.eval_expr(right)
			else:
				raise SyntaxError("Unexpected operation for compare_expression: %s" % comparison)
		elif expr.data == "sum_expression":
			left, operation, right = expr.children
			if operation.type == "ADD":
				return self.eval_expr(left) + self.eval_expr(right)
			elif operation.type == "SUBTRACT":
				return self.eval_expr(left) - self.eval_expr(right)
			else:
				raise SyntaxError("Unexpected operation for sum_expression: %s" % operation)
		elif expr.data == "product_expression":
			left, operation, right = expr.children
			if operation.type == "MULTIPLY":
				return self.eval_expr(left) * self.eval_expr(right)
			elif operation.type == "DIVIDE":
				return self.eval_expr(left) / self.eval_expr(right)
			elif operation.type == "ROUNDDIV":
				return self.eval_expr(left) // self.eval_expr(right)
			elif operation.type == "MODULO":
				return self.eval_expr(left) % self.eval_expr(right)
			else:
				raise SyntaxError("Unexpected operation for product_expression: %s" % operation)
		elif expr.data == "exponent_expression":
			left, _, right = expr.children
			return self.eval_expr(left) ** self.eval_expr(right)
		elif expr.data == "unary_expression":
			operation, value = expr.children
			if operation.type == "NEGATE":
				return -self.eval_expr(value)
			elif operation.type == "NOT" or operation.type == "NOT_QUIRKY":
				return not self.eval_expr(value)
			else:
				raise SyntaxError("Unexpected operation for unary_expression: %s" % operation)
		elif expr.data == "value":
			token_or_tree = expr.children[0]
			if type(token_or_tree) == lark.Tree:
				return self.eval_expr(token_or_tree)
			else:
				return self.eval_value(token_or_tree)
		else:
			print(expr)
			raise SyntaxError('Unexpected command/expression type %s' % expr.data)

	"""
	Evaluates a command given parsed Trees and Tokens from Lark.
	"""
	def eval_command(self, tree):
		if tree.data != "instruction":
			raise SyntaxError("Command %s not implemented" %(t.data))

		command = tree.children[0]

		if command.data == "imp":
			self.imports.append(importlib.import_module(command.children[0]))
		elif command.data == "function_def":
			deccall, returntype, codeblock, defaultreturn = command.children
			name, *arguments = deccall.children
			self.variables[name] = Function(self, arguments, returntype, codeblock, defaultreturn)
		elif command.data == "for":
			var, times , code = command.children
			name, type = var.children
			if type != "int":
				print("I cannot loop over a value of type %s." % type)
			scope = self.new_scope()
			for i in range(int(times)):
				scope.variables[name] = Variable(type, i)
				for child in code.children:
					exit, value = scope.eval_command(child)
					if exit:
						return (True, value)
		elif command.data == "print":
			print(self.eval_expr(command.children[0]))
		elif command.data == "return":
			return (True, self.eval_expr(command.children[0]))
		elif command.data == "declare":
			name_type, value = command.children
			name, type = name_type.children
			self.variables[name] = Variable(type, self.eval_expr(value))
		elif command.data == "imported_command":
			l, c, *args = command.children
			library = self.find_import(l)
			if library == None:
				raise SyntaxError("Library %s not found" %(l))
			com = getattr(library, c)
			if com == None:
				raise SyntaxError("Command %s not found" %(c))
			com([a.children[0] for a in args])
		elif command.data == "if":
			condition, body = command.children
			if self.eval_expr(condition):
				self.new_scope().eval_command(body)
		elif command.data == "ifelse":
			condition, if_true, if_false = command.children
			if self.eval_expr(condition):
				self.new_scope().eval_command(if_true)
			else:
				self.new_scope().eval_command(if_false)
		else:
			self.eval_expr(command)

		# No return
		return (False, None)

parse = ""
text = ""
with open("syntax.lark", "r") as f:
	parse = f.read()
with open("run.n", "r") as f:
	text = f.read()

n_parser = Lark(parse, start='start')

def runFunction(f, d):
	pass


def parseTree(t):
	if t.data == "start":
		scope = Scope()
		for child in t.children:
			scope.eval_command(child)
	else:
		raise SyntaxError("Unable to run parseTree on non-starting branch")



parseTree(n_parser.parse(text))
