import re
from impdata import *

special = ["true", "false", "null"]

# Init classes for things
class VariableValue:
	def __init__(self, varname):
		self.varname = varname

class ImportDeclaration:
	def __init__(self, line, importname):
		self.line = line
		self.importname = importname

class FunctionDeclaration:
	def __init__(self, start, end, args, name):
		self.start = start
		self.end = end
		self.args = args
		self.name = name
		self.body = []

class ReturnStatement:
	def __init__(self, line, value):
		self.line = line
		self.value = value

class PrintStatement:
	def __init__(self, line, value):
		self.line = line
		self.value = value

class CallToFunction:
	def __init__(self, line, name, args):
		self.line = line
		self.name = name
		self.args = args

class BooleanString:
	def __init__(self, line, boolean):
		self.line = line
		self.boolean = boolean

class IfStatement:
	def __init__(self, line, boolean, statement):
		self.line = line
		self.boolean = boolean
		self.statement = statement

class ExitCommand:
	def __init__(self, line, code):
		self.line = line
		self.code = code

class ImportedCommand:
	def __init__(self, line, library, command, args):
		self.line = line
		self.library = library
		self.command = command
		self.args = args

class VariableDeclaration:
	def __init__(self, line, t, name, value):
		self.line = line
		self.type = t
		self.name = name
		self.value = value

imports = []

def findQuotes(s):
	out = []
	for i,char in enumerate(s.replace("\\\"", "ee")):
		if char == "\"":
			if len(out) == 0:
				out.append([i])
			elif len(out[len(out)-1]) == 1:
				out[len(out)-1].append(i)
			else:
				out.append([i])

	return out


def inQuotes(l, q):
	for i in q:
		if l >= i[0] and l <= i[1]:
			return True

	return False

def sReplace(s, f, r):
	return re.sub(r'(' + f + r')(?=(?:[^"]|"[^"]*")*$)', r, s)

def cleanList(s):
	for i,l in enumerate(s):
		line = l.strip()
		# check for comments and remove them
		if ";" in line.replace("\\;", ""):
			line = line.replace("\\;", u"\ufffc").split(";")[0].replace(u"\ufffc", "\\;")

		# find the location of quotes
		quotes = findQuotes(line)

		# check for unbalanced quotes
		if line.replace("\\\"", u"\ufffc").count("\"") % 2 != 0:
			throwError(Error("Unmatched quote.", l + 1, quotes[len(quotes) - 1][0] + 1))

def parseLine(s, n):
	line = s.strip().replace("<", "return")
	if line.startswith("import "):
		try:
			imports.append(line[7:].strip())
			return ImportDeclaration(n, line[7:].strip())
		except:
			pass
		throwError(Error("Import name not found", n + 1, 7))
	if line.startswith("return"):
		if len(line) < 8:
			return ReturnStatement(n, "null")
		if line[7] == '$':
			return ReturnStatement(n, VariableValue(line[7:].strip()))
		else:
			return ReturnStatement(n, line[7:].strip())
	if line.startswith("> "):
		if len(s.split(" ")) == 1:
			throwError(Error("Function name not found", n + 1, 3))
		args = []
		if len(s.split(" ")) > 2:
			if (s.split(" ")[2].strip() != "()"):
				args = [line.strip() for line in re.search(r'\((.+)\)', "".join(s.split(" ")[2:])).group(0).strip("(").strip(")").split(",")]

		return FunctionDeclaration(n, -1, args, s.split(" ")[1].strip())
	if line.startswith("print "):
		try:
			return PrintStatement(n, line[6:])
		except:
			pass
		throwError(Error("Print value not found", n + 1, 6))
	if re.search(r'{(.+)}', line) != None:
		if re.search(r'{(.+)}', line.strip()).span()[0] == 0 and re.search(r'{(.+)}', line.strip()).span()[1] == len(line.strip()):
			if re.search(r'\((.+)\)', line) != None:
				return CallToFunction(n, [line.strip() for line in re.search(r'\((.+)\)', line).group(0).split(",")])
			else:
				return CallToFunction(n, line[1:line.find("(")].strip(), [])
	if line.split(" ")[0].strip() == "if":
		if re.search(r'\((.+)\)', line) == None:
			throwError(Error("Boolean not found", n + 1, 4))
		c = parseLine("".join(line.split(" ")[2:]), n)
		if c == None:
			throwError(Error("Not a valid command"), n + 1, len(line))

		return IfStatement(n, BooleanString(n, re.search(r'\((.+)\)', line).group(0).replace('&&', 'and').replace('||', 'or').replace('!', 'not ')), c)
	if line.startswith("exit"):
		if len(line.split(" ")) == 1:
			return ExitCommand(n, 0)
		else:
			try:
				return ExitCommand(int(line.split(" ")[1]))
			except:
				pass

			throwError("Not a valid exit code.", n + 1, 7)
	if line.startswith("int "):
		if len(line.split(" ")) != 3:
			throwError(Error("Value not found.", n + 1, 5))
		try:
			return VariableDeclaration(n, int, line.split(" ")[1].strip(), int(line.split(" ")[2].strip()))
		except:
			pass
		throwError(Error("Value not int.", n + 1, 5))
	if line.startswith("bool "):
		if len(line.split(" ")) != 3:
			throwError(Error("Value not found.", n + 1, 6))
		if line.split(" ")[2].strip() != "true" and line.split(" ")[2].strip() != "false":
			throwError(Error("Value not bool.", n + 1, 6))
		
		return VariableDeclaration(n, bool, line.split(" ")[1].strip(), line.split(" ")[2].strip() == "true")
	if line.startswith("str "):
		if len(line.split(" ")) < 3:
			throwError(Error("Value not found.", n + 1, 5))
		if not '"' in line or re.search(r'"([A-Za-z0-9_\./\\-]*)"', ''.join(line.split(" ")[2:])) == None:
			throwError(Error("Value not String.", n + 1, 5))
		return VariableDeclaration(n, str, line.split(" ")[1].strip(), re.search(r'"([A-Za-z0-9_\./\\-]*)"', ''.join(line.split(" ")[2:]).replace("\\\"", u"\ufffc")).group(0).replace(u"\ufffc", "\\\""))

	for imp in imports:
		if line.startswith(imp + "."):
			if len(line.split(" ")) == 1:
				return ImportedCommand(n, line.strip().split(".")[0], line.strip().split(".")[1], [])
			else:
				return ImportedCommand(n, line.strip().split(".")[0], line.strip().split(".")[1].split(" ")[0], line.split(" ")[1:])





def createAST(s):
	ast = {
		"type": "Program",
		"start": 0,
		"end": len(s.split("\n")) -1,
		"body": []
	}
	clean = cleanList(s.split("\n"))
	body = ast["body"]
	stack = []
	for i,line in enumerate(s.split("\n")):
		c = parseLine(line, i)
		if c != None:
			body.append(c)

		if line.startswith("> "):
			stack.append(body)
			body = body[-1].body

		if line.startswith("<"):
			works = True
			try:
				body = stack.pop()
				body[-1].end = i
			except:
				works = False
			if not works:
				throwError(Error("End of function without matching begining.", i, 1))

	return ast


