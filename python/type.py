import lark

class NType:
	def __init__(self, name):
		self.name = name

	def __hash__(self):
		return hash(id(self))

	def __eq__(self, other):
		return self is other

class NGenericType(NType):
	def __init__(self, name):
		super(NGenericType, self).__init__(name)

	def __repr__(self):
		return 'NGenericType(%s)' % repr(self.name)

class NAliasType(NType):
	def __init__(self, name, alias_type, typevars=[]):
		super(NAliasType, self).__init__(name)
		self.typevars = typevars
		self.type = alias_type

	def with_typevars(self, typevar_defs=[]):
		if len(self.typevars) != len(typevar_defs):
			raise TypeError("Expected %d typevars, not %d." % (len(self.typevars), len(typevar_defs)))
		return apply_generics_to(self.type, {typevar: typevar_def for typevar, typevar_def in zip(self.typevars, typevar_defs)})

class NTypeVars(NType):
	def __init__(self, name, typevars=[], original=None):
		super(NTypeVars, self).__init__(name)
		self.typevars = typevars
		# Keep a reference to the original NTypeVars so that types can be
		# compared by reference
		self.base_type = original or self

	def with_typevars(self, typevars):
		if len(self.typevars) != len(typevars):
			raise TypeError("Expected %d typevars, not %d." % (len(self.typevars), len(typevars)))
		return self.new_child(typevars)

	def new_child(self, typevars):
		return type(self)(self.name, typevars, original=self.base_type)

	def __hash__(self):
		if self.base_type is self:
			return hash(id(self))
		else:
			return hash(self.base_type)

	def __eq__(self, other):
		return isinstance(other, NTypeVars) and self.base_type is other.base_type and self.typevars == other.typevars

	def __repr__(self):
		return 'NTypeVars(%s, %s)' % (repr(self.name), repr(self.typevars))

class NListType(NTypeVars):
	generic = NGenericType("t")

	def __init__(self, name, typevars, original=None):
		super(NListType, self).__init__(name, typevars, original=original)

	def is_inferred(self):
		return self.typevars[0] == NListType.generic

n_list_type = NListType("list", [NListType.generic])


"""
`expected` is the type of the function's argument, the type with the
generics/type variables.
`actual` is the type of the expression being passed in, the type with the
generics known.
Pass in `generics` to keep track of the generics across different matches.

Returns a type with the generics swapped out to best fit the actual type. For
example, `apply_generics(list[t], list[str])` (psuedocode) will return
`list[str]`. This can then be compared with actual separately.
"""
def apply_generics(expected, actual, generics={}):
	if isinstance(expected, NGenericType):
		generic = generics.get(expected)
		if generic is None:
			generics[expected] = actual
			return actual
		else:
			return generic
	elif isinstance(expected, NTypeVars) and isinstance(actual, NTypeVars):
		if expected.base_type is actual.base_type:
			return expected.with_typevars([apply_generics(expected_type, actual_type, generics) for expected_type, actual_type in zip(expected.typevars, actual.typevars)])
	elif isinstance(expected, tuple) and isinstance(actual, tuple):
		return tuple(apply_generics(expected_arg, actual_arg, generics) for expected_arg, actual_arg in zip(expected, actual))
	elif isinstance(expected, list) and isinstance(actual, list):
		return [apply_generics(expected_item, actual_item, generics) for expected_item, actual_item in zip(expected, actual)]
	elif isinstance(expected, dict):
		return {key: apply_generics(expected_type, actual[key], generics) if key in actual else expected_type for key, expected_type in expected.items()}
	return expected

"""
Given generic mappings (eg `t` -> `str`) from `apply_generics`, it'll transform
the given type by replacing the generic types according to the mapping. For
example, `apply_generics_to(list[t], { t: str })` (psuedocode) will return
`list[str]`.

Note that this currently probably should fail for functions that only use a
generic in its return type, but I'm not sure how that would work.
"""
def apply_generics_to(return_type, generics):
	if isinstance(return_type, NGenericType):
		generic = generics.get(return_type)
		if generic is None:
			return return_type
		else:
			return generic
	if isinstance(return_type, NTypeVars):
		return return_type.with_typevars([apply_generics_to(typevar, generics) for typevar in return_type.typevars])
	elif isinstance(return_type, tuple):
		return tuple(apply_generics_to(arg_type, generics) for arg_type in return_type)
	elif isinstance(return_type, list):
		return [apply_generics_to(item_type, generics) for item_type in return_type]
	elif isinstance(return_type, dict):
		return {key: apply_generics_to(field_type, generics) for key, field_type in return_type.items()}
	else:
		return return_type

"""
Given two types that should be equal, this function will try to match them and
resolve generics, then return a pair containing the resolved type and whether
there is a problem.

Examples:
- resolve_equal_types((str, int, bool), (str, int, bool)) -> (str, int, bool), False
- resolve_equal_types(list[t], list[str]) -> list[str], False
- resolve_equal_types(list[t], str) -> None, True
- resolve_equal_types(list[t], list[b]) -> list[b], False if t is from the base type
- resolve_equal_types(list[t], list[t]) -> list[t], False
- resolve_equal_types(list[a], list[b]) -> None, True if neither a nor b are from the base type
If a type is None (error), the function will return None, False to avoid
compounding errors.
- resolve_equal_types(None, int) -> None, False
"""
def resolve_equal_types(type_a, type_b):
	if type_a is None or type_b is None:
		return None, False
	elif isinstance(type_a, NTypeVars):
		if not isinstance(type_b, NTypeVars) or type_a.base_type is not type_b.base_type:
			return None, True
		resolved_typevars = []
		for typevar_a, typevar_b in zip(type_a.typevars, type_b.typevars):
			if isinstance(typevar_a, NGenericType) and typevar_a in type_a.base_type.typevars:
				resolved_typevars.append(typevar_b)
			elif isinstance(typevar_b, NGenericType) and typevar_b in type_a.base_type.typevars:
				resolved_typevars.append(typevar_a)
			else:
				resolved, problem = resolve_equal_types(typevar_a, typevar_b)
				if problem:
					return None, True
				resolved_typevars.append(resolved)
		return type_a.with_typevars(resolved_typevars), False
	elif isinstance(type_a, list):
		if not isinstance(type_b, list) or len(type_a) != len(type_b):
			return None, True
		resolved_types = []
		for item_a, item_b in zip(type_a, type_b):
			resolved, problem = resolve_equal_types(item_a, item_b)
			if problem:
				return None, True
			resolved_types.append(resolved)
		return resolved_types, False
	elif isinstance(type_a, dict):
		if not isinstance(type_b, dict) or type_a.keys() != type_b.keys():
			return None, True
		resolved_types = {}
		for key in type_a.keys():
			resolved, problem = resolve_equal_types(type_a[key], type_b[key])
			if problem:
				return None, True
			resolved_types[key] = resolved
		return resolved_types, False
	elif type_a == type_b:
		return type_a, False
	else:
		return None, True
