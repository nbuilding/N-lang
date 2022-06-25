try:
    import lark
    import asyncio
    import sys
    import signal
    import argparse
    import os

    from os import path
    from colorama import init, Fore, Style
    from sys import exit, platform
    import requests
    from lark import Lark

    import stack_trace

    from syntax_error import format_error
    from ncmd import Cmd
    from imported_error import ImportedError
    from scope import Scope
    from type_check_error import TypeCheckError
    from native_functions import add_funcs
    from parse import n_parser
    from file import File

    init()

    VERSION = "N v0.0.2"
except KeyboardInterrupt:
    exit()

def type_check(global_scope, file, tree, check):
    errors = ""

    scope = global_scope.new_scope(inherit_errors=False)
    if tree.data == "start":
        for child in tree.children:
            scope.type_check_command(child)
    else:
        scope.errors.append(
            TypeCheckError(
                tree, "Internal issue: I cannot type check from a non-starting branch."
            )
        )

    if len(scope.errors) > 0 or check:
        errors = "\n".join(
            [warning.display("warning", file) for warning in scope.warnings]
            + [error.display("error", file) for error in scope.errors]
        )

    error_len = 0

    for error in scope.errors:
        if isinstance(error, ImportedError):
            error_len += len(error)
        else:
            error_len += 1

    warning_len = 0

    for warning in scope.warnings:
        if isinstance(warning, ImportedError):
            warning_len += len(warning)
        else:
            warning_len += 1

    global_scope.unit_tests = scope.unit_tests[:]

    return (errors, error_len, warning_len)


async def parse_tree(global_scope, tree, file):
    if tree.data == "start":
        scope = global_scope.new_scope()
        for child in tree.children:
            scope.stack_trace.append(
                (child,
                file)
            )
            await scope.eval_command(child)
            scope.stack_trace.pop()
        for variable in reversed(scope.variables.values()):
            if variable.public and isinstance(variable.value, Cmd):
                await variable.value.eval()
                break
        global_scope.stack_trace = scope.stack_trace[:]
    else:
        raise SyntaxError("Unable to run parse_tree on non-starting branch")


def run_file(filename, check=False):
    """
    Executes the N file at the given file path. Returns a human-readable string
    if there was an error or None if everything went well.
    """

    file = None

    try:
        with open(filename, "r", encoding="utf-8") as f:
            file = File(f)
    except:
        print((Fore.RED + "Error" + Fore.RESET + ": Unable to read file " + Fore.YELLOW + "%s" + Fore.RESET) % filename)
        exit()

    file_path = path.abspath(filename)
    global_scope = Scope(base_path=path.dirname(file_path), file_path=file_path)
    add_funcs(global_scope)

    try:
        tree = file.parse(n_parser)
    except lark.exceptions.UnexpectedCharacters as e:
        return format_error(e, file)
    except lark.exceptions.UnexpectedEOF as e:
        return format_error(e, file)

    try:
        errors, error_count, warning_count = type_check(global_scope, file, tree, check)
    except Exception as err:
        debug = os.environ.get("N_ST_DEBUG") == "dev"
        if debug:
            raise err
        return stack_trace.display(global_scope.stack_trace, False)

    if error_count > 0 or check:
        error_s = ""
        warning_s = ""
        if error_count != 1:
            error_s = "s"
        if warning_count != 1:
            warning_s = "s"
        return f"{errors}\n{Fore.BLUE}Ran with {Fore.RED}{error_count} error{error_s}{Fore.BLUE} and {Fore.YELLOW}{warning_count} warning{warning_s}{Fore.BLUE}.{Style.RESET_ALL}"

    try:
        asyncio.get_event_loop().run_until_complete(parse_tree(global_scope, tree, file))
        return global_scope
    except Exception as err:
        debug = os.environ.get("N_ST_DEBUG") == "dev"
        if debug:
            raise err
        return stack_trace.display(global_scope.stack_trace)


if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser(
            description="Allows to only show warnings and errors, choose the file location, see the newest version of N, check the version of N, and update N to the newest version."
        )
        parser.add_argument(
            "--file",
            type=str,
            default="run.n",
            help="The file to read. (optional. if not included, it'll just run run.n)",
        )
        parser.add_argument(
            "--check",
            action="store_true",
            help="This goes through the file and prints out the errors and warnings without running it.",
        )
        parser.add_argument(
            "--newest", action="store_true", help="Shows the newest version of N."
        )
        parser.add_argument(
            "--version",
            action="store_true",
            help="Shows the current version of N installed.",
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="This updates to the newest version of N if you are behind.",
        )

        args = parser.parse_args()

        if args.version:
            print(VERSION)
            exit()

        if args.update:
            response = requests.get(
                "https://api.github.com/repos/nbuilding/N-Lang/releases/latest"
            )
            if VERSION == response.json()["name"]:
                print("You already have the newest version.")
                exit()
            print("Newer version detected: " + response.json()["name"])
            if input("Are you sure you want to update? [y/n] ").lower() != "y":
                print("Aborting...")
                exit()
            print("Installing...")
            if platform == "win32":
                os.system(
                    'PowerShell.exe -command "iwr https://github.com/nbuilding/N-lang/raw/main/install.ps1 -useb | iex"'
                )
                exit()
            elif platform == "darwin":
                os.system(
                    "curl -fsSL https://github.com/nbuilding/N-lang/raw/main/install.sh | sh"
                )
                exit()
            print("You are on an unsupported OS.")

        if args.newest:
            response = requests.get(
                "https://api.github.com/repos/nbuilding/N-Lang/releases/latest"
            )
            print(response.json()["name"])
            exit()

        errors = run_file(args.file, args.check)
        if not isinstance(errors, Scope):
            print(errors)
    except KeyboardInterrupt:
        exit()
