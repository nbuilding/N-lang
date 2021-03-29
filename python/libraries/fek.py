import re
from native_types import n_cmd_type


def paer(output):
    print(output)


def _values():
    return {
        "paer": ("str", n_cmd_type.with_typevars(["unit"])),
    }
