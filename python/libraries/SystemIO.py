import asyncio
from concurrent.futures import ThreadPoolExecutor
from native_types import n_cmd_type


# https://gist.github.com/delivrance/675a4295ce7dc70f0ce0b164fcdbd798
async def inp(question):
    with ThreadPoolExecutor(1, "AsyncInput") as executor:
        return await asyncio.get_event_loop().run_in_executor(executor, input, question)


def _values():
    return {
        "inp": ("str", n_cmd_type.with_typevars(["str"]))
    }
