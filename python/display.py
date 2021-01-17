from colorama import Fore, Style
from function import Function
from type import NModule
from enums import EnumValue
from cmd import Cmd
from native_types import NMap

unescape = {
	"\\": "\\",
	"\"": "\"",
	"\n": "n",
	"\r": "r",
	"\t": "t"
}

def display_value(value, color=True, indent="\t", indent_state=""):
	if isinstance(value, NModule):
		output = "[module %s]" % value.mod_name
		if color:
			output = Fore.MAGENTA + output + Style.RESET_ALL
	elif isinstance(value, NMap):
		# There's currently no special syntax for maps, so this mimics its
		# constructor.
		start = "<mapFrom"
		end = ">"
		if color:
			start = Fore.MAGENTA + start + Style.RESET_ALL
			end = Fore.MAGENTA + end + Style.RESET_ALL
		output = start + " " + display_value(list(value.items()), color=color, indent=indent, indent_state=indent_state) + end
	elif isinstance(value, dict):
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
	elif isinstance(value, EnumValue):
		if len(value.values) == 0:
			output = Fore.MAGENTA + value.variant + Style.RESET_ALL if color else value.variant
		else:
			output = '<' + value.variant + '\n'
			if color:
				output = Fore.MAGENTA + output + Style.RESET_ALL
			inner_indent = indent_state + indent
			for value in value.values:
				output += inner_indent + display_value(value, color=color, indent=indent, indent_state=inner_indent) + '\n'
			output += indent_state + (Fore.MAGENTA + '>' + Style.RESET_ALL if color else '>')
	elif isinstance(value, Cmd):
		output = "[cmd]"
		if color:
			output = Fore.MAGENTA + output + Style.RESET_ALL
	elif isinstance(value, Function):
		output = "[function]"
		if color:
			output = Fore.MAGENTA + output + Style.RESET_ALL
	else:
		print("???", value)
		output = "[unprintable value]"
		if color:
			output = Fore.RED + output + Style.RESET_ALL
	return output
