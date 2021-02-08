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
basepath = path.dirname(sys.argv[0])
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
	errors = []
	warnings = []
	error_count = 0
	warning_count = 0
	if len(scope.errors) > 0 or args.check:
		# remove duplicate errors and warnings
		errors = []
		if len(scope.errors) > 0:
			errors = [scope.errors[0]]
			if type(errors[0]) == ImportedError:
				error_count = len(scope.errors[0].err)
			else:
				error_count = 1
			for i in range(1, len(scope.errors)):
				if not scope.errors[i-1].compare(scope.errors[i]):
					errors.append(scope.errors[i])
					if type(scope.errors[i]) == ImportedError:
						error_count += len(scope.errors[i].err)
					else:
						error_count += 1


		warnings = []
		if len(scope.warnings) > 0:
			warnings = [scope.warnings[0]]
			warning_count = 1
			for i in range(1, len(scope.warnings)):
				if not scope.warnings[i-1].compare(scope.warnings[i]):
					warnings.append(scope.warnings[i])
					if type(scope.warnings[i]) == ImportedError:
						warning_count += len(scope.warnings[i].err)
					else:
						warning_count += 1

		print('\n'.join(
			[warning.display('warning', file) for warning in warnings] +
			[error.display('error', file) for error in errors]
		))
	return (error_count, warning_count)

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

# https://github.com/aio-libs/aiohttp/issues/4324#issuecomment-676675779
asyncio.get_event_loop().run_until_complete(parse_tree(tree))
