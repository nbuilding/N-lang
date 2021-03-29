import lark
from colorama import Fore, Style
from type import NType, NTypeVars, NModule, NClass


class TypeCheckError:
    def __init__(self, token_or_tree, message):
        if not isinstance(token_or_tree, lark.Token) and not isinstance(
            token_or_tree, lark.Tree
        ):
            raise TypeError("token_or_tree should be a Lark Token or Tree.")
        self.datum = token_or_tree
        self.message = message

    def display(self, display_type, file):
        output = ""
        color = Fore.RED
        if display_type == "error":
            output += f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}"
        elif display_type == "warning":
            output += f"{Fore.YELLOW}{Style.BRIGHT}Warning{Style.RESET_ALL}"
            color = Fore.YELLOW
        else:
            raise ValueError(
                "%s is not a valid display type for TypeCheckError." % display_type
            )
        output += ": %s\n" % self.message
        spaces = " " * (len(str(file.line_num_width + 1) + " |") - 1)
        if isinstance(self.datum, lark.Token):

            output += f"{Fore.CYAN}{spaces}--> {Fore.BLUE}{file.name}:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
            output += file.display(
                self.datum.line,
                self.datum.column,
                self.datum.end_line,
                self.datum.end_column,
            )
        else:
            output += f"{Fore.CYAN}{spaces}--> {Fore.BLUE}{file.name}:{self.datum.line}:{self.datum.column}{Style.RESET_ALL}\n"
            output += file.display(
                self.datum.line,
                self.datum.column,
                self.datum.end_line,
                self.datum.end_column,
                color,
            )
        return output

    def __repr__(self):
        return "TypeCheckError(%s, %s)" % (repr(self.datum), repr(self.message))

    def compare(self, other):
        if not isinstance(other, TypeCheckError):
            return False
        return other.datum == self.datum and other.message == self.message


def display_type(n_type, color=True):
    display = ""
    if isinstance(n_type, str):
        display = "()" if n_type == "unit" else n_type
    elif isinstance(n_type, tuple):
        display = " -> ".join(
            ("(%s)" if isinstance(type, tuple) else "%s") % display_type(type, False)
            for type in n_type
        )
    elif isinstance(n_type, list):
        if isinstance(n_type[0], lark.Token):
            if n_type[0].type == "LIST":
                if len(n_type) >= 2:
                    display = "list[" + display_type(n_type[1], False) + "]"
                else:
                    display = "list[]"
        if display == "":
            display = (
                "(" + ", ".join(display_type(type, False) for type in n_type) + ")"
            )
    elif isinstance(n_type, NModule):
        display = "module %s" % n_type.mod_name
    elif isinstance(n_type, NClass):
        display = n_type.class_name
    elif isinstance(n_type, dict):
        display = "{ %s }" % "; ".join(
            "%s: %s" % (key, display_type(value, False))
            for key, value in n_type.items()
        )
        if len(n_type) == 0:
            display = "{}"
    elif isinstance(n_type, NTypeVars):
        display = n_type.name
        if len(n_type.typevars) > 0:
            display += "[%s]" % ", ".join(
                display_type(typevar, False) for typevar in n_type.typevars
            )
    elif isinstance(n_type, NType):
        display = n_type.name
    else:
        print(
            "display_type was given a value that is neither a string nor a tuple nor a list nor a dictionary nor a NType.",
            n_type,
        )
        if n_type is None:
            raise TypeError("found None")
        return Fore.RED + "???" + Style.RESET_ALL if color else "???"
    return Fore.YELLOW + display + Style.RESET_ALL if color else display
