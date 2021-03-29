from aiofile import async_open
from native_types import n_cmd_type, n_maybe_type, yes, none


async def write(path, content):
    async with async_open(path, "w+") as f:
        await f.write(content)


async def append(path, content):
    async with async_open(path, "a+") as f:
        await f.write(content)


async def read(path):
    try:
        async with async_open(path, "r", encoding="utf-8") as f:
            return yes(await f.read())
    except FileNotFoundError:
        return none


def _values():
    return {
        # write: str -> str -> cmd[()]
        "write": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # append: str -> str -> cmd[()]
        "append": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # read: str -> cmd[maybe[str]]
        "read": ("str", n_cmd_type.with_typevars([n_maybe_type.with_typevars(["str"])])),
    }
