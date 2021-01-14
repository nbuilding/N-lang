from aiofile import async_open
from native_types import n_cmd_type

async def write(path, content):
	async with async_open(path, "w+") as f:
		await f.write(content)

async def append(path, content):
	async with async_open(path, "a+") as f:
		await f.write(content)

async def read(path):
	async with async_open(path, "r", encoding="utf-8") as f:
		return await f.read()

def _values():
	return {
		"write": ("str", "str", n_cmd_type.with_typevars(["unit"])),
		"append": ("str", "str", n_cmd_type.with_typevars(["unit"])),
		"read": ("str", n_cmd_type.with_typevars(["str"])),
	}
