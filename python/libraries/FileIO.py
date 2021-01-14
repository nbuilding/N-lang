from native_types import n_cmd_type

def write(path, content):
	with open(path, "w+") as f:
		f.write(content)

def append(path, content):
	with open(path, "a+") as f:
		f.write(content)

def read(path):
	with open(path, "r", encoding="utf-8") as f:
		return f.read()

def _values():
	return {
		"write": ("str", "str", n_cmd_type.with_typevars(["unit"])),
		"append": ("str", "str", n_cmd_type.with_typevars(["unit"])),
		"read": ("str", n_cmd_type.with_typevars(["str"])),
	}
