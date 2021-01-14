from native_types import n_cmd_type

def inp(args):
	return input(str(args[0]))

def _values():
	return {
		"inp": n_cmd_type.with_typevars(["str"])
	}
