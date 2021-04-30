from aiofile import async_open
from native_types import n_cmd_type, n_maybe_type, yes, none, n_list_type


async def write(path, content):
    async with async_open(path, "w+", encoding="utf-8") as f:
        await f.write(content)


async def append(path, content):
    try:
        async with async_open(path, "a+", encoding="utf-8") as f:
            await f.write(content)
    except:
        pass


async def read(path):
    try:
        async with async_open(path, "r", encoding="utf-8") as f:
            return yes(await f.read())
    except FileNotFoundError:
        return none

async def writeBytes(path, content):
    async with async_open(path, "w+", encoding="utf-8") as f:
        await f.write("".join([chr(c) for c in content]))


async def appendBytes(path, content):
    try:
        async with async_open(path, "a+", encoding="utf-8") as f:
            await f.write("".join([chr(c) for c in content]))
    except:
        pass


async def readBytes(path):
    try:
        async with async_open(path, "r", encoding="utf-8") as f:
            return yes([ord(c) for c in list(await f.read())])
    except FileNotFoundError:
        return none

def _values():
    return {
        # write: str -> str -> cmd[()]
        "write": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # append: str -> str -> cmd[()]
        "append": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # read: str -> cmd[maybe[str]]
        "read": (
            "str",
            n_cmd_type.with_typevars([n_maybe_type.with_typevars(["str"])]),
        ),
        "writeBytes": ("str", n_list_type.with_typevars(["int"]), n_cmd_type.with_typevars(["unit"])),
        "appendBytes": ("str", n_list_type.with_typevars(["int"]), n_cmd_type.with_typevars(["unit"])),
        "readBytes": (
            "str",
            n_cmd_type.with_typevars([n_maybe_type.with_typevars([n_list_type.with_typevars(["int"])])]),
        ),
    }
