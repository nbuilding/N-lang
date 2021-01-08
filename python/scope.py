import importlib
import lark
from lark import Lark
from colorama import Fore, Style

from variable import Variable
from function import Function
from native_function import NativeFunction
from type_check_error import TypeCheckError, display_type
from operation_types import binary_operation_types, unary_operation_types, comparable_types, iterable_types
from file import File
import native_functions

def parse_file(file, check=False):
	global_scope = Scope()
	native_functions.add_funcs(global_scope)

	with open("syntax.lark", "r") as f:
		parse = f.read()
	n_parser = Lark(parse, start="start", propagate_positions=True)

	filename = file

	with open(filename, "r") as f:
		file = File(f)


	try:
		tree = file.parse(n_parser)
	except lark.exceptions.UnexpectedCharacters as e:

		for i,line in enumerate(file.lines):
			if e.get_context(file.get_text(), 99999999999999)[0:-2].strip() == line.strip():
				break

		
		spaces = " "*(len(str(i+1) + " |") +  1)
		spaces_arrow = " "*(len(str(i+1) + " |") - 3)
		print(f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}: Invalid syntax")
		print(f"{Fore.CYAN}{spaces_arrow}--> {Fore.BLUE}{file.name}:{i+1}")
		print(f"{Fore.CYAN}{i + 1} |{Style.RESET_ALL} {e.get_context(file.get_text(), 99999999999999)[0:-2].strip()}")
		print(f"{spaces}{Fore.RED}{Style.BRIGHT}^{Style.RESET_ALL}")
		exit()

	if check:
		global_scope.variables = {**global_scope.variables, **type_check(file, tree, global_scope).variables}
	else:
		global_scope.variables = {**global_scope.variables, **parse_tree(tree, global_scope).variables}

	return global_scope 

def type_check(file, tree, global_scope):
	scope = global_scope.new_scope()
	if tree.data == "start":
		for child in tree.children:
			scope.type_check_command(child)
	else:
		scope.errors.append(TypeCheckError(tree, "Internal issue: I cannot type check from a non-starting branch."))
	return scope

def parse_tree(tree, global_scope):
	if tree.data == "start":
		scope = global_scope.new_scope()
		for child in tree.children:
			scope.eval_command(child)
		return scope
	else:
		raise SyntaxError("Unable to run parse_tree on non-starting branch")


def get_destructure_pattern(name):
	if type(name) == lark.Tree:
		if name.data == "record_pattern":
			names = []
			for pattern in name.children:
				if type(pattern) == lark.Token:
					names.append((pattern.value, (pattern.value, pattern)))
				else:
					key, value = pattern.children
					names.append((key.value, get_destructure_pattern(value)))
			return (dict(names), name)
		elif name.data == "tuple_pattern":
			return (tuple(get_destructure_pattern(pattern) for pattern in name.children), name)
	return (None if name.value == "_" else name.value, name)

def get_conditional_destructure_pattern(tree):
	if type(tree) == lark.Tree:
		if tree.data == "list_pattern":
			patterns = []
			for pattern in tree.children:
				patterns.append(get_conditional_destructure_pattern(pattern))
			return (patterns, tree)
	return get_destructure_pattern(tree)

def get_name_type(name_type):
	pattern = get_destructure_pattern(name_type.children[0])
	if len(name_type.children) == 1:
		# No type annotation given, so it's implied
		return pattern, 'infer'
	else:
		ty = name_type.children[1]
		var_type = ty.children if type(ty) == lark.Tree else ty.value
		return pattern, var_type

