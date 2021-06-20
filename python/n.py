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

parser = argparse.ArgumentParser(
    description="Allows to only show warnings and choose the file location"
)
parser.add_argument(
    "--file",
    type=str,
    default="run.n",
    help="The file to read. (optional. if not included, it'll just run run.n)",
)
parser.add_argument("--check", action="store_true")
parser.add_argument("--newest", action="store_true")
parser.add_argument("--version", action="store_true")
parser.add_argument("--update", action="store_true")

args = parser.parse_args()

VERSION = "N v1.3.0"

if args.version:
    print(VERSION)
    exit()

if args.update:
    response = requests.get("https://api.github.com/repos/nbuilding/N-Lang/releases/latest")
    if VERSION == response.json()["name"]:
        print("You already have the newest version.")
        exit()
    print("Newer version detected: " + response.json()["name"])
    if input("Are you sure you want to update? [y/n] ").lower() != "y":
        print("Aborting...")
        exit()
    print("Installing...")
    if platform == "win32":
        os.system("PowerShell.exe -command \"iwr https://github.com/nbuilding/N-lang/raw/main/install.ps1 -useb | iex\"")
        exit()
    elif platform == "darwin":
        os.system("curl -fsSL https://github.com/nbuilding/N-lang/raw/main/install.sh | sh")
        exit()
    print("You are on an unsupported OS.")

if args.newest:
	response = requests.get("https://api.github.com/repos/nbuilding/N-Lang/releases/latest")
	print(response.json()["name"])
	exit()

filename = args.file

with open(filename, "r", encoding="utf-8") as f:
    file = File(f)

file_path = path.abspath(filename)
global_scope = Scope(base_path=path.dirname(file_path), file_path=file_path)
add_funcs(global_scope)


def type_check(file, tree):
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

    if len(scope.errors) > 0 or args.check:
        print(
            "\n".join(
                [warning.display("warning", file) for warning in scope.warnings]
                + [error.display("error", file) for error in scope.errors]
            )
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
    eefreer.aasdf()
    return (error_len, warning_len)


async def parse_tree(tree):
    if tree.data == "start":
        scope = global_scope.new_scope()
        for child in tree.children:
            await scope.eval_command(child)
        for variable in reversed(scope.variables.values()):
            if variable.public and isinstance(variable.value, Cmd):
                await variable.value.eval()
                break
    else:
        raise SyntaxError("Unable to run parse_tree on non-starting branch")


try:
    tree = file.parse(n_parser)
except lark.exceptions.UnexpectedCharacters as e:
    format_error(e, file)
except lark.exceptions.UnexpectedEOF as e:
    format_error(e, file)

try:
    error_count, warning_count = type_check(file, tree)
except Exception as err:
    debug = os.environ.get("N_ST_DEBUG") == "dev"
    if(debug):
        raise err
    stack_trace.display(global_scope.stack_trace)
    exit()

if error_count > 0 or args.check:
    error_s = ""
    warning_s = ""
    if error_count != 1:
        error_s = "s"
    if warning_count != 1:
        warning_s = "s"
    print(
        f"{Fore.BLUE}Ran with {Fore.RED}{error_count} error{error_s}{Fore.BLUE} and {Fore.YELLOW}{warning_count} warning{warning_s}{Fore.BLUE}.{Style.RESET_ALL}"
    )
    exit()

if __name__ == "__main__":
    # https://github.com/aio-libs/aiohttp/issues/4324#issuecomment-676675779
    asyncio.get_event_loop().run_until_complete(parse_tree(tree))
