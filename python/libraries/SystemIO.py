import asyncio
import os
import sys

from concurrent.futures import ThreadPoolExecutor
from native_types import n_cmd_type
from type import NGenericType


# https://gist.github.com/delivrance/675a4295ce7dc70f0ce0b164fcdbd798
async def inp(question):
    with ThreadPoolExecutor(1, "AsyncInput") as executor:
        return await asyncio.get_event_loop().run_in_executor(executor, input, question)


def run(command):
    can_run = os.environ.get("COMMAND_ALLOW") == "true"
    if not can_run:
        return False

    return os.system(command) == 0

def sendSTDOUT(data):
    print(data, file = sys.stdout, end = "")

def _values():
    stdout_generic = NGenericType("t")
    return {
        "inp": ("str", n_cmd_type.with_typevars(["str"])),
        "run": ("str", n_cmd_type.with_typevars(["bool"])),
        "sendSTDOUT": (stdout_generic, n_cmd_type.with_typevars(["unit"]))
    }
