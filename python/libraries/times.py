import time
import asyncio
from native_types import n_cmd_type


async def sleep(time):
    await time.sleep(time[0] / 1000)


def _values():
    return {
        "sleep": ("int", n_cmd_type.with_typevars(["unit"])),
    }
