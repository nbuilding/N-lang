import re
import functools
import importlib
from impdata import *
from ast import *


# get lines, strip, and remove any emtpy lines
tree = {}
with open("run.n", "r") as f:
	tree = createAST(f.read())


functions = {}

imports = []

variables = {}

stack = []

def runCommand(c):
	if type(c) == ImportDeclaration:
		works = True
		try:
			importlib.import_module(c.importname)
			imports.append(c.importname)
		except:
			works = False

		if not works:
			throwError(Error("Library not found", c.line + 1, 7))
	if type(c) == FunctionDeclaration:
		functions[c.name] = c
	if type(c) == ReturnStatement:
		if c.value == "null":
			return
		if c.value == "false":
			return False
		if c.value == "true":
			return True
		if type(c.value) == VariableValue:
			if not c.value.varname in variables:
				throwError(Error("Variable not found", c.line + 1, 1))

			return variables[c.value[1:]]
		if line.replace("\\\"", u"\ufffc").count("\"") == 2:
			if re.search(r'"([A-Za-z0-9_\./\\-]*)"', c.value) == None:
				return ""
			else:
				return re.search(r'"([A-Za-z0-9_\./\\-]*)"', c.value).group(0)
		else:
			works = True
			try:
				return int(c.value)
			except:
				works = False

			if not works:
				throwError("Unable to parse return value.", c.line, 1)
	if type(c) == PrintStatement:
		print(c.value.replace("\\\"", u"\ufffc").replace("\"", "").replace(u"\ufffc", "\\\""))
	if type(c) == CallToFunction:
		if not c.name in functions:
			throwError(Error("Function not found.", c.line + 1, 1))
		if len(c.args) != len(functions[c.name].args):
			throwError(Error("Function args not correct.", c.line + 1, 1))

		for i,arg in enumerate(functions[c.name].args):
			variables[arg] = c.args[i]

		for command in functions[c.name].body:
			runCommand(command)





for i,line in enumerate(tree["body"]):
	runCommand(line)