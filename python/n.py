from lark import Lark
import lark
import asyncio
import sys
import signal
import argparse
from os import path
from colorama import init, Fore, Style
from sys import exit
init()

from file import File
from native_functions import add_funcs
from type_check_error import TypeCheckError
from scope import Scope
from imported_error import ImportedError
from cmd import Cmd
from syntax_error import format_error

# https://stackoverflow.com/a/4381638
basepath = ""
if getattr(sys, 'frozen', False):
    basepath = path.dirname(sys.executable)
elif __file__:
    basepath = path.dirname(__file__)

syntaxpath = path.join(basepath, "syntax.lark")
with open(syntaxpath, "r") as f:
	parse = f.read()
n_parser = Lark(parse, start="start", propagate_positions=True)

parser = argparse.ArgumentParser(description='Allows to only show warnings and choose the file location')
parser.add_argument('--file', type=str, default="run.n", help="The file to read. (optional. if not included, it'll just run run.n)")
parser.add_argument('--check', action='store_true')

args = parser.parse_args()

filename = args.file

with open(filename, "r") as f:
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
		scope.errors.append(TypeCheckError(tree, "Internal issue: I cannot type check from a non-starting branch."))

	if len(scope.errors) > 0 or args.check:
		print('\n'.join(
			[warning.display('warning', file) for warning in scope.warnings] +
			[error.display('error', file) for error in scope.errors]
		))

	return (len(scope.errors), len(scope.warnings))

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

error_count, warning_count = type_check(file, tree)
if error_count > 0 or args.check:
	error_s = ""
	warning_s = ""
	if error_count != 1:
		error_s = "s"
	if warning_count != 1:
		warning_s = "s"
	print(f"{Fore.BLUE}Ran with {Fore.RED}{error_count} error{error_s}{Fore.BLUE} and {Fore.YELLOW}{warning_count} warning{warning_s}{Fore.BLUE}.{Style.RESET_ALL}")
	exit()

if __name__ == '__main__':
	# https://github.com/pyinstaller/pyinstaller/wiki/Recipe-Multiprocessing
	# See #70
	multiprocessing.freeze_support()
	# https://github.com/aio-libs/aiohttp/issues/4324#issuecomment-676675779
	asyncio.get_event_loop().run_until_complete(parse_tree(tree))
