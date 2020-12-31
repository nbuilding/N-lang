from lark import Lark
import argparse
from colorama import init, Fore, Style
init()

from file import File
from native_functions import global_scope
from type_check_error import TypeCheckError

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
	scope = global_scope.new_scope()
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

def parse_tree(tree):
	if tree.data == "start":
		scope = global_scope.new_scope()
		for child in tree.children:
			scope.eval_command(child)
	else:
		raise SyntaxError("Unable to run parse_tree on non-starting branch")

tree = file.parse(n_parser)
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
parse_tree(tree)
