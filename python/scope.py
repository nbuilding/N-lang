import importlib
import lark
from lark import Lark
from colorama import Fore, Style

from variable import Variable
from function import Function
from native_function import NativeFunction
from type import NType, NGenericType, NAliasType, NTypeVars, NListType, n_list_type, apply_generics, apply_generics_to
from enums import EnumType, EnumValue, EnumPattern
from native_function import NativeFunction
from type_check_error import TypeCheckError, display_type
from display import display_value
from operation_types import binary_operation_types, unary_operation_types, comparable_types, iterable_types
from file import File
from imported_error import ImportedError
import native_functions

def parse_file(file, check=False):
	import_scope = Scope()
	native_functions.add_funcs(import_scope)


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
		scope = type_check(file, tree, import_scope)
		import_scope.variables = {**import_scope.variables, **scope.variables}
		import_scope.errors += scope.errors
		import_scope.warnings += scope.warnings
	else:
		import_scope.variables = {**import_scope.variables, **parse_tree(tree, import_scope).variables}
	return import_scope, file

def type_check(file, tree, import_scope):
	scope = import_scope.new_scope(inherit_errors=False)
	if tree.data == "start":
		for child in tree.children:
			scope.type_check_command(child)
	else:
		scope.errors.append(TypeCheckError(tree, "Internal issue: I cannot type check from a non-starting branch."))
	return scope

def parse_tree(tree, import_scope):
	if tree.data == "start":
		scope = import_scope.new_scope(inherit_errors=False)
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
		elif tree.data == "enum_pattern":
			enum_name, *pattern_trees = tree.children
			patterns = []
			for pattern in pattern_trees:
				patterns.append(get_conditional_destructure_pattern(pattern))
			return (EnumPattern(enum_name, patterns), tree)
	return get_destructure_pattern(tree)

def pattern_to_name(pattern_and_src):
	pattern, _ = pattern_and_src
	if isinstance(pattern, str):
		return pattern
	else:
		return "<destructuring pattern>"

