from type import NTypeVars
from native_types import n_list_type, list_generic

# Might move these into Scope one day because these might be scoped due to
# implementations of traits.
binary_operation_types = {
    "OR": [("bool", "bool", "bool"), ("int", "int", "int")],
    "AND": [("bool", "bool", "bool"), ("int", "int", "int")],
    "ADD": [
        ("int", "int", "int"),
        ("float", "float", "float"),
        ("str", "str", "str"),
        ("char", "char", "str"),
        ("str", "char", "str"),
        (n_list_type, n_list_type, n_list_type),
    ],
    "SUBTRACT": [("int", "int", "int"), ("float", "float", "float")],
    "MULTIPLY": [("int", "int", "int"), ("float", "float", "float")],
    "DIVIDE": [("int", "int", "int"), ("float", "float", "float")],
    "SHIFTL": [("int", "int", "int")],
    "SHIFTR": [("int", "int", "int")],
    "ROUNDDIV": [("int", "int", "int"), ("float", "float", "float")],
    "MODULO": [("int", "int", "int"), ("float", "float", "float")],
    # Exponents are weird because negative powers result in non-integers.
    # TODO: Make int ^ int an int; negative powers should result in 0.
    "EXPONENT": [("int", "int", "float"), ("float", "float", "float")],
}
unary_operation_types = {
    "SUBTRACT": [("int", "int"), ("float", "float")],
    "NOT": [("bool", "bool"), ("int", "int")],
}
comparable_types = ["int", "float"]
legacy_iterable_types = [("int", "int")]
iterable_types = [(n_list_type, list_generic)]
