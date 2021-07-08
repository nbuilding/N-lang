from type import NTypeVars, NGenericType
from native_types import n_list_type, list_generic, n_map_type, n_maybe_type

# Might move these into Scope one day because these might be scoped due to
# implementations of traits.


in_generic = NGenericType("t")
in_map_generic = NGenericType("k")
in_value_generic = NGenericType("v")

access_list_generic = NGenericType("t")
access_map_generic = NGenericType("k")
access_value_generic = NGenericType("v")

binary_operation_types = {
    "OR": [("bool", "bool", "bool"), ("int", "int", "int")],
    "AND": [("bool", "bool", "bool"), ("int", "int", "int")],
    "ADD": [
        ("int", "int", "int"),
        ("float", "float", "float"),
        ("str", "str", "str"),
        ("char", "char", "str"),
        ("str", "char", "str"),
        ("char", "str", "str"),
        (n_list_type, n_list_type, n_list_type),
    ],
    "SUBTRACT": [("int", "int", "int"), ("float", "float", "float")],
    "MULTIPLY": [("int", "int", "int"), ("float", "float", "float")],
    "DIVIDE": [("int", "int", "int"), ("float", "float", "float")],
    "SHIFTL": [("int", "int", "int")],
    "SHIFTR": [("int", "int", "int")],
    "IN": [
        ("char", "str", "bool"),
        ("str", "str", "bool"),
        (in_generic, n_list_type.with_typevars([in_generic]), "bool"),
        (
            in_map_generic,
            n_map_type.with_typevars([in_map_generic, in_value_generic]),
            "bool",
        ),
    ],
    "MODULO": [("int", "int", "int"), ("float", "float", "float")],
    # Exponents are weird because negative powers result in non-integers.
    # TODO: Make int ^ int an int; negative powers should result in 0.
    "EXPONENT": [("int", "int", "float"), ("float", "float", "float")],
    "VALUEACCESS": [
        (
            n_list_type.with_typevars([access_list_generic]),
            "int",
            n_maybe_type.with_typevars([access_list_generic]),
        ), (
            n_map_type.with_typevars([
                access_map_generic,
                access_value_generic,
            ]),
            access_map_generic,
            n_maybe_type.with_typevars([access_value_generic]),
        ),
        (
            "str",
            "int",
            "char",
        ),
        (
            n_maybe_type.with_typevars([n_list_type.with_typevars([access_list_generic])]),
            "int",
            n_maybe_type.with_typevars([access_list_generic]),
        ), (
            n_maybe_type.with_typevars([n_map_type.with_typevars([
                access_map_generic,
                access_value_generic,
            ])]),
            access_map_generic,
            n_maybe_type.with_typevars([access_value_generic]),
        ),
        (
            n_maybe_type.with_typevars(["str"]),
            "int",
            n_maybe_type.with_typevars(["char"]),
        ),
    ]
}
unary_operation_types = {
    "SUBTRACT": [("int", "int"), ("float", "float")],
    "NOT": [("bool", "bool"), ("int", "int")],
}
comparable_types = ["int", "float"]
legacy_iterable_types = [("int", "int")]
iterable_types = [(n_list_type, list_generic)]
