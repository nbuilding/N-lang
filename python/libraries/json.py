import json
import math

from enums import EnumType, EnumValue
from native_types import n_list_type, n_map_type, NMap, n_maybe_type, yes

json_value_type = EnumType(
    "value",
    [
        ("null", []),
        ("string", ["str"]),
        ("number", ["float"]),
        ("boolean", ["bool"]),
    ],
)
# These must be added separately because they're self-referencing
json_value_type.variants += [
    ("array", [n_list_type.with_typevars([json_value_type])]),
    ("object", [n_map_type.with_typevars(["str", json_value_type])]),
]

null = EnumValue("null")


def string(string):
    return EnumValue("string", [string])


def number(float):
    return EnumValue("number", [float])


def boolean(boolean):
    return EnumValue("boolean", [boolean])


def array(value_list):
    return EnumValue("array", [value_list])


def object(value_map):
    return EnumValue("object", [value_map])


"""
Converts a Python value of dicts and lists to the value type exported by this
module.
"""


def python_to_json(value):
    if value is None:
        return null
    elif isinstance(value, str):
        return string(value)
    elif isinstance(value, bool):
        return boolean(value)
    elif isinstance(value, float):
        return number(value)
    elif isinstance(value, int):
        return number(float(value))
    elif isinstance(value, list):
        return array([python_to_json(item) for item in value])
    elif isinstance(value, dict):
        return object(NMap({key: python_to_json(item) for key, item in value.items()}))
    else:
        # Thought about raising an exception, but I would have to expect its
        # callers to responsibly deal with them, which is unlikely.
        return null


"""
Reverses `python_to_json`.
"""


def json_to_python(enum_value):
    if enum_value.variant == "null":
        return None
    elif enum_value.variant in ["string", "number", "boolean"]:
        return enum_value.values[0]
    elif enum_value.variant == "array":
        return [json_to_python(item) for item in enum_value.values[0]]
    elif enum_value.variant == "object":
        return {
            key: json_to_python(value) for key, value in enum_value.values[0].items()
        }
    else:
        raise TypeError("I was not given a JSON value enum!")


def parse(string):
    return python_to_json(json.loads(string))


def parseSafe(string):
    try:
        return yes(python_to_json(json.loads(string)))
    except:
        return None

def convert_float_to_int(value):
    if isinstance(value, float):
        if value % 1 == 0:
            value = round(value)
        elif math.isnan(value) or math.isinf(value):
            value = None
    elif isinstance(value, dict):
        for i in value.keys():
            if isinstance(value[i], dict) or isinstance(value[i], list):
                value[i] = convert_float_to_int(value[i])
            elif isinstance(value[i], float):
                if value[i] % 1 == 0:
                    value[i] = round(value[i])
    elif isinstance(value, list):
        for i in range(len(value)):
            if isinstance(value[i], dict) or isinstance(value[i], list):
                value[i] = convert_float_to_int(value[i])
            elif isinstance(value[i], float):
                if value[i] % 1 == 0:
                    value[i] = round(value[i])

    return value

# TODO: Formatting options?
# TODO: Convert NaN and infinities to null, per spec.
def stringify(json_value):
    return json.dumps(convert_float_to_int(json_to_python(json_value)))


def _values():
    return {
        # json.value enum values
        "null": json_value_type,
        "string": ("str", json_value_type),
        "number": ("float", json_value_type),
        "boolean": ("bool", json_value_type),
        "array": (n_list_type.with_typevars([json_value_type]), json_value_type),
        "object": (n_map_type.with_typevars(["str", json_value_type]), json_value_type),
        # JSON parsing/stringifying
        "parse": ("str", json_value_type),
        "parseSafe": ("str", n_maybe_type.with_typevars([json_value_type])),
        "stringify": (json_value_type, "str"),
    }


def _types():
    return {
        "value": json_value_type,
    }
