import math

from function import Function
from type_check_error import display_type

def substr(s, st, en):
	try:
		return s[st:en]
	except:
		return ""

def char_at(s, i):
	try:
		return s[i]
	except:
		return ""

def length(s):
	try:
		return len(s)
	except:
		try:
			return len(str(s))
		except:
			return 0
			
def type_display(o):
	if type(o) == Function:
		return str(o)
	return type(o).__name__


# Define global functions/variables
def add_funcs(global_scope):
	global_scope.add_native_function(
		"intInBase10",
		[("number", "int")],
		"str",
		lambda number: str(number),
	)

	global_scope.add_native_function(
		"round",
		[("number", "float")],
		"int",
		lambda number: round(number),
	)
	global_scope.add_native_function(
		"floor",
		[("number", "float")],
		"int",
		lambda number: math.floor(number),
	)
	global_scope.add_native_function(
		"ceil",
		[("number", "float")],
		"int",
		lambda number: math.ceil(number),
	)
	global_scope.add_native_function(
		"charCode",
		[("character", "char")],
		"int",
		lambda character: ord(character),
	)
	global_scope.add_native_function(
		"intCode",
		[("number", "int")],
		"char",
		lambda number: chr(number),
	)
	global_scope.add_native_function(
		"charAt",
		[("location", "int"), ("string", "str")],
		"char",
		lambda string, location: char_at(string, location),
	)
	global_scope.add_native_function(
		"substring",
		[("start", "int"), ("end", "int"), ("string", "str")],
		"char",
		lambda string, start, end: substr(string, start, end),
	)
	global_scope.add_native_function(
		"len",
		[("obj", "any")],
		"int",
		lambda obj: length(obj),
	)
	global_scope.add_native_function(
		"type",
		[("obj", "any")],
		"str",
		lambda obj: type_display(obj),
	)