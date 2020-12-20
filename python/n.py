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

class Function:
	def __init__(self, deccall, returntype, codeblock, deafultreturn):
		self.deccall = deccall
		self.returntype = returntype
		self.codeblock = codeblock
		self.deafultreturn = deafultreturn

class Scope:
	def __init__(self, parent=None):
		self.parent = parent
		self.imports = []
		self.variables = {}
		self.functions = {}

	def new_scope(self):
		return Scope(self)

	def get_variable(self, value):
		name = value.value
		variable = self.variables.get(name)
		if variable is None:
			if self.parent:
				return self.parent.get_variable(name)
			else:
				raise Exception(
					"Your variable `%s` at %d:%d isn't defined." % (name, value.line, value.column)
				)
		else:
			return variable

	"""
	Evaluate a parsed expression with Trees and Tokens from Lark.
	"""
	def eval_expr(self, expr):
		if type(expr) == lark.Token:
			return expr.value

		if expr.data == "ifelse":
			condition, ifTrue, ifFalse = expr.children
			if self.eval_expr(condition):
				return self.eval_expr(ifTrue.children[0])
			else:
				return self.eval_expr(ifFalse.children[0].children[0])
		elif expr.data == "function_callback":
			print(expr)
			data = expr.children[0]
			return runFunction(functions[data.children[0]], data)
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
				print("Unexpected operaton for compare_expression", comparison)
		elif expr.data == "sum_expression":
			left, operation, right = expr.children
			if operation.type == "ADD":
				return self.eval_expr(left) + self.eval_expr(right)
			elif operation.type == "SUBTRACT":
				return self.eval_expr(left) - self.eval_expr(right)
			else:
				print("Unexpected operaton for sum_expression", operation)
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
				print("Unexpected operaton for product_expression", operation)
		elif expr.data == "value":
			token = expr.children[0]
			if token.type == 'NUMBER':
				# TODO: Float or int?
				return int(token)
			else:
				print("Unexpected value type", token)
				return 0
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
			self.functions[deccall.children[0]] = Function(deccall, returntype, codeblock, defaultreturn)
		elif command.data == "loop":
			times, var, code = command.children
			name, type = var.children
			if type != "int":
				print("I cannot loop over a value of type %s." % type)
			scope = self.new_scope()
			for i in range(int(times)):
				scope.variables[name] = Variable("int", i)
				for child in code.children:
					scope.eval_command(child)
		elif command.data == "print":
			value = command.children[0].children[0]
			if value.data.startswith('"'):
				print(value[1:-1])
			else:
				print(self.eval_expr(value))
		elif command.data == "return":
			return command.children[0]
		elif command.data == "declare":
			pass # TODO
		elif command.data == "imported_command":
			pass # TODO
		elif command.data == "if":
			condition, body = command.children
			if self.eval_expr(condition):
				self.new_scope().eval_command(body)
		else:
			self.eval_expr(command)

parse = ""
text = ""
with open("syntax.lark", "r") as f:
	parse = f.read()
with open("run.n", "r") as f:
	text = f.read()

n_parser = Lark(parse, start='start')

print(n_parser.parse(text).pretty())

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
