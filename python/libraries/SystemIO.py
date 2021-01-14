from native_types import n_cmd_type

def inp(question):
	return input(question)

def _values():
	return {
		"inp": ("str", n_cmd_type.with_typevars(["str"]))
	}
