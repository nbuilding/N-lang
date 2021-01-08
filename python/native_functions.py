import math

from function import Function
from type_check_error import display_type
from type import NGenericType

def substr(start, end, string):
	try:
		return string[start:end]
	except:
		return ""

def char_at(index, string):
	try:
		return string[index]
	except:
		return ""

def length(string):
	try:
		return len(string)
	except:
		try:
			return len(str(string))
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
		str,
	)

	global_scope.add_native_function(
		"round",
		[("number", "float")],
		"int",
		round,
	)
	global_scope.add_native_function(
		"floor",
		[("number", "float")],
		"int",
		math.floor,
	)
	global_scope.add_native_function(
		"ceil",
		[("number", "float")],
		"int",
		math.ceil,
	)
	global_scope.add_native_function(
		"charCode",
		[("character", "char")],
		"int",
		ord,
	)
	global_scope.add_native_function(
		"intCode",
		[("number", "int")],
		"char",
		chr,
	)
	global_scope.add_native_function(
		"charAt",
		[("location", "int"), ("string", "str")],
		"char",
		char_at,
	)
	global_scope.add_native_function(
		"substring",
		[("start", "int"), ("end", "int"), ("string", "str")],
		"char",
		substr,
	)
	global_scope.add_native_function(
		"len",
		[("obj", NGenericType("t"))],
		"int",
		length,
	)
	global_scope.add_native_function(
		"type",
		[("obj", NGenericType("t"))],
		"str",
		type_display,
	)

	global_scope.types['str'] = 'str'
	global_scope.types['char'] = 'char'
	global_scope.types['int'] = 'int'
	global_scope.types['float'] = 'float'
	global_scope.types['bool'] = 'bool'