def type_is_list(maybe_list_type):
	if isinstance(maybe_list_type, list) and len(maybe_list_type) > 0 and type(maybe_list_type[0]) == lark.Token and maybe_list_type[0].type == "LIST":
		if len(maybe_list_type) > 1:
			return maybe_list_type[1]
		else:
			return "infer"
	return False

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

	"""
	This method is meant to be usable for both evaluation and type checking.
	"""
	def assign_to_pattern(self, pattern_and_src, value_or_type, warn=False, path=None, public=False):
		path_name = path or "the value"
		pattern, src = pattern_and_src
		if isinstance(pattern, dict):
			is_dict = isinstance(value_or_type, dict)
			if is_dict:
				# Should this be an error? Warning?
				unused_keys = [key for key in value_or_type.keys() if key not in pattern]
				if len(unused_keys) > 0:
					self.errors.append(TypeCheckError(src, "%s (%s) has field(s) %s, but you haven't destructured them. (Hint: use `_` to denote unused fields.)" % (display_type(value_or_type), path_name, ", ".join(unused_keys))))
			else:
				if warn:
					self.errors.append(TypeCheckError(src, "I can't destructure %s as a record because %s is not a record." % (path_name, display_type(value_or_type))))
				else:
					raise TypeError("Destructuring non-record as record.")
			for key, (sub_pattern, parse_src) in pattern.items():
				value = value_or_type.get(key) if is_dict else None
				if is_dict and value is None:
					if warn:
						self.errors.append(TypeCheckError(parse_src, "I can't get the field %s from %s because %s doesn't have that field." % (key, path_name, display_type(value_or_type))))
					else:
						raise TypeError("Given record doesn't have a key %s." % key)
				self.assign_to_pattern((sub_pattern, parse_src), value, warn, "%s.%s" % (path or "<record>", key), public)
		elif isinstance(pattern, tuple):
			# I believe the interpreter uses actual Python tuples, while the
			# type checker uses lists for tuple types. We should fix that for
			# the type checker.
			is_tuple = isinstance(value_or_type, list) if warn else isinstance(value_or_type, tuple)
			if not is_tuple:
				if warn:
					self.errors.append(TypeCheckError(src, "I can't destructure %s as a tuple because %s is not a tuple." % (path_name, display_type(value_or_type))))
				else:
					raise TypeError("Destructuring non-record as record.")
			if is_tuple and len(pattern) != len(value_or_type):
				if warn:
					if len(pattern) > len(value_or_type):
						_, parse_src = pattern[len(value_or_type)]
						self.errors.append(TypeCheckError(parse_src, "I can't destructure %d items from a %s." % (len(pattern), display_type(value_or_type))))
					else:
						self.errors.append(TypeCheckError(src, "I can't destructure only %d items from a %s. (Hint: use `_` to denote unused members of a destructured tuple.)" % (len(pattern), display_type(value_or_type))))
				else:
					raise TypeError("Number of destructured values from tuple doesn't match tuple length.")
			for i, (sub_pattern, parse_src) in enumerate(pattern):
				value = value_or_type[i] if is_tuple and i < len(value_or_type) else None
				self.assign_to_pattern((sub_pattern, parse_src), value, warn, "%s.%d" % (path or "<tuple>", i), public)
		elif pattern is not None:
			name = pattern
			if warn and name in self.variables:
				self.errors.append(TypeCheckError(src, "You've already defined `%s`." % name))
			self.variables[name] = Variable(value_or_type, value_or_type, public)

	def assign_to_cond_pattern(self, cond_pattern_and_src, value_or_type, warn=False, path=None):
		path_name = path or "the value"
		pattern, src = cond_pattern_and_src
		if isinstance(pattern, list):
			if warn:
				contained_type = type_is_list(value_or_type)
				if contained_type is None:
					self.errors.append(TypeCheckError(src, "I cannot destructure a %s as a list." % display_type(value_or_type)))
			else:
				if not isinstance(value_or_type, list):
					raise TypeError("Destructuring non-list as list.")
			if not warn and len(value_or_type) != len(pattern):
				return False
			for i, (sub_pattern, parse_src) in enumerate(pattern):
				valid = self.assign_to_cond_pattern((sub_pattern, parse_src), contained_type if warn else value_or_type[i], warn, "%s[%d]" % (path or "<list>", i))
				if not valid:
					return False
		else:
			self.assign_to_pattern(cond_pattern_and_src, value_or_type, warn, path)
		return True

	def eval_record_entry(self, entry):
		if type(entry) is lark.Tree:
			return entry.children[0].value, self.eval_expr(entry.children[1].children[0])
		else:
			return entry.value, self.eval_value(entry)

	def eval_value(self, value):
		if value.type == "NUMBER":
			if "." in str(value.value):
				return float(value)
			return int(value)
		elif value.type == "STRING":
			return bytes(value[1:-1], 'utf-8').decode('unicode_escape')
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
		elif expr.data == "function_def" or expr.data == "anonymous_func":
			if expr.data == "function_def":
				arguments, returntype, codeblock = expr.children
			else:
				arguments, returntype, *codeblock = expr.children
				codeblock = lark.tree.Tree("codeblock", codeblock)
			return Function(
				self,
				[get_name_type(arg) for arg in arguments.children],
				returntype.value,
				codeblock
			)
		elif expr.data == "function_callback":
			function, *arguments = expr.children[0].children
			return self.eval_expr(function).run([self.eval_expr(arg) for arg in arguments])
		elif expr.data == "function_callback_quirky":
			mainarg = expr.children[0]
			function, *arguments = expr.children[1].children
			arguments.insert(0, mainarg)
			return self.eval_expr(function).run([self.eval_expr(arg) for arg in arguments])
		elif expr.data == "function_callback_quirky_pipe":
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
		elif expr.data == "impn":
			val = parse_file(expr.children[0] + ".n")
			holder = {}
			for key in val.variables.keys():
				if val.variables[key].public:
					holder[key] = val.variables[key].value
			return holder
		elif expr.data == "record_access":
			return self.variables[expr.children[0]].value[expr.children[1]]
		elif expr.data == "tupleval":
			return tuple([self.eval_expr(e) for e in expr.children])
		elif expr.data == "listval":
			return [self.eval_expr(e) for e in expr.children]
		elif expr.data == "recordval":
			return dict(self.eval_record_entry(entry) for entry in expr.children)
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
			pattern, ty = get_name_type(var)
			for i in range(int(iterable)):
				scope = self.new_scope()

				scope.assign_to_pattern(pattern, i)
				for child in code.children:
					exit, value = scope.eval_command(child)
					if exit:
						return (True, value)
		elif command.data == "print":
			val = self.eval_expr(command.children[0])

			if type(val) == dict:
				print("{", end="")
				for key in list(val.keys())[0:-1]:
					print(key + ": ", end="")

					if type(val[key]) == str:
						print("\"" + str(val[key].encode('unicode_escape'))[2:-1].replace("\\\\", "\\") + "\", ", end="")
					else:
						print(str(val[key]) + ", ", end="")

				key = list(val.keys())[-1]

				print(key + ": ", end="")
				if type(val[key]) == str:
					print("\"" + str(val[key].encode('unicode_escape'))[2:-1].replace("\\\\", "\\") + "\"", end="")
				else:
					print(str(val[key]), end="")

				print("}")
			else:
				print(val)
		elif command.data == "return":
			return (True, self.eval_expr(command.children[0]))
		elif command.data == "declare":
			modifier = ""
			rest = command.children
			if isinstance(command.children[0], lark.Token):
				modifier = command.children[0].value
				rest = rest[1:]
			name_type, value = rest
			pattern, ty = get_name_type(name_type)
			self.assign_to_pattern(pattern, self.eval_expr(value), False, None, modifier)
		elif command.data == "vary":
			name, value = command.children
			self.variables[name].value = self.eval_expr(value)
		elif command.data == "if":
			condition, body = command.children
			scope = self.new_scope()
			if condition.data == "conditional_let":
				pattern, value = condition.children
				yes = scope.assign_to_cond_pattern(get_conditional_destructure_pattern(pattern), self.eval_expr(value))
			else:
				yes = self.eval_expr(condition)
			if yes:
				exit, value = scope.eval_command(body)
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

	def get_record_entry_type(self, entry):
		if type(entry) is lark.Tree:
			return entry.children[0].value, self.type_check_expr(entry.children[1].children[0])
		else:
			return entry.value, self.get_value_type(entry)

	def get_value_type(self, value):
		if type(value) == lark.Tree:
			if value.data == "char":
				return "char"
		if value.type == "NUMBER":
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
		elif expr.data == "function_def" or expr.data == "anonymous_func":
			if expr.data == "function_def":
				arguments, returntype, codeblock = expr.children
			else:
				arguments, returntype, *cb = expr.children
				codeblock = lark.tree.Tree("codeblock", cb)
			arguments = [get_name_type(arg) for arg in arguments.children]
			dummy_function = Function(self, arguments, returntype.value, codeblock)
			scope = self.new_scope(parent_function=dummy_function)
			for arg_pattern, arg_type in arguments:
				scope.assign_to_pattern(arg_pattern, arg_type, True)
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
		elif expr.data == "function_callback_quirky_pipe":
			mainarg = expr.children[0]
			function, *arguments = expr.children[1].children
			arguments.append(mainarg)
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
		elif expr.data == "record_access":
			var, valu = expr.children
			if var not in self.variables:
				self.errors.append(var, "Record %s does not exist" % var)
				return None

			if valu not in self.get_variable(var).value:
				self.errors.append(value, "Value %s does not exist inside record %s" % (valu, var))
				return None

			return self.get_variable(var).value[valu]

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
				if isinstance(left_type, dict) or isinstance(right_type, dict):
					return_type = None
				else:
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
		elif expr.data == "listval":
			if (len(expr.children) == 0):
				return [lark.Token("LIST", "list")]

			first, *rest = [self.type_check_expr(e) for e in expr.children]

			for i, e in enumerate(rest):
				if e != first:
					self.errors.append(TypeCheckError(expr.children[i+1], "The list item #%s's type is %s while the first item's type is %s" % (i + 2, e, first)))

			return [lark.Token("LIST", "list"), self.type_check_expr(expr.children[0])]
		elif expr.data == "impn":
			val = parse_file(expr.children[0] + ".n", True)
			self.errors += val.errors
			self.warnings += val.warnings
			holder = {}
			for key in val.variables.keys():
				if val.variables[key].public:
					holder[key] = val.variables[key].value
			if holder == {}:
				self.warnings.append(expr.children[0], "There was nothing to import from %s" % expr.children[0])
			return holder
		elif expr.data == "recordval":
			return dict(self.get_record_entry_type(entry) for entry in expr.children)
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
			pattern, ty = get_name_type(var)
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
			scope.assign_to_pattern(pattern, ty, True)
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
			modifier = ""
			maybe_name_type = command.children[0]
			rest = command.children
			if isinstance(maybe_name_type, lark.Token):
				modifier = maybe_name_type.value
				rest = rest[1:]
			name_type, value = rest
			pattern, ty = get_name_type(name_type)
			value_type = self.type_check_expr(value)

			# Check for empty lists
			maybe_list_type = type_is_list(value_type)
			if maybe_list_type == "infer":
				if ty == "infer":
					self.errors.append(TypeCheckError(name_type, "Unable to infer type of empty list"))
				value_type = ty
			if value_type is not None and value_type != ty:
				if ty == 'infer':
					ty = value_type
				elif type_is_list(ty):
					typ = []
					for t in ty:
						if type(t) is lark.Token:
							typ.append(t.value)
						else:
							typ.append(t)
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(typ), display_type(value_type))))
				else:
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(ty), display_type(value_type))))

			self.assign_to_pattern(pattern, ty, True, None, modifier == "pub")
		elif command.data == "vary":
			name, value = command.children
			if name not in self.variables:
				self.errors.append(TypeCheckError(value, "The variable %s does not exist." % (name)))
			else:
				ty = self.variables[name].type
				value_type = self.type_check_expr(value)


				#Check for empty lists
				if type(value_type) == list and len(value_type) == 1:
					if type(value_type[0]) == lark.Token:
						if value_type[0].type == "LIST":
							if ty == "infer":
								self.errors.append(TypeCheckError(name_type, "Unable to infer type of empty list"))
							value_type = ty

				if value_type != ty:
					self.errors.append(TypeCheckError(value, "You set %s, which is defined to be a %s, to what evaluates to a %s." % (name, display_type(ty), display_type(value_type))))
		elif command.data == "if":
			condition, body = command.children
			scope = self.new_scope()
			if condition.data == "conditional_let":
				pattern, value = condition.children
				eval_type = self.type_check_expr(value)
				scope.assign_to_cond_pattern(get_conditional_destructure_pattern(pattern), eval_type, True)
			else:
				cond_type = self.type_check_expr(condition)
				if type(condition.children[0]) is lark.Token:
					if condition.children[0].value == "true":
						self.warnings.append(TypeCheckError(condition, "This will always run."))
					if condition.children[0].value == "false":
						self.warnings.append(TypeCheckError(condition, "This will never run."))
				if cond_type is not None and cond_type != "bool":
					self.errors.append(TypeCheckError(condition, "The condition here should be a boolean, not a %s." % display_type(cond_type)))
			scope.type_check_command(body)
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
