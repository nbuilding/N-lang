from lark import Lark
import lark
import asyncio
import sys
# https://github.com/encode/httpx/issues/914#issuecomment-622586610
if sys.version_info[0] == 3 and sys.version_info[1] >= 8 and sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import argparse
from colorama import init, Fore, Style
init()

from file import File
from native_functions import add_funcs
from type_check_error import TypeCheckError
from scope import Scope
from imported_error import ImportedError
from cmd import Cmd

global_scope = Scope()
add_funcs(global_scope)

with open("syntax.lark", "r") as f:
	parse = f.read()
n_parser = Lark(parse, start="start", propagate_positions=True)

parser = argparse.ArgumentParser(description='Allows to only show warnings and choose the file location')
parser.add_argument('--file', type=str, default="run.n", help="The file to read. (optional. if not included, it'll just run run.n)")
parser.add_argument('--check', action='store_true')

args = parser.parse_args()

filename = args.file

with open(filename, "r") as f:
	file = File(f)

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

	for i,line in enumerate(file.lines):
		if e.get_context(file.get_text(), 99999999999999)[0:-2].strip() == line.strip():
			break


	spaces = " "*(len(str(i+1) + " |") +  1)
	spaces_arrow = " "*(len(str(i+1) + " |") - 3)
	print(f"{Fore.RED}{Style.BRIGHT}Error{Style.RESET_ALL}: Invalid syntax")
	print(f"{Fore.CYAN}{spaces_arrow}--> {Fore.BLUE}{file.name}:{i+1}")
	print(f"{Fore.CYAN}{i + 1} |{Style.RESET_ALL} {e.get_context(file.get_text(), 99999999999999)[0:-2].strip()}")
	print(f"{spaces}{Fore.RED}{Style.BRIGHT}^{Style.RESET_ALL}")
	exit()

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

asyncio.run(parse_tree(tree))
