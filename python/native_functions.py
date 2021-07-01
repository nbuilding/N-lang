import math
import lark

import scope

from variable import Variable
from function import Function
from type_check_error import display_type
from type import NGenericType, NModule
from enums import EnumType, EnumValue
from native_types import (
    n_list_type,
    n_map_type,
    NMap,
    n_cmd_type,
    n_maybe_type,
    maybe_generic,
    none,
    yes,
    n_result_type,
    result_ok_generic,
    result_err_generic,
    ok,
    err,
    n_module_type,
)


def substr(start, end, string):
    return string[start:end]


def char_at(index, string):
    if index < 0 or index >= len(string):
        return none
    else:
        return yes(string[index])


def item_at(index, lis):
    if index < 0 or index >= len(lis):
        return none
    else:
        return yes(lis[index])


def length(string):
    try:
        return len(string)
    except TypeError:
        return len(str(string))


async def filter_map(transformer, lis):
    new_list = []
    for item in lis:
        transformed = await transformer.run([item])
        if transformed.variant == "yes":
            new_list.append(transformed.values[0])
    return new_list


def type_display(o):
    if isinstance(o, Function):
        return str(o)
    return type(o).__name__


def with_default(default_value, maybe_value):
    if maybe_value.variant == "yes":
        return maybe_value.values[0]
    else:
        return default_value


def cmd_then(n_function, cmd):
    async def then(result):
        return (await n_function.run([result])).eval

    return cmd.then(then)


def map_from(entries):
    # NMap extends dict so it's basically a dict, but this way we can
    # distinguish between a record and a map.
    return NMap(entries)


def map_get(key, map):
    item = map.get(key)
    if item is None:
        return none
    else:
        return yes(item)


def entries(n_map):
    # NMap extends dict so it's basically a dict, but this way we can
    # distinguish between a record and a map.
    return list(n_map.items())


def special_print(val):
    if isinstance(val, str):
        print(val)
    else:
        display, _ = scope.display_value(val, indent="  ")
        print(display)
    return val


def subsection_list(lower, upper, l):
    if lower < 0:
        lower = 0
    if upper > len(l):
        upper = len(l)
    return l[lower:upper]


def to_module(possible_module):
    if isinstance(possible_module, NModule):
        return yes(possible_module)
    return none


