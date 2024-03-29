import time as t
import asyncio
from native_types import n_cmd_type


async def sleep(time):
    await asyncio.sleep(time / 1000)


async def getTime(unit):
    return t.time() * 1000


def _values():
    return {
        "sleep": ("int", n_cmd_type.with_typevars(["unit"])),
        "getTime": (
            "unit",
            n_cmd_type.with_typevars(["float"]),
        ),
    }
