import re
import functools
import importlib
from impdata import *
from lark import Lark
from lark import Transformer
from lark import tree
import lark

class Variable:
	def __init__(self, t, value):
		self.type = t
		self.value = value

class Function:
	def __init__(self, deccall, returntype, codeblock, deafultreturn):
		self.deccall = deccall
		self.returntype = returntype
		self.codeblock = codeblock
		self.deafultreturn = deafultreturn

parse = ""
text = ""
with open("syntax.lark", "r") as f:
	parse = f.read()
with open("run.n", "r") as f:
	text = f.read()

n_parser = Lark(parse, start='start')

print(n_parser.parse(text).pretty())

imports = []
variables = {}
functions = {}

def invBool(b, t):
	end = b
	for i in range(t):
		end = not end
	return end

def parseInfixOperator(i):
	#TODO: Fix parsing
	out = False
	children = i.children
	inversions = 0
	while children[inversions].data == "!":
		inversions += 1

	end = None
	if children[-1].data == "infix_operator":
		if len(children) == inversions + 2:
			return invBool(parseInfixOperator(children[-1]), inversions)
		end = parseInfixOperator(children[-1])

def runFunction(f, d):
	pass

def parseExpression(e):
	if type(e) == lark.Token:
		return e.value

	if e.data == "ifelse":
		infix, valif, other = e.children
		if (parseExpression(infix)):
			return parseExpression(valif.children[0])
		else:
			return parseExpression(other.children[0].children[0])
	elif e.data == "function_callback":
		data = e.children[0]
		return runFunction(functions[data.children[0]], data)
	elif e.data == "compare_expression":
		# compare_expression chains leftwards. It's rather complex because it
		# chains but doesn't accumulate a value unlike addition. Also, there's a
		# lot of comparison operators.
		# For example, (1 = 2) = 3 (in code as `1 = 2 = 3`).
		left, comparison, right = e.children
		if left.data == "compare_expression":
			# If left side is a comparison, it also needs to be true for the
			# entire expression to be true.
			if not parseExpression(left):
				return False
			# Use the left side's right value as the comparison value for this
			# comparison. For example, for `1 = 2 = 3`, where `1 = 2` is `left`,
			# we'll use `2`, which is `left`'s `right`.
			left = left.children[2]
		comparison = comparison.type
		if comparison == "EQUALS":
			return parseExpression(left) == parseExpression(right)
		elif comparison == "GORE":
			return parseExpression(left) >= parseExpression(right)
		elif comparison == "LORE":
			return parseExpression(left) <= parseExpression(right)
		elif comparison == "LESS":
			return parseExpression(left) < parseExpression(right)
		elif comparison == "GREATER":
			return parseExpression(left) > parseExpression(right)
		elif comparison == "NEQUALS" or comparison == "NEQUALS_QUIRKY":
			return parseExpression(left) != parseExpression(right)
		else:
			print("Unexpected operaton for compare_expression", comparison)
	elif e.data == "sum_expression":
		left, operation, right = e.children
		if operation.type == "ADD":
			return parseExpression(left) + parseExpression(right)
		elif operation.type == "SUBTRACT":
			return parseExpression(left) - parseExpression(right)
		else:
			print("Unexpected operaton for sum_expression", operation)
	elif e.data == "product_expression":
		left, operation, right = e.children
		if operation.type == "MULTIPLY":
			return parseExpression(left) * parseExpression(right)
		elif operation.type == "DIVIDE":
			return parseExpression(left) / parseExpression(right)
		elif operation.type == "ROUNDDIV":
			return parseExpression(left) // parseExpression(right)
		else:
			print("Unexpected operaton for product_expression", operation)
	elif e.data == "value":
		token = e.children[0]
		if token.type == 'NUMBER':
			return float(token)
		else:
			print("Unexpected value type", token)
	else:
		print('Unexpected expression type %s' % e.data)
		print(e)
		return e


def parseTree(t):
	if t.data == "start":
		for child in t.children:
			parseBranch(child)
	else:
		print("Unable to run parseTree on non-starting branch")
		exit()

def parseBranch(t):
	if t.data != "instruction":
		print("Command %s not implemented" % (t.data))
		exit()

	command = t.children[0]

	if command.data == "imp":
		imports.append(importlib.import_module(command.children[0]))
	elif command.data == "function_def":
		deccall, returntype, codeblock, defaultreturn = command.children
		functions[deccall.children[0]] = Function(deccall, returntype, codeblock, defaultreturn)
	elif command.data == "loop":
		times, var, code = command.children
		if var.children[1] != "int":
			print("Unable to iterate over type %s" % (var.children))
		for i in range(int(str(times))):
			variables[var.children[1]] = Variable("int", i)
			for child in code.children:
				parseBranch(child)
	elif command.data == "print":
		value = command.children[0].children[0]
		if value.data.startswith('"'):
			print(value[1:-1])
		else:
			a = parseExpression(value.children[0])
			# print(a)
	elif command.data == "return":
		return command.children[0]



parseTree(n_parser.parse(text))
