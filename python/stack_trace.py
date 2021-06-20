from colorama import Fore, Style

def display(stack_trace):
    output = "An unexpected error occured! Please open an issue on GitHub https://github.com/nbuilding/N-Lang/issues. Printing out stack trace:\nbuilding"
    for trace in stack_trace:
        area, file = trace

        spaces = " " * (len(str(area.line) + " |") - 1)
        output += f"{Fore.CYAN}--> {Fore.BLUE}{file.name}:{area.line}{Style.RESET_ALL}\n"
        output += file.display(
            area.line,
            area.column,
            area.end_line,
            area.end_column,
            underline=False,
        )
    print(output)