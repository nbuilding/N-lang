import re
from colorama import Fore, Style
from function import Function
from type import NModule
from enums import EnumValue
from ncmd import Cmd
from native_types import NMap

unescape = {"\\": "\\", '"': '"', "\n": "n", "\r": "r", "\t": "t"}

class Printable:
    def get_display(self, color=True, indent="\t", indent_state="", preferred_max_len=50):
        return ""

# https://stackoverflow.com/a/38662876
def remove_color(line):
    ansi_escape = re.compile(r"(?:\x1B[@-_]|[\x80-\x9F])[0-?]*[ -/]*[@-~]")
    return ansi_escape.sub("", line)


def display_value(
    value, color=True, indent="\t", indent_state="", preferred_max_len=50
):
    multiline = False
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
        display_list, multiline = display_value(
            list(value.items()), color=color, indent=indent, indent_state=indent_state
        )
        output = start + " " + display_list + end
    elif isinstance(value, dict):
        if len(value) == 0:
            output = "{}"
        else:
            length = 4
            parts = []
            inner_indent = indent_state + indent
            for key, record_value in value.items():
                part, part_multiline = display_value(
                    record_value,
                    color=color,
                    indent=indent,
                    indent_state=inner_indent,
                    preferred_max_len=preferred_max_len,
                )
                part = key + ": " + part
                length += len(remove_color(part))
                parts.append(part)
                if part_multiline:
                    multiline = True
            if multiline or length > preferred_max_len:
                multiline = True
                output = "{\n"
                output += "".join(inner_indent + part + "\n" for part in parts)
                output += indent_state + "}"
            else:
                output = "{ %s }" % "; ".join(parts)
    elif isinstance(value, list) or isinstance(value, tuple):
        is_list = isinstance(value, list)
        if len(value) == 0:
            output = "[]" if is_list else "()"
        else:
            length = 2
            parts = []
            inner_indent = indent_state + indent
            for i, item in enumerate(value):
                part, part_multiline = display_value(
                    item,
                    color=color,
                    indent=indent,
                    indent_state=inner_indent,
                    preferred_max_len=preferred_max_len,
                )
                if i != len(value) - 1:
                    part += ","
                length += len(remove_color(part))
                parts.append(part)
                if part_multiline:
                    multiline = True
            if multiline or length > preferred_max_len:
                multiline = True
                output = "[\n" if is_list else "(\n"
                output += "".join(inner_indent + part + "\n" for part in parts)
                output += indent_state + ("]" if is_list else ")")
            else:
                output = ("[%s]" if is_list else "(%s)") % " ".join(parts)
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
        output = '"%s"' % output
        if color:
            output = Fore.GREEN + output + Style.RESET_ALL
    elif isinstance(value, EnumValue):
        if len(value.values) == 0:
            output = (
                Fore.MAGENTA + value.variant + Style.RESET_ALL
                if color
                else value.variant
            )
        else:
            length = len(value.variant) + 3
            parts = []
            inner_indent = indent_state + indent
            for field in value.values:
                part, part_multiline = display_value(
                    field,
                    color=color,
                    indent=indent,
                    indent_state=inner_indent,
                    preferred_max_len=preferred_max_len,
                )
                length += len(remove_color(part))
                parts.append(part)
                if part_multiline:
                    multiline = True
            output = "<" + value.variant
            if color:
                output = Fore.MAGENTA + output + Style.RESET_ALL
            if multiline or length > preferred_max_len:
                output += "\n" + "".join(inner_indent + part + "\n" for part in parts)
                output += indent_state
            else:
                output += " " + " ".join(parts)
            output += Fore.MAGENTA + ">" + Style.RESET_ALL if color else ">"
    elif isinstance(value, Cmd):
        output = "[cmd]"
        if color:
            output = Fore.MAGENTA + output + Style.RESET_ALL
    elif isinstance(value, Function):
        output = "[function]"
        if color:
            output = Fore.MAGENTA + output + Style.RESET_ALL
    elif isinstance(value, Printable):
        output = value.get_display(color)
    else:
        print("???", value)
        output = "[unprintable value]"
        if color:
            output = Fore.RED + output + Style.RESET_ALL
    return output, multiline
