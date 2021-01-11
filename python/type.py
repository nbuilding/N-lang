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
`expected` is the type of the function's argument.
`actual` is the type of the expression being passed in.
"""
def apply_generics(expected, actual, generics):
	if isinstance(expected, NGenericType):
		generic = generics.get(expected)
		if generic is None:
			generics[expected] = actual
			return actual
		else:
			return generic
	elif isinstance(expected, NTypeVars) and isinstance(actual, NTypeVars):
		if expected.base_type == actual.base_type:
			return expected.with_typevars([apply_generics(expected_type, actual_type, generics) for expected_type, actual_type in zip(expected.typevars, actual.typevars)])
	elif isinstance(expected, tuple) and isinstance(actual, tuple):
		return tuple(apply_generics(expected_arg, actual_arg, generics) for expected_arg, actual_arg in zip(expected, actual))
	elif isinstance(expected, list) and isinstance(actual, list):
		return [apply_generics(expected_item, actual_item, generics) for expected_item, actual_item in zip(expected, actual)]
	elif isinstance(expected, dict):
		return {key: apply_generics(expected_type, actual[key], generics) if key in actual else expected_type for key, expected_type in expected.items()}
	return expected

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
