from colorama import Fore, Style


def display(stack_trace, runtime=True):
    if not runtime:
        return 'An unexpected error occured! Please open an issue on GitHub https://github.com/nbuilding/N-Lang/issues. Set N_ST_DEBUG to "dev" to see the python stack trace.'
    output = "An unexpected error occured! Please open an issue on GitHub https://github.com/nbuilding/N-Lang/issues. Printing out stack trace:\n"
    for trace in stack_trace:
        area, file = trace
        spaces = " " * (len(str(area.line + 1) + " |") - 3)
        output += f"{Fore.CYAN}{spaces}--> {Fore.BLUE}{file.name}:{area.line}{Style.RESET_ALL}\n"
        output += (
            file.display(
                area.line,
                area.column,
                area.end_line,
                area.end_column,
                underline=False,
            )
            + "\n"
        )
    return output