# Define global functions/variables
def add_funcs(global_scope):
    global_scope.variables["none"] = Variable(n_maybe_type, none)

    global_scope.add_native_function(
        "intInBase10",
        [("number", "int")],
        "str",
        str,
    )
    global_scope.add_native_function(
        "round",
        [("number", "float")],
        "int",
        round,
    )
    global_scope.add_native_function(
        "floor",
        [("number", "float")],
        "int",
        math.floor,
    )
    global_scope.add_native_function(
        "ceil",
        [("number", "float")],
        "int",
        math.ceil,
    )
    global_scope.add_native_function(
        "charCode",
        [("character", "char")],
        "int",
        ord,
    )
    global_scope.add_native_function(
        "intCode",
        [("number", "int")],
        "char",
        chr,
    )
    global_scope.add_native_function(
        "charAt",
        [("location", "int"), ("string", "str")],
        n_maybe_type.with_typevars(["char"]),
        char_at,
    )
    global_scope.add_native_function(
        "substring",
        [("start", "int"), ("end", "int"), ("string", "str")],
        "str",
        substr,
    )
    global_scope.add_native_function(
        "toFloat",
        [("number", "int")],
        "float",
        float,
    )
    global_scope.add_native_function(
        "len",
        [("obj", NGenericType("t"))],
        "int",
        length,
    )
    global_scope.add_native_function(
        "split",
        [("splitter", "char"), ("string", "str")],
        n_list_type.with_typevars(["str"]),
        lambda splitter, string: string.split(splitter),
    )
    global_scope.add_native_function(
        "strip", [("string", "str")], "str", lambda string: string.strip()
    )
    global_scope.add_native_function(
        "range",
        [("start", "int"), ("end", "int"), ("step", "int")],
        n_list_type.with_typevars(["int"]),
        lambda start, end, step: list(range(start, end, step)),
    )
    global_scope.add_native_function(
        "type",
        [("obj", NGenericType("t"))],
        "str",
        type_display,
    )
    print_generic = NGenericType("t")
    global_scope.add_native_function(
        "print", [("val", print_generic)], print_generic, special_print
    )
    item_at_generic = NGenericType("t")
    global_scope.add_native_function(
        "itemAt",
        [("index", "int"), ("list", n_list_type.with_typevars([item_at_generic]))],
        n_maybe_type.with_typevars([item_at_generic]),
        item_at,
    )
    append_generic = NGenericType("t")
    global_scope.add_native_function(
        "append",
        [
            ("item", append_generic),
            ("list", n_list_type.with_typevars([append_generic])),
        ],
        n_list_type.with_typevars([append_generic]),
        lambda i, l: l.__add__([i]),
    )
    subsection_generic = NGenericType("t")
    global_scope.add_native_function(
        "subsection",
        [
            ("lower", "int"),
            ("upper", "int"),
            ("list", n_list_type.with_typevars([subsection_generic])),
        ],
        n_list_type.with_typevars([subsection_generic]),
        subsection_list,
    )

    filter_map_generic_a = NGenericType("a")
    filter_map_generic_b = NGenericType("b")
    global_scope.add_native_function(
        "filterMap",
        [
            (
                "function",
                (
                    filter_map_generic_a,
                    n_maybe_type.with_typevars([filter_map_generic_b]),
                ),
            ),
            ("list", n_list_type.with_typevars([filter_map_generic_a])),
        ],
        n_list_type.with_typevars([filter_map_generic_b]),
        filter_map,
    )
    global_scope.add_native_function(
        "yes",
        [("value", maybe_generic)],
        n_maybe_type.with_typevars([maybe_generic]),
        yes,
    )
    default_generic = NGenericType("t")
    global_scope.add_native_function(
        "default",
        [
            ("default", default_generic),
            ("maybeValue", n_maybe_type.with_typevars([default_generic])),
        ],
        default_generic,
        with_default,
    )
    global_scope.add_native_function(
        "ok",
        [("value", result_ok_generic)],
        n_result_type.with_typevars([result_ok_generic, result_err_generic]),
        ok,
    )
    global_scope.add_native_function(
        "err",
        [("error", result_err_generic)],
        n_result_type.with_typevars([result_ok_generic, result_err_generic]),
        err,
    )
    then_generic_in = NGenericType("a")
    then_generic_out = NGenericType("b")
    global_scope.add_native_function(
        "then",
        [
            (
                "thenFunction",
                (then_generic_in, n_cmd_type.with_typevars([then_generic_out])),
            ),
            ("cmd", n_cmd_type.with_typevars([then_generic_in])),
        ],
        n_cmd_type.with_typevars([then_generic_out]),
        cmd_then,
    )
    map_from_generic_key = NGenericType("k")
    map_from_generic_value = NGenericType("v")
    global_scope.add_native_function(
        "mapFrom",
        [
            (
                "entries",
                n_list_type.with_typevars(
                    [[map_from_generic_key, map_from_generic_value]]
                ),
            )
        ],
        n_map_type.with_typevars([map_from_generic_key, map_from_generic_value]),
        map_from,
    )
    map_get_generic_key = NGenericType("k")
    map_get_generic_value = NGenericType("v")
    global_scope.add_native_function(
        "getValue",
        [
            ("key", map_get_generic_key),
            (
                "map",
                n_map_type.with_typevars([map_get_generic_key, map_get_generic_value]),
            ),
        ],
        n_maybe_type.with_typevars([map_get_generic_value]),
        map_get,
    )
    entries_generic_key = NGenericType("k")
    entries_generic_value = NGenericType("v")
    global_scope.add_native_function(
        "entries",
        [
            (
                "map",
                n_map_type.with_typevars([entries_generic_key, entries_generic_value]),
            )
        ],
        n_list_type.with_typevars([[entries_generic_key, entries_generic_value]]),
        entries,
    )
    into_module_generic_value = NGenericType("m")
    global_scope.add_native_function(
        "intoModule",
        [("possibleModule", into_module_generic_value)],
        n_maybe_type.with_typevars([n_module_type.with_typevars([])]),
        to_module,
    )
    global_scope.add_native_function(
        "getUnitTestResults",
        [("possibleModule", n_module_type)],
        n_list_type.with_typevars(
            [
                {
                    "hasPassed": "bool",
                    "fileLine": "int",
                    "unitTestType": "str",
                    "possibleTypes": n_maybe_type.with_typevars([["str", "str"]]),
                }
            ]
        ),
        lambda module: scope.unit_test_results[module.mod_name][:],
    )

    global_scope.types["str"] = "str"
    global_scope.types["char"] = "char"
    global_scope.types["int"] = "int"
    global_scope.types["float"] = "float"
    global_scope.types["bool"] = "bool"
    global_scope.types["list"] = n_list_type
    global_scope.types["map"] = n_map_type
    global_scope.types["cmd"] = n_cmd_type
    global_scope.types["maybe"] = n_maybe_type
    global_scope.types["result"] = n_result_type
    global_scope.types["module"] = n_module_type
