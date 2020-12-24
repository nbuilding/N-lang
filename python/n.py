import re
import functools
import importlib
from lark import Lark
from lark import Transformer
from lark import tree
import lark
from colorama import init, Fore, Style
import argparse
init()

class Variable:
	def __init__(self, t, value):
		self.type = t
		self.value = value

class Function(Variable):
	def __init__(self, scope, arguments, returntype, codeblock):
		# Tuples represent function types. (a, b, c) represents a -> b -> c.
		types = tuple([type for _, type in arguments] + [returntype])
		super(Function, self).__init__(types, self)

		self.scope = scope
		self.arguments = arguments
		self.returntype = returntype
		self.codeblock = codeblock

	def run(self, arguments):
		scope = self.scope.new_scope(parent_function=self)
		for value, (arg_name, arg_type) in zip(arguments, self.arguments):
			scope.variables[arg_name] = Variable(arg_type, value)
		if len(arguments) < len(self.arguments):
			# Curry :o
			return Function(scope, self.arguments[len(arguments):], self.returntype, self.codeblock)
		for instruction in self.codeblock.children:
			exit, value = scope.eval_command(instruction)
			if exit:
				return value

class NativeFunction(Function):
	def __init__(self, scope, arguments, return_type, function, argument_cache=[]):
		super(NativeFunction, self).__init__(scope, arguments, return_type, None)
		self.function = function
		self.argument_cache = argument_cache

	def run(self, arguments):
		arguments = self.argument_cache + arguments
		if len(arguments) < len(self.arguments):
			return NativeFunction(self.scope, self.arguments, self.return_type, self.function, argument_cache=self.argument_cache + arguments)
		return self.function(*arguments)

class File:
	def __init__(self, file, tab_length=4):
		self.lines = [line.rstrip().replace('\t', ' ' * tab_length) for line in file]
		self.line_num_width = len(str(len(self.lines)))

	def parse(self, parser):
		return parser.parse('\n'.join(self.lines))

	def get_line(self, line):
		return self.lines[line - 1]

	def get_lines(self, start, end):
		return self.lines[start - 1:end]

	def display(self, start_line, start_col, end_line, end_col, color=Fore.RED):
		output = []
		if start_line == end_line:
			line = self.get_line(start_line)
			output.append(f"{Fore.CYAN}{start_line:>{self.line_num_width}} | {Style.RESET_ALL}{line}")
			output.append(
				' ' * (self.line_num_width + 2 + start_col) +
				color +
				'^' * (end_col - start_col) +
				Style.RESET_ALL
			)
		else:
			for line_num, line in enumerate(self.get_lines(start_line, end_line), start=start_line):
				if line_num == start_line:
					line = line[:start_col - 1] + Fore.RED + line[start_col - 1:] + Style.RESET_ALL
				elif line_num == end_line:
					line = Fore.RED + line[:end_col - 1] + Style.RESET_ALL + line[end_col - 1:]
				else:
					line = Fore.RED + line + Style.RESET_ALL
				output.append(f"{Fore.CYAN}{line_num:>{self.line_num_width}} | {Style.RESET_ALL}{line}")
		return '\n'.join(output)

class TypeCheckError:
	def __init__(self, token_or_tree, message):
		if type(token_or_tree) is not lark.Token and type(token_or_tree) is not lark.Tree:
			raise TypeError("token_or_tree should be a Lark Token or Tree.")
		self.datum = token_or_tree
		self.message = message

	def display(self, display_type, file):
		output = ""
		color = Fore.RED
		if display_type == "error":
			output += f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}"
		elif display_type == "warning":
			output += f"{Fore.YELLOW}{Style.BRIGHT}Warning{Style.RESET_ALL}"
			color = Fore.YELLOW
		else:
			raise ValueError("%s is not a valid display type for TypeCheckError." % display_type)
		output += ": %s\n" % self.message
		if type(self.datum) is lark.Token:
			output += f"{Fore.CYAN} --> {Fore.BLUE}run.n:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
			output += file.display(
				self.datum.line,
				self.datum.column,
				self.datum.end_line,
				self.datum.end_column,
			)
		else:
			output += f"{Fore.CYAN} --> {Fore.BLUE}run.n:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
			output += file.display(
				self.datum.line,
				self.datum.column,
				self.datum.end_line,
				self.datum.end_column,
				color
			)
		return output

