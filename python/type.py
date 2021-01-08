import lark

class NType:
	def __init__(self, name):
		self.name = name

class NGenericType(NType):
	def __init__(self, name):
		super(NGenericType, self).__init__(name)

def type_is_list(maybe_list_type):
	if isinstance(maybe_list_type, list) and len(maybe_list_type) > 0 and type(maybe_list_type[0]) == lark.Token and maybe_list_type[0].type == "LIST":
		if len(maybe_list_type) > 1:
			return maybe_list_type[1]
		else:
			return "infer"
	return False

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
	elif isinstance(expected, tuple) and isinstance(actual, tuple):
		return tuple(apply_generics(expected_arg, actual_arg, generic_types, generics) for expected_arg, actual_arg in zip(expected, actual))
	elif isinstance(expected, list) and isinstance(actual, list):
		expected_contained_type = type_is_list(expected)
		actual_contained_type = type_is_list(actual)
		if expected_contained_type and actual_contained_type:
			return [lark.Token("LIST", "list"), apply_generics(expected_contained_type, actual_contained_type, generic_types, generics)]
		elif not expected_contained_type and not actual_contained_type:
			return [apply_generics(expected_item, actual_item, generic_types, generics) for expected_item, actual_item in zip(expected, actual)]
	elif isinstance(expected, dict):
		return {key: apply_generics(expected_type, actual[key], generic_types, generics) if key in actual else expected_type for key, expected_type in expected.items()}
	return expected

def apply_generics_to(return_type, generics):
	if isinstance(return_type, NGenericType):
		generic = generics.get(return_type)
		if generic is None:
			return return_type
		else:
			return generic
	elif isinstance(return_type, tuple):
		return tuple(apply_generics_to(arg_type, generics) for arg_type in return_type)
	elif isinstance(return_type, list):
		contained_type = type_is_list(return_type)
		if contained_type is None:
			return [apply_generics_to(item_type, generics) for item_type in return_type]
		else:
			return [lark.Token("LIST", "list"), apply_generics_to(contained_type, generics)]
	elif isinstance(return_type, dict):
		return {key: apply_generics_to(field_type, generics) for key, field_type in return_type.items()}
	else:
		return return_type
