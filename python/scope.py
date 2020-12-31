import importlib
import lark

from variable import Variable
from function import Function
from native_function import NativeFunction
from type_check_error import TypeCheckError, display_type
from operation_types import binary_operation_types, unary_operation_types, comparable_types, iterable_types

def get_name_type(name_type):
	if len(name_type.children) == 1:
		return name_type.children[0].value, 'infer'
	else:
		name, ty = name_type.children
		if type(ty) == lark.Tree:
			return name.value, ty.children
		return name.value, ty.value

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
			if imp.__name__ == "libraries." + name:
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
		elif expr.data == "anonymous_func":
			arguments, returntype, *codeblock = expr.children
			return Function(
				self,
				[(arg.children[0].value, arg.children[1].value) for arg in arguments.children],
				returntype.value,
				lark.tree.Tree("codeblock", codeblock)
			)
		elif expr.data == "function_callback":
			function, *arguments = expr.children[0].children
			return self.eval_expr(function).run([self.eval_expr(arg) for arg in arguments])
		elif expr.data == "function_callback_quirky":
			mainarg = expr.children[0]
			function, *arguments = expr.children[1].children
			arguments.insert(0, mainarg)
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
		elif expr.data == "char":
			val = expr.children[0]
			if type(val) == lark.Tree:
				code = val.children[0].value
				if code == "n":
					return "\n"
				elif code == "t":
					return "\t"
				elif code == "r":
					return "\r"
				else:
					raise SyntaxError("Unexpected escape code: %s" % code)
			else:
				return val.value
		elif expr.data == "value":
			token_or_tree = expr.children[0]
			if type(token_or_tree) is lark.Tree:
				return self.eval_expr(token_or_tree)
			else:
				return self.eval_value(token_or_tree)
		elif expr.data == "tupleval":
			return tuple([self.eval_expr(e) for e in expr.children])
		else:
			print('(parse tree):', expr)
			raise SyntaxError("Unexpected command/expression type %s" % expr.data)

	"""
	Evaluates a command given parsed Trees and Tokens from Lark.
	"""
	def eval_command(self, tree):
		if tree.data != "instruction":
			raise SyntaxError("Command %s not implemented" % (tree.data))

		command = tree.children[0]

		if command.data == "imp":
			self.imports.append(importlib.import_module("libraries." + command.children[0]))
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
		elif command.data == "vary":
			name, value = command.children
			self.variables[name].value = self.eval_expr(value)
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
		if type(value) == lark.Tree:
			if value.data == "char":
				if type(value.children[0]) == lark.Tree:
					if value.children[0].children[0].value not in ["n", "r", "t"]:
						self.errors.append(TypeCheckError(value, "Escape code \\%s not allowed." % value.children[0].value))
				return "char"
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
		elif expr.data == "anonymous_func":
			arguments, returntype, *cb = expr.children
			codeblock = lark.tree.Tree("codeblock", cb)
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
				if check_type is not None and check_type != arg_type and arg_type != "any":
					self.errors.append(TypeCheckError(expr, "For a %s's argument #%d, you gave a %s, but you should've given a %s." % (display_type(func_type), n, display_type(check_type), display_type(arg_type))))
			if len(arguments) > len(arg_types):
				self.errors.append(TypeCheckError(expr, "A %s has %d argument(s), but you gave %d." % (display_type(func_type), len(arg_types), len(arguments))))
				return None
			elif len(arguments) < len(arg_types):
				return func_type[len(arguments):]
			else:
				return return_type
		elif expr.data == "function_callback_quirky":
			mainarg = expr.children[0]
			function, *arguments = expr.children[1].children
			arguments.insert(0, mainarg)
			func_type = self.type_check_expr(function)
			if func_type is None:
				return None
			if not isinstance(func_type, tuple):
				self.errors.append(TypeCheckError(expr, "You tried to call a %s, which isn't a function." % display_type(func_type)))
				return None
			*arg_types, return_type = func_type
			for n, (argument, arg_type) in enumerate(zip(arguments, arg_types), start=1):
				check_type = self.type_check_expr(argument)
				if check_type is not None and check_type != arg_type and arg_type != "any":
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
						self.errors.append(TypeCheckError(c, "Command %s in %s not found." % (c, l)))
					else:
						return library._values[c]
				except:
					pass
			return None
		elif expr.data == "value":
			token_or_tree = expr.children[0]
			if type(token_or_tree) is lark.Tree:
				if token_or_tree.data != "char":
					return self.type_check_expr(token_or_tree)
				else:
					return self.get_value_type(token_or_tree)
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

		elif expr.data == "tupleval":
			return [self.type_check_expr(e) for e in expr.children]
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
				imp = importlib.import_module("libraries." + command.children[0])
				self.imports.append(imp)
				try:
					getattr(imp, "_values")
				except:
					self.errors.append(TypeCheckError(command.children[0], "Library %s not compatable." % command.children[0]))
			except:
				self.errors.append(TypeCheckError(command.children[0], "Library %s not found to import." % command.children[0]))
		elif command.data == "for":
			var, iterable, code = command.children
			name, ty = get_name_type(var)
			iterable_type = self.type_check_expr(iterable)
			iterated_type = iterable_types.get(iterable_type)
			if iterable_type is not None:
				if iterated_type is None:
					self.errors.append(TypeCheckError(iterable, "I can't loop over a %s." % display_type(iterable_type)))
				elif ty == 'infer':
					ty = iterated_type
				elif ty != iterated_type:
					self.errors.append(TypeCheckError(ty, "Looping over a %s produces %s values, not %s." % (display_type(iterable_type), display_type(iterated_type), display_type(ty))))
			scope = self.new_scope()
			scope.variables[name] = Variable(ty, "whatever")
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
			name, ty = get_name_type(name_type)
			if name in self.variables:
				self.errors.append(TypeCheckError(name_type, "You've already defined `%s`." % name))
			value_type = self.type_check_expr(value)
			if value_type is not None and value_type != ty:
				if ty == 'infer':
					ty = value_type
				else:
					typ = ty
					if type(typ) == list:
						typ = []
						for t in ty:
							if type(t) is lark.Token:
								typ.append(t.value)
							else:
								typ.append(t)
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(typ), display_type(value_type))))
			self.variables[name] = Variable(ty, "whatever")
		elif command.data == "vary":
			name, value = command.children
			if name not in self.variables:
				self.errors.append(TypeCheckError(value, "The variable %s does not exist." % (name)))
			else:
				ty = self.variables[name].type
				value_type = self.type_check_expr(value)
				if value_type != ty:
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(ty), display_type(value_type))))
		elif command.data == "if":
			condition, body = command.children
			cond_type = self.type_check_expr(condition)
			if type(condition.children[0]) is lark.Token:
				if condition.children[0].value == "true":
					self.warnings.append(TypeCheckError(condition, "This will always run."))
				if condition.children[0].value == "false":
					self.warnings.append(TypeCheckError(condition, "This will never run."))
			if cond_type is not None and cond_type != "bool":
				self.errors.append(TypeCheckError(condition, "The condition here should be a boolean, not a %s." % display_type(cond_type)))
			self.type_check_command(body)
		elif command.data == "ifelse":
			condition, if_true, if_false = command.children
			cond_type = self.type_check_expr(condition)
			if type(condition.children[0]) is lark.Token:
				if condition.children[0].value == "true":
					self.warnings.append(TypeCheckError(condition, "The else statement of the expression will never run."))
				if condition.children[0].value == "false":
					self.warnings.append(TypeCheckError(condition, "The if statement of the expression will never run."))
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