# TODO: Move these into Scope because one day these might be scoped due to
# implementations of traits.
binary_operation_types = {
	"OR": { ("bool", "bool"): "bool", ("int", "int"): "int" },
	"AND": { ("bool", "bool"): "bool", ("int", "int"): "int" },
	"ADD": { ("int", "int"): "int", ("float", "float"): "float", ("str", "str"): "str" },
	"SUBTRACT": { ("int", "int"): "int", ("float", "float"): "float" },
	"MULTIPLY": { ("int", "int"): "int", ("float", "float"): "float" },
	"DIVIDE": { ("int", "int"): "int", ("float", "float"): "float" },
	"ROUNDDIV": { ("int", "int"): "int", ("float", "float"): "float" },
	"MODULO": { ("int", "int"): "int", ("float", "float"): "float" },
	# Exponents are weird because negative powers result in non-integers.
	"EXPONENT": { ("int", "int"): "float", ("float", "float"): "float" },
}
unary_operation_types = {
	"NEGATE": { "int": "int", "float": "float" },
	"NOT": { "bool": "bool", "int": "int" },
}
comparable_types = ["int", "float"]
iterable_types = { "int": "int" }

def display_type(n_type):
	if isinstance(n_type, str):
		return Fore.YELLOW + n_type + Style.RESET_ALL
	elif isinstance(n_type, tuple):
		return Fore.YELLOW + ' -> '.join(n_type) + Style.RESET_ALL
	else:
		print('display_type was given a value that is neither a string nor a tuple.', n_type)
		return Fore.RED + '???' + Style.RESET_ALL

def get_name_type(name_type):
	if len(name_type.children) == 1:
		return name_type.children[0].value, 'infer'
	else:
		name, type = name_type.children
		return name.value, type.value

