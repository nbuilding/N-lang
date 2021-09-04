from type import NGenericType
from native_types import n_cmd_type
from enums import EnumType, EnumValue


locked_generic = NGenericType("t")
mutex_locked_type = EnumType(
    "locked",
    [
        ("yes", [locked_generic]),
    ],
    [locked_generic],
)


unlocked_generic = NGenericType("t")
mutex_unlocked_type = EnumType(
    "unlocked",
    [
        ("yes", [unlocked_generic]),
    ],
    [unlocked_generic],
)


def new(val):
    return EnumValue("locked", [val])


def read(unlocked):
    return unlocked.values[0]


def _values():
    new_generic = NGenericType("t")
    read_generic = NGenericType("t")
    return {
        "new": (new_generic, mutex_locked_type.with_typevars([new_generic])),
        "read": (mutex_unlocked_type.with_typevars([read_generic]), n_cmd_type.with_typevars([read_generic])),
    }


def _types():
    return {
        "locked": mutex_locked_type,
        "unlocked": mutex_unlocked_type,
    }
