import asyncio
import math
import lark
import sys

import scope

from variable import Variable
from function import Function
from type import NGenericType, NModule, NClass, NTypeVars, NType
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
from ncmd import Cmd


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


def with_default(maybe_value, default_value):
    if maybe_value.variant == "yes":
        return maybe_value.values[0]
    else:
        return default_value


def cmd_then(n_function, cmd):
    async def then(result):
        return await Cmd.wrap(await n_function.run([result])).eval()

    return Cmd.wrap(cmd).then(lambda result: lambda: then(result))


def cmd_parallel(cmd):
    async def in_parallel():
        return await Cmd.wrap(cmd).eval()

    async def run_in_parallel():
        # Run `cmd` in parallel
        task = asyncio.create_task(in_parallel())

        # The async function resolves when `cmd` is done
        async def get_parallel_result():
            return await task

        # Return a `cmd` based on `get_parallel_result`
        return Cmd(lambda _: get_parallel_result)

    # Return a `cmd` based on `run_in_parallel`
    return Cmd(lambda _: run_in_parallel)


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


def special_print_with_end(end, val):
    if isinstance(val, str):
        print(val, end=end)
    else:
        display, _ = scope.display_value(val, indent="  ")
        print(display, end=end)
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


def char_with_replace(num):
    try:
        return chr(num)
    except ValueError:
        return u'\ufffd'


def round_without_error(number):
    try: 
        return round(number)
    except:
        return 0


def floor_without_error(number):
    try: 
        return math.floor(number)
    except:
        return 0


def ceil_without_error(number):
    try: 
        return math.ceil(number)
    except:
        return 0


def range_without_error(start, end, step): 
    try:
        return list(range(start, end, step))
    except:
        return []

def trim(string):
    whitespace = [u'\u0009', u'\u000a', u'\u000a', u'\u000b', u'\u000c', u'\u0020', u'\u00a0', u'\u1680', u'\u2000', u'\u2001', u'\u2002', u'\u2003', u'\u2004', u'\u2005', u'\u2006', u'\u2007', u'\u2008', u'\u2009', u'\u200a', u'\u2028', u'\u2029', u'\u202f', u'\u205f', u'\u3000', u'\ufeff']

    return string.strip("".join(whitespace))

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
        round_without_error,
    )
    global_scope.add_native_function(
        "floor",
        [("number", "float")],
        "int",
        floor_without_error,
    )
    global_scope.add_native_function(
        "ceil",
        [("number", "float")],
        "int",
        ceil_without_error,
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
        char_with_replace,
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
        "split",
        [("splitter", "char"), ("string", "str")],
        n_list_type.with_typevars(["str"]),
        lambda splitter, string: string.split(splitter),
    )
    global_scope.add_native_function(
        "strip", [("string", "str")], "str", trim
    )
    global_scope.add_native_function(
        "range",
        [("start", "int"), ("end", "int"), ("step", "int")],
        n_list_type.with_typevars(["int"]),
        range_without_error,
    )
    print_generic = NGenericType("t")
    global_scope.add_native_function(
        "print", [("val", print_generic)], print_generic, special_print
    )
    print_with_end_generic = NGenericType("t")
    global_scope.add_native_function(
        "printWithEnd",
        [("end", "str"), ("val", print_with_end_generic)],
        print_with_end_generic,
        special_print_with_end,
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
    parallel_generic = NGenericType("a")
    global_scope.add_native_function(
        "parallel",
        [
            ("cmd", n_cmd_type.with_typevars([parallel_generic])),
        ],
        n_cmd_type.with_typevars([n_cmd_type.with_typevars([parallel_generic])]),
        cmd_parallel,
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
    global_scope.add_native_function(
        "exit",
        [("exitCode", "int")],
        "unit",
        sys.exit,
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

    global_scope.add_internal_trait(
        "str",
        "len",
        [
            ("self", "str"),
            ("_", "unit"),
        ],
        "int",
        len,
    )

    len_trait_generic = NGenericType("t")
    global_scope.add_internal_trait(
        "list",
        "len",
        [
            ("self", "str"),
            ("_", "unit"),
        ],
        "int",
        len,
    )

    default_trait_generic = NGenericType("t")
    global_scope.add_internal_trait(
        "maybe",
        "default",
        [
            ("self", n_maybe_type.with_typevars([default_trait_generic])),
            ("default", default_trait_generic),
        ],
        default_trait_generic,
        with_default,
    )