class Scope:
	def __init__(self, parent=None, parent_function=None, errors=[], warnings=[], imports=[]):
		self.parent = parent
		self.parent_function = parent_function
		self.imports = imports
		self.variables = {}
		self.errors = errors
		self.warnings = warnings

	def find_import(self, name):
		for imp in self.imports:
			if imp.__name__ == name:
				return imp

	def new_scope(self, parent_function=None):
		return Scope(
			self,
			parent_function=parent_function or self.parent_function,
			errors=self.errors,
			warnings=self.warnings,
			imports=self.imports,
		)

	def get_variable(self, name, err=True):
		variable = self.variables.get(name)
		if variable is None:
			if self.parent:
				return self.parent.get_variable(name, err=err)
			elif err:
				raise NameError("You tried to get a variable/function `%s`, but it isn't defined." % name)
		else:
			return variable

	def get_parent_function(self):
		if self.parent_function is None:
			if self.parent:
				return self.parent.get_parent_function()
			else:
				return None
		else:
			return self.parent_function

	def eval_value(self, value):
		if value.type == "NUMBER":
			# QUESTION: Float or int?
			if "." in str(value.value):
				return float(value)
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
		if type(expr) is lark.Token:
			return self.eval_value(expr)

		if expr.data == "ifelse_expr":
			condition, if_true, if_false = expr.children
			if self.eval_expr(condition):
				return self.eval_expr(if_true)
			else:
				return self.eval_expr(if_false)
		elif expr.data == "function_def":
			arguments, returntype, codeblock = expr.children
			return Function(
				self,
				[(arg.children[0].value, arg.children[1].value) for arg in arguments.children],
				returntype.value,
				codeblock
			)
		elif expr.data == "function_callback":
			function, *arguments = expr.children[0].children
			return self.eval_expr(function).run([self.eval_expr(arg) for arg in arguments])
		elif expr.data == "imported_command":
			l, c, *args = expr.children
			library = self.find_import(l)
			com = getattr(library, c)
			return com([self.eval_expr(a.children[0]) for a in args])
		elif expr.data == "or_expression":
			left, _, right = expr.children
			return self.eval_expr(left) or self.eval_expr(right)
		elif expr.data == "and_expression":
			left, _, right = expr.children
			return self.eval_expr(left) and self.eval_expr(right)
		elif expr.data == "not_expression":
			_, value = expr.children
			return not self.eval_expr(value)
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
			elif comparison == "NEQUALS":
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
			else:
				raise SyntaxError("Unexpected operation for unary_expression: %s" % operation)
		elif expr.data == "value":
			token_or_tree = expr.children[0]
			if type(token_or_tree) is lark.Tree:
				return self.eval_expr(token_or_tree)
			else:
				return self.eval_value(token_or_tree)
		else:
			print('(parse tree):', expr)
			raise SyntaxError("Unexpected command/expression type %s" % expr.data)

	"""
	Evaluates a command given parsed Trees and Tokens from Lark.
	"""
	def eval_command(self, tree):
		if tree.data != "instruction":
			raise SyntaxError("Command %s not implemented" %(t.data))

		command = tree.children[0]

		if command.data == "imp":
			self.imports.append(importlib.import_module(command.children[0]))
		elif command.data == "for":
			var, iterable, code = command.children
			name, type = get_name_type(var)
			for i in range(int(iterable)):
				scope = self.new_scope()

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
			name, type = get_name_type(name_type)
			self.variables[name] = Variable(type, self.eval_expr(value))
		elif command.data == "if":
			condition, body = command.children
			if self.eval_expr(condition):
				exit, value = self.new_scope().eval_command(body)
				if exit:
					return (True, value)
		elif command.data == "ifelse":
			condition, if_true, if_false = command.children
			if self.eval_expr(condition):
				exit, value = self.new_scope().eval_command(if_true)
			else:
				exit, value = self.new_scope().eval_command(if_false)
			if exit:
				return (True, value)
		else:
			self.eval_expr(command)

		# No return
		return (False, None)

	def get_value_type(self, value):
		if value.type == "NUMBER":
			# TODO: We should return a generic `number` type and then try to
			# figure it out later.
			if "." in str(value.value):
				return "float"
			return "int"
		elif value.type == "STRING":
			return "str"
		elif value.type == "BOOLEAN":
			return "bool"
		elif value.type == "NAME":
			variable = self.get_variable(value.value, err=False)
			if variable is None:
				self.errors.append(TypeCheckError(value, "You haven't yet defined %s." % value.value))
				return None
			else:
				return variable.type

		self.errors.append(TypeCheckError(value, "Internal problem: I don't know the value type %s." % value.type))

	"""
	Type checks an expression and returns its type.
	"""
	def type_check_expr(self, expr):
		if type(expr) is lark.Token:
			return self.get_value_type(expr)

		if expr.data == "ifelse_expr":
			condition, if_true, if_false = expr.children
			cond_type = self.type_check_expr(condition)
			if_true_type = self.type_check_expr(if_true)
			if_false_type = self.type_check_expr(if_false)
			if cond_type is not None and cond_type != "bool":
				self.errors.append(TypeCheckError(condition, "The condition here should be a boolean, not a %s." % display_type(cond_type)))
			if if_true_type is None or if_false_type is None:
				return None
			if if_true_type != if_false_type:
				self.errors.append(TypeCheckError(expr, "The branches of the if-else expression should have the same type, but the true branch has type %s while the false branch has type %s." % (display_type(if_true_type), display_type(if_false_type))))
				return None
			if type(condition.children[0]) is lark.Token:
				if condition.children[0].value == "true":
					self.warnings.append(TypeCheckError(condition, "The else statement of the expression will never run."))
				if condition.children[0].value == "false":
					self.warnings.append(TypeCheckError(condition, "The if statement of the expression will never run."))
			return if_true_type
		elif expr.data == "function_def":
			arguments, returntype, codeblock = expr.children
			arguments = [(arg.children[0].value, arg.children[1].value) for arg in arguments.children]
			dummy_function = Function(self, arguments, returntype.value, codeblock)
			scope = self.new_scope(parent_function=dummy_function)
			for arg_name, arg_type in arguments:
				scope.variables[arg_name] = Variable(arg_type, "anything")
			exit_point = None
			warned = False
			for instruction in codeblock.children:
				exit = scope.type_check_command(instruction)
				if exit and exit_point is None:
					exit_point = exit
				elif exit_point and not warned:
					warned = True
					self.warnings.append(TypeCheckError(exit_point, "There are commands after this return statement, but I will never run them."))
			return dummy_function.type
		elif expr.data == "function_callback":
			function, *arguments = expr.children[0].children
			func_type = self.type_check_expr(function)
			if func_type is None:
				return None
			if not isinstance(func_type, tuple):
				self.errors.append(TypeCheckError(expr, "You tried to call a %s, which isn't a function." % display_type(func_type)))
				return None
			*arg_types, return_type = func_type
			for n, (argument, arg_type) in enumerate(zip(arguments, arg_types), start=1):
				check_type = self.type_check_expr(argument)
				if check_type is not None and check_type != arg_type:
					self.errors.append(TypeCheckError(expr, "For a %s's argument #%d, you gave a %s, but you should've given a %s." % (display_type(func_type), n, display_type(check_type), display_type(arg_type))))
			if len(arguments) > len(arg_types):
				self.errors.append(TypeCheckError(expr, "A %s has %d argument(s), but you gave %d." % (display_type(func_type), len(arg_types), len(arguments))))
				return None
			elif len(arguments) < len(arg_types):
				return func_type[len(arguments):]
			else:
				return return_type
		elif expr.data == "imported_command":
			l, c, *args = expr.children
			library = self.find_import(l)
			if library == None:
				self.errors.append(TypeCheckError(l, "Library %s not found." % l))
			else:
				try:
					if c not in library._values():
						self.errors.append(TypeCheckError(c, "Command %s in %s not found." % c, l))
					else:
						return library._values[c]
				except:
					pass
			return None
		elif expr.data == "value":
			token_or_tree = expr.children[0]
			if type(token_or_tree) is lark.Tree:
				return self.type_check_expr(token_or_tree)
			else:
				return self.get_value_type(token_or_tree)

		if len(expr.children) == 2 and type(expr.children[0]) is lark.Token:
			operation, value = expr.children
			types = unary_operation_types.get(operation.type)
			if types:
				value_type = self.type_check_expr(value)
				if value_type is None:
					return None
				return_type = types.get(value_type)
				if return_type is None:
					self.errors.append(TypeCheckError(expr, "I don't know how to use %s on a %s." % (operation.type, display_type(value_type))))
					return None
				else:
					return return_type

		# For now, we assert that both operands are of the same time. In the
		# future, when we add traits for operations, this assumption may no
		# longer hold.
		if len(expr.children) == 3 and type(expr.children[1]) is lark.Token:
			left, operation, right = expr.children
			types = binary_operation_types.get(operation.type)
			if types:
				left_type = self.type_check_expr(left)
				right_type = self.type_check_expr(right)
				# When `type_check_expr` returns None, that means that there has
				# been an error and we don't know what type the user meant it to
				# return. That error should've been logged, so there's no need
				# to log more errors. Stop checking and pass down the None.
				if left_type is None or right_type is None:
					return None
				return_type = types.get((left_type, right_type))
				if return_type is None:
					self.errors.append(TypeCheckError(expr, "I don't know how to use %s on a %s and %s." % (operation.type, display_type(left_type), display_type(right_type))))
					return None
				else:
					return return_type
			elif expr.data == "compare_expression":
				left, comparison, right = expr.children
				if left.data == "compare_expression":
					# We'll assume that any type errors will have been logged,
					# so this can only return 'bool' or None. We don't care
					# either way.
					self.type_check_expr(left)
					# We don't want to report errors twice, so we create a new
					# scope to store the errors, then discard the scope.
					scope = self.new_scope()
					scope.errors = []
					scope.warnings = []
					left_type = scope.type_check_expr(left.children[2])
				else:
					left_type = self.type_check_expr(left)
				right_type = self.type_check_expr(right)
				if left_type is not None:
					if right_type is not None and left_type != right_type:
						self.errors.append(TypeCheckError(comparison, "I can't compare %s and %s because they aren't the same type. You know they won't ever be equal." % (display_type(left_type), display_type(right_type))))
					if comparison.type != "EQUALS" and comparison.type != "NEQUALS" and comparison.type != "NEQUALS_QUIRKY":
						if left_type not in comparable_types:
							self.errors.append(TypeCheckError(comparison, "I don't know how to compare %s." % display_type(left_type)))
				# We don't return None even if there are errors because we know
				# for sure that comparison operators return a boolean.
				return 'bool'

		self.errors.append(TypeCheckError(expr, "Internal problem: I don't know the command/expression type %s." % expr.data))
		return None

	"""
	Type checks a command. Returns whether any code will run after the command
	to determine if any code is unreachable.
	"""
	def type_check_command(self, tree):
		if tree.data != "instruction":
			self.errors.append(TypeCheckError(tree, "Internal problem: I only deal with instructions, not %s." % tree.data))
			return False

		command = tree.children[0]

		if command.data == "imp":
			try:
				imp = importlib.import_module(command.children[0])
				self.imports.append(imp)
				try:
					getattr(imp, "_values")
				except:
					self.errors.append(TypeCheckError(command.children[0], "Library %s not compatable." % command.children[0]))
			except:
				self.errors.append(TypeCheckError(command.children[0], "Library %s not found to import." % command.children[0]))
		elif command.data == "for":
			var, iterable, code = command.children
			name, type = get_name_type(var)
			iterable_type = self.type_check_expr(iterable)
			iterated_type = iterable_types.get(iterable_type)
			if iterable_type is not None:
				if iterated_type is None:
					self.errors.append(TypeCheckError(iterable, "I can't loop over a %s." % display_type(iterable_type)))
				elif type == 'infer':
					type = iterated_type
				elif type != iterated_type:
					self.errors.append(TypeCheckError(type, "Looping over a %s produces %s values, not %s." % (display_type(iterable_type), display_type(iterated_type), display_type(type))))
			scope = self.new_scope()
			scope.variables[name] = Variable(type, "whatever")
			exit_point = False
			for child in code.children:
				exit = scope.type_check_command(child)
				if not exit_point:
					exit_point = exit
			if exit_point:
				return exit_point
		elif command.data == "print":
			# NOTE: In JS, `print` will be an indentity function, but since it's
			# a command in Python, it won't return anything.
			self.type_check_expr(command.children[0])
		elif command.data == "return":
			return_type = self.type_check_expr(command.children[0])
			parent_function = self.get_parent_function()
			if parent_function is None:
				self.errors.append(TypeCheckError(command, "You can't return outside a function."))
			elif return_type is not None and parent_function.returntype != return_type:
				self.errors.append(TypeCheckError(command.children[0], "You returned a %s, but the function is supposed to return a %s." % (display_type(return_type), display_type(parent_function.returntype))))
			return command
		elif command.data == "declare":
			name_type, value = command.children
			name, type = get_name_type(name_type)
			if name in self.variables:
				self.errors.append(TypeCheckError(name_type, "You've already defined `%s`." % name))
			value_type = self.type_check_expr(value)
			if value_type is not None and value_type != type:
				if type == 'infer':
					type = value_type
				else:
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(type), display_type(value_type))))
			self.variables[name] = Variable(type, "whatever")
		elif command.data == "if":
			condition, body = command.children
			cond_type = self.type_check_expr(condition)
			if cond_type is not None and cond_type != "bool":
				self.errors.append(TypeCheckError(condition, "The condition here should be a boolean, not a %s." % display_type(cond_type)))
			self.type_check_command(body)
		elif command.data == "ifelse":
			condition, if_true, if_false = command.children
			cond_type = self.type_check_expr(condition)
			if cond_type is not None and cond_type != "bool":
				self.errors.append(TypeCheckError(condition, "The condition here should be a boolean, not a %s." % display_type(cond_type)))
			exit_if_true = self.type_check_command(if_true)
			exit_if_false = self.type_check_command(if_true)
			if exit_if_true and exit_if_false:
				return command
		else:
			self.type_check_expr(command)

		# No return
		return False

	def add_native_function(self, name, argument_types, return_type, function):
		self.variables[name] = NativeFunction(self, argument_types, return_type, function)

