import time as t
import asyncio
from native_types import n_cmd_type


async def sleep(time):
    await asyncio.sleep(time / 1000)

async def getTimeSince(time):
	return t.time() - time

def _values():
    return {
        "sleep": ("int", n_cmd_type.with_typevars(["unit"])),
        "getTimeSince": ("float", n_cmd_type.with_typevars(["float"])),
    }
