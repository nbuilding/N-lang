from type import NTypeVars

# TODO: Move these into Scope because one day these might be scoped due to
# implementations of traits.
binary_operation_types = {
	"OR": { ("bool", "bool"): "bool", ("int", "int"): "int" },
	"AND": { ("bool", "bool"): "bool", ("int", "int"): "int" },
	"ADD": { ("int", "int"): "int", ("float", "float"): "float", ("str", "str"): "str", ("char", "char"): "str", ("str", "char"): "str"},
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
legacy_iterable_types = { "int": "int" }
_other_iterable_types = {  }
def iterable_types(iterable_type):
	if isinstance(iterable_type, NTypeVars):
		if iterable_type.name == "list":
			return iterable_type.typevars[0]

	return _other_iterable_types.get(iterable_type)
