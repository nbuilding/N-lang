from colorama import init, Fore, Style
from sys import exit
import lark


def format_error(e, file):
    if isinstance(e, lark.exceptions.UnexpectedEOF):
        spaces = " " * (len(str(len(file.lines) + 1) + " |") + 1) + " " * (-1)
        spaces_arrow = " " * (len(str(len(file.lines) + 1) + " |") - 3)
        formatted_chars = ", ".join(e.expected)
        print(
            f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}: Unexpected end of file, expected: [{formatted_chars}]")
        print(
            f"{Fore.CYAN}{spaces_arrow}--> {Fore.BLUE}{file.name}:{len(file.lines) + 1}:0")
        print(f"{Fore.CYAN}{len(file.lines) + 1} |")
        print(f"{spaces}{Fore.RED}{Style.BRIGHT}^{Style.RESET_ALL}")
        exit()
    spaces = " " * (len(str(e.line) + " |") + 1) + " " * (e.column - 1)
    spaces_arrow = " " * (len(str(e.line) + " |") - 3)
    formatted_chars = ", ".join(e.allowed)
    print(
        f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}: Invalid syntax, expected: [{formatted_chars}]")
    print(f"{Fore.CYAN}{spaces_arrow}--> {Fore.BLUE}{file.name}:{e.line}:{e.column}")
    print(f"{Fore.CYAN}{e.line} |{Style.RESET_ALL} {file.get_line(e.line)}")
    print(f"{spaces}{Fore.RED}{Style.BRIGHT}^{Style.RESET_ALL}")
    exit()