class Scope:
	def __init__(self, parent=None, parent_function=None, errors=[], warnings=[], imports=[]):
		self.parent = parent
		self.parent_function = parent_function
		self.imports = imports
		self.variables = {}
		self.types = {}
		self.errors = errors
		self.warnings = warnings

	def find_import(self, name):
		for imp in self.imports:
			if imp.__name__ == "libraries." + name:
				return imp

	def new_scope(self, parent_function=None, inherit_errors=True):
		return Scope(
			self,
			parent_function=parent_function or self.parent_function,
			errors=self.errors if inherit_errors else [],
			warnings=self.warnings if inherit_errors else [],
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

	def get_type(self, name, err=True):
		scope_type = self.types.get(name)
		if scope_type is None:
			if self.parent:
				return self.parent.get_type(name, err=err)
			elif err:
				raise NameError("You tried to get a type `%s`, but it isn't defined." % name)
		else:
			return scope_type

	def get_parent_function(self):
		if self.parent_function is None:
			if self.parent:
				return self.parent.get_parent_function()
			else:
				return None
		else:
			return self.parent_function

	def parse_type(self, tree_or_token, err=True):
		if type(tree_or_token) == lark.Tree:
			if tree_or_token.data == "with_typevar":
				name, *typevars = tree_or_token.children
				typevar_type = self.get_type(name.value, err=err)
				parsed_typevars = [self.parse_type(typevar, err=err) for typevar in typevars]
				if typevar_type is None:
					return None
				elif isinstance(typevar_type, NAliasType) or isinstance(typevar_type, NTypeVars):
					# Duck typing :sunglasses:
					if len(typevars) < len(typevar_type.typevars):
						self.errors.append(TypeCheckError(tree_or_token, "%s expects %d type variables." % (name.value, len(typevar_type.typevars))))
						return None
					elif len(typevars) > len(typevar_type.typevars):
						self.errors.append(TypeCheckError(tree_or_token, "%s only expects %d type variables." % (name.value, len(typevar_type.typevars))))
						return None
					return typevar_type.with_typevars(parsed_typevars)
				else:
					self.errors.append(TypeCheckError(tree_or_token, "%s doesn't take any type variables." % name.value))
					return None
			elif tree_or_token.data == "tupledef":
				return [self.parse_type(child, err=err) for child in tree_or_token.children]
			elif err:
				raise NameError("Type annotation of type %s; I am not ready for this." % tree_or_token.data)
			else:
				self.errors.append(TypeCheckError(tree_or_token, "Internal problem: encountered a type %s." % tree_or_token.data))
				return None
		else:
			n_type = self.get_type(tree_or_token.value, err=err)
			if n_type is None:
				self.errors.append(TypeCheckError(tree_or_token, "I don't know what type you're referring to by `%s`." % tree_or_token.value))
				return None
			elif n_type == "invalid":
				return None
			elif isinstance(n_type, NAliasType):
				if len(n_type.typevars) > 0:
					self.errors.append(TypeCheckError(tree_or_token, "%s expects %d type variables." % (tree_or_token.value, len(typevar_type.typevars))))
					return None
				return n_type.with_typevars()
			elif isinstance(n_type, NTypeVars) and len(n_type.typevars) > 0:
				self.errors.append(TypeCheckError(tree_or_token, "%s expects %d type variables." % (tree_or_token.value, len(typevar_type.typevars))))
				return None
			return n_type

	def get_name_type(self, name_type, err=True, get_type=True):
		pattern = get_destructure_pattern(name_type.children[0])
		if len(name_type.children) == 1:
			# No type annotation given, so it's implied
			return pattern, 'infer'
		else:
			return pattern, self.parse_type(name_type.children[1], err) if get_type else 'whatever'

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

	"""
	Sets variables from a pattern given a value or a type and returns whether
	the entire pattern matched.

	This is used by both type-checking (with warn=True) and interpreting
	(warn=False). During type-checking, `value_or_type` is the type (notably,
	tuples are lists), so it must determine whether it's even reasonable to
	destructure the type (for example, it doesn't make sense to destructure a
	record as a list), and error accordingly. During interpreting,
	`value_or_type` is the actual value, and thanks to the type-checker, the
	value should be guaranteed to fit the pattern.

	- warn=True - Is the pattern valid?
	- warn=False - Does the pattern match?

	Note that this sets variables while checking the pattern, so it's possible
	that variables are assigned even if the entire pattern doesn't match.
	Fortunately, this is only used in cases where the conditional let would
	create a new scope (such as in an if statement), so the extra variables can
	be discarded if the pattern ends up not matching.

	NOTE: This must return True if warn=True. (In other words, don't short
	circuit if a pattern fails to match.)
	"""
	def assign_to_cond_pattern(self, cond_pattern_and_src, value_or_type, warn=False, path=None):
		path_name = path or "the value"
		pattern, src = cond_pattern_and_src
		if isinstance(pattern, EnumPattern):
			if warn:
				if not isinstance(value_or_type, EnumType):
					self.errors.append(TypeCheckError(src, "I cannot destructure %s as an enum because it's a %s." % (path_name, display_type(value_or_type))))
					return True
				else:
					variant_types = value_or_type.get_types(pattern.variant)
					if variant_types is None:
						self.errors.append(TypeCheckError(src, "%s has no variant %s because it's a %s." % (path_name, pattern.variant, display_type(value_or_type))))
						return True
					elif len(pattern.patterns) < len(variant_types):
						self.errors.append(TypeCheckError(src, "Variant %s has %d fields, but you only destructure %d of them." % (pattern.variant, len(variant_types), len(pattern.patterns))))
						return True
					elif len(pattern.patterns) > len(variant_types):
						self.errors.append(TypeCheckError(pattern.patterns[len(variant_types)][1], "Variant %s only has %d fields." % (pattern.variant, len(variant_types))))
						return True
			else:
				if not isinstance(value_or_type, EnumValue):
					raise TypeError("Destructuring non-enum as enum.")
				elif pattern.variant != value_or_type.variant:
					return False
			for i, (sub_pattern, parse_src) in enumerate(pattern.patterns):
				if warn:
					value = variant_types[i]
				else:
					value = value_or_type.values[i]
				valid = self.assign_to_cond_pattern((sub_pattern, parse_src), value, warn, "%s.%s#%d" % (path or "<enum>", pattern.variant, i + 1))
				if not valid:
					return False
		if isinstance(pattern, list):
			if warn:
				if not isinstance(value_or_type, NListType):
					self.errors.append(TypeCheckError(src, "I cannot destructure %s as a list because it's a %s." % (path_name, display_type(value_or_type))))
					return True
				contained_type = value_or_type.typevars[0]
			else:
				if not isinstance(value_or_type, list):
					raise TypeError("Destructuring non-list as list.")
			if not warn and len(value_or_type) != len(pattern):
				return False
			for i, (sub_pattern, parse_src) in enumerate(pattern):
				valid = self.assign_to_cond_pattern((sub_pattern, parse_src), contained_type if warn else value_or_type[i], warn, "%s[%d]" % (path or "<enum variant>", i))
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
				codeblock = lark.tree.Tree("code_block", codeblock)
			if len(arguments.children) > 0 and arguments.children[0].data == "generic_declaration":
				_, *arguments = arguments.children
			else:
				arguments = arguments.children
			return Function(
				self,
				[self.get_name_type(arg, get_type=False) for arg in arguments],
				"return type",
				codeblock
			)
		elif expr.data == "function_callback" or expr.data == "function_callback_quirky" or expr.data == "function_callback_quirky_pipe":
			if expr.data == "function_callback":
				function, *arguments = expr.children[0].children
			elif expr.data == "function_callback_quirky":
				mainarg = expr.children[0]
				function, *arguments = expr.children[1].children
				arguments.insert(0, mainarg)
			else:
				mainarg = expr.children[0]
				function, *arguments = expr.children[1].children
				arguments.append(mainarg)
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
			val = parse_file(expr.children[0] + ".n")[0]
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
		if tree.data == "code_block":
			exit, value = (False, None)
			for instruction in tree.children:
				exit, value = self.eval_command(instruction)
				if exit:
					return exit, value
			return exit, value
		elif tree.data != "instruction":
			raise SyntaxError("Command %s not implemented" % (tree.data))

		command = tree.children[0]

		if command.data == "imp":
			self.imports.append(importlib.import_module("libraries." + command.children[0]))
		elif command.data == "for":
			var, iterable, code = command.children
			pattern, ty = self.get_name_type(var, get_type=False)
			for i in range(int(iterable)):
				scope = self.new_scope()

				scope.assign_to_pattern(pattern, i)
				exit, value = scope.eval_command(code)
				if exit:
					return True, value
		elif command.data == "print":
			val = self.eval_expr(command.children[0])
			if isinstance(val, str):
				print(val)
			else:
				print(display_value(val, indent="  "))
		elif command.data == "return":
			return (True, self.eval_expr(command.children[0]))
		elif command.data == "declare":
			modifier = ""
			rest = command.children
			if isinstance(command.children[0], lark.Token):
				modifier = command.children[0].value
				rest = rest[1:]
			name_type, value = rest
			pattern, ty = self.get_name_type(name_type, get_type=False)
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
		elif command.data == "enum_definition":
			type_def, constructors = command.children
			type_name, *type_typevars = type_def.children
			enum_type = NType(type_name.value)
			self.types[type_name.value] = enum_type
			for constructor in constructors.children:
				constructor_name, *types = constructor.children
				# types = [self.parse_type(type_token) for type_token in types]
				if len(types) >= 1:
					self.variables[constructor_name] = NativeFunction(self, [("idk", arg_type) for arg_type in types], enum_type, EnumValue.construct(constructor_name))
				else:
					self.variables[constructor_name] = Variable(enum_type, EnumValue(constructor_name))
		elif command.data == "alias_definition":
			# Type aliases are purely for type checking so they do nothing at runtime
			pass
		else:
			self.eval_expr(command)

		# No return
		return (False, None)

	"""
	A helper function to generalize getting a type name and its type variables,
	used by enum and type alias definitions. It also puts the type variables in
	a temporary scope so that the type definition can use them.
	"""
	def get_name_typevars(self, type_def):
		type_name, *type_typevars = type_def.children
		if type_name.value in self.types:
			self.errors.append(TypeCheckError(type_name, "You've already defined the type `%s`." % type_name.value))
		scope = self.new_scope()
		typevars = []
		for typevar_name in type_typevars:
			typevar = NGenericType(typevar_name.value)
			if typevar_name.value in scope.types:
				self.errors.append(TypeCheckError(typevar_name, "You've already used the generic type `%s`." % typevar_name.value))
			scope.types[typevar_name.value] = typevar
			typevars.append(typevar)
		return type_name, scope, typevars

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
				codeblock = lark.tree.Tree("code_block", cb)
			generic_types = []
			if len(arguments.children) > 0 and arguments.children[0].data == "generic_declaration":
				generics, *arguments = arguments.children
				wrap_scope = self.new_scope()
				for generic in generics.children:
					if generic.value in wrap_scope.types:
						self.errors.append(TypeCheckError(generic, "You already defined a generic type with this name."))
					generic_type = NGenericType(generic.value)
					wrap_scope.types[generic.value] = generic_type
					generic_types.append(generic_type)
			else:
				arguments = arguments.children
				wrap_scope = self
			arguments = [wrap_scope.get_name_type(arg, err=False) for arg in arguments]
			dummy_function = Function(self, arguments, wrap_scope.parse_type(returntype, err=False), codeblock, generic_types)
			scope = wrap_scope.new_scope(parent_function=dummy_function)
			for arg_pattern, arg_type in arguments:
				scope.assign_to_pattern(arg_pattern, arg_type, True)
			scope.type_check_command(codeblock)
			return dummy_function.type
		elif expr.data == "function_callback" or expr.data == "function_callback_quirky" or expr.data == "function_callback_quirky_pipe":
			if expr.data == "function_callback":
				function, *arguments = expr.children[0].children
			elif expr.data == "function_callback_quirky":
				mainarg = expr.children[0]
				function, *arguments = expr.children[1].children
				arguments.insert(0, mainarg)
			else:
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
			generics = {}
			for n, (argument, arg_type) in enumerate(zip(arguments, arg_types), start=1):
				check_type = self.type_check_expr(argument)
				resolved_arg_type = apply_generics(arg_type, check_type, generics)
				if check_type is not None and check_type != resolved_arg_type:
					self.errors.append(TypeCheckError(expr, "For a %s's argument #%d, you gave a %s, but you should've given a %s." % (display_type(func_type), n, display_type(check_type), display_type(arg_type))))
			if len(arguments) > len(arg_types):
				self.errors.append(TypeCheckError(expr, "A %s has %d argument(s), but you gave %d." % (display_type(func_type), len(arg_types), len(arguments))))
				return None
			elif len(arguments) < len(arg_types):
				return tuple(apply_generics_to(arg_type, generics) for arg_type in func_type[len(arguments):])
			else:
				return apply_generics_to(return_type, generics)
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
				self.errors.append(TypeCheckError(var, "Record %s does not exist" % var))
				return None

			if valu not in self.get_variable(var).value:
				self.errors.append(TypeCheckError(valu, "Value %s does not exist inside record %s" % (valu, var)))
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
				return n_list_type

			first, *rest = [self.type_check_expr(e) for e in expr.children]

			for i, e in enumerate(rest):
				if e != first:
					self.errors.append(TypeCheckError(expr.children[i+1], "The list item #%s's type is %s while the first item's type is %s" % (i + 2, e, first)))

			return n_list_type.with_typevars([self.type_check_expr(expr.children[0])]) # TODO
		elif expr.data == "impn":
			impn, f = parse_file(expr.children[0] + ".n", True)
			if len(impn.errors) != 0:
				self.errors.append(ImportedError(impn.errors[:], f))
			if len(impn.warnings) != 0:
				self.warnings.append(ImportedError(impn.warnings[:], f))
			holder = {}
			for key in impn.variables.keys():
				if impn.variables[key].public:
					holder[key] = impn.variables[key].value
			if holder == {}:
				self.warnings.append(TypeCheckError(expr.children[0], "There was nothing to import from %s" % expr.children[0]))
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
		if tree.data == "code_block":
			exit_point = None
			warned = False
			for instruction in tree.children:
			    exit = self.type_check_command(instruction)
			    if exit and exit_point is None:
			        exit_point = exit
			    elif exit_point and not warned:
			        warned = True
			        self.warnings.append(TypeCheckError(exit_point, "There are commands after this return statement, but I will never run them."))
			return exit_point
		elif tree.data != "instruction":
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
			pattern, ty = self.get_name_type(var, err=False)
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
			return scope.type_check_command(code)
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
			pattern, ty = self.get_name_type(name_type, err=False)
			name = pattern_to_name(pattern)

			value_type = self.type_check_expr(value)
			resolved_value_type = apply_generics(value_type, ty)
			if ty is not None and resolved_value_type is not None and ty != resolved_value_type:
				if ty == 'infer':
					# If there is an unresolved generic (like list[t] from an
					# empty list), this might cause problems. Should there be an
					# error about "Type annotations needed"?
					ty = resolved_value_type
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
				if isinstance(value_type, NListType) and value_type.is_inferred():
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
		elif command.data == "enum_definition":
			type_def, constructors = command.children
			type_name, scope, typevars = self.get_name_typevars(type_def)
			variants = []
			enum_type = EnumType(type_name, variants, typevars)
			self.types[type_name] = enum_type
			for constructor in constructors.children:
				constructor_name, *types = constructor.children
				types = [scope.parse_type(type_token, err=False) for type_token in types]
				variants.append((constructor_name.value, types))
				if constructor_name.value in self.variables:
					self.errors.append(TypeCheckError(constructor_name, "You've already defined `%s` in this scope." % constructor_name.value))
				if len(types) >= 1:
					self.variables[constructor_name.value] = NativeFunction(self, [("idk", arg_type) for arg_type in types], enum_type, id)
				else:
					self.variables[constructor_name.value] = Variable(enum_type, "I don't think this is used")
		elif command.data == "alias_definition":
			alias_def, alias_type = command.children
			alias_name, scope, typevars = self.get_name_typevars(alias_def)
			alias_type = scope.parse_type(alias_type, err=False)
			if alias_type is None:
				self.types[alias_name] = "invalid"
			else:
				self.types[alias_name] = NAliasType(alias_name.value, alias_type, typevars)
		else:
			self.type_check_expr(command)

		# No return
		return False

	def add_native_function(self, name, argument_types, return_type, function):
		self.variables[name] = NativeFunction(self, argument_types, return_type, function)