with open("syntax.lark", "r") as f:
	parse = f.read()
n_parser = Lark(parse, start="start", propagate_positions=True)

parser = argparse.ArgumentParser(description='Allows to only show warnings and choose the file location')
parser.add_argument('--file', type=str, default="run.n", help="The file to read. (optional. if not included, it'll just run run.n)")
parser.add_argument('--check', action='store_true')

args = parser.parse_args()

filename = args.file

with open(filename, "r") as f:
	file = File(f)

# Define global functions/variables
global_scope = Scope()
global_scope.add_native_function(
	"intInBase10",
	[("number", "int")],
	"str",
	lambda number: str(number),
)

global_scope.add_native_function(
	"round",
	[("number", "float")],
	"int",
	lambda number: round(number),
)
global_scope.add_native_function(
	"floor",
	[("number", "float")],
	"int",
	lambda number: floor(number),
)
global_scope.add_native_function(
	"ceil",
	[("number", "float")],
	"int",
	lambda number: ceil(number),
)

def type_check(file, tree):
	scope = global_scope.new_scope()
	if tree.data == "start":
		for child in tree.children:
			scope.type_check_command(child)
	else:
		scope.errors.append(TypeCheckError(tree, "Internal issue: I cannot type check from a non-starting branch."))
	if len(scope.errors) > 0 or args.check:
		print('\n'.join(
			[warning.display('warning', file) for warning in scope.warnings] +
			[error.display('error', file) for error in scope.errors]
		))
	return (len(scope.errors), len(scope.warnings))

def parse_tree(tree):
	if tree.data == "start":
		scope = global_scope.new_scope()
		for child in tree.children:
			scope.eval_command(child)
	else:
		raise SyntaxError("Unable to run parse_tree on non-starting branch")


tree = file.parse(n_parser)
error_count, warning_count = type_check(file, tree)
if error_count > 0 or args.check:
	error_s = ""
	warning_s = ""
	if error_count != 1:
		error_s = "s"
	if warning_count != 1:
		warning_s = "s"
	print(f"{Fore.BLUE}Ran with {Fore.RED}{error_count} error{error_s}{Fore.BLUE} and {Fore.YELLOW}{warning_count} warning{warning_s}{Fore.BLUE}.{Style.RESET_ALL}")
	exit()
parse_tree(tree)
