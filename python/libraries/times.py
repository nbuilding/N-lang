import time
from native_types import n_cmd_type

def sleep(t):
	time.sleep(t[0]/1000)

def _values():
	return {
		"sleep": ("int", n_cmd_type.with_typevars(["unit"])),
	}
