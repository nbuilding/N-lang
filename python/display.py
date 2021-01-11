from colorama import Fore, Style
from function import Function

unescape = {
	"\\": "\\",
	"\"": "\"",
	"\n": "n",
	"\r": "r",
	"\t": "t"
}

def display_value(value, color=True, indent="\t", indent_state=""):
	if isinstance(value, dict):
		if len(value) == 0:
			output = "{}"
		else:
			output = "{\n"
			inner_indent = indent_state + indent
			for key, record_value in value.items():
				output += inner_indent + key + ": " + display_value(record_value, color=color, indent=indent, indent_state=inner_indent) + "\n"
			output += indent_state + "}"
	elif isinstance(value, list) or isinstance(value, tuple):
		is_list = isinstance(value, list)
		if len(value) == 0:
			output = "[]" if is_list else "()"
		else:
			output = "[" if is_list else "("
			inner_indent = indent_state + indent
			for i, item in enumerate(value):
				if i != 0:
					output += ",\n" + inner_indent
				else:
					output += "\n" + inner_indent
				output += display_value(item, color=color, indent=indent, indent_state=inner_indent)
			output += "\n" + indent_state + ("]" if is_list else ")")
	elif isinstance(value, bool):
		output = "true" if value else "false"
		if color:
			output = Fore.YELLOW + output + Style.RESET_ALL
	elif isinstance(value, int) or isinstance(value, float):
		output = str(value)
		if color:
			output = Fore.YELLOW + output + Style.RESET_ALL
	elif isinstance(value, str):
		output = value
		for char, escape in unescape.items():
			escape = "\\" + escape
			if color:
				escape = Fore.CYAN + escape + Fore.GREEN
			output = output.replace(char, escape)
		output = "\"%s\"" % output
		if color:
			output = Fore.GREEN + output + Style.RESET_ALL
	elif isinstance(value, Function):
		output = "<function>"
		if color:
			output = Fore.MAGENTA + output + Style.RESET_ALL
	else:
		print("???", value)
		output = "<unprintable value>"
		if color:
			output = Fore.RED + output + Style.RESET_ALL
	return output
