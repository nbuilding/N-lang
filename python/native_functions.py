import math
import lark

from function import Function
from type_check_error import display_type
from type import NGenericType, NListType, n_list_type

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

def item_at(index, lis):
	try:
		return lis[index]
	except:
		raise SyntaxError("index %s not in list %s" % (index, lis))

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
	global_scope.add_native_function(
		"itemAt",
		[("index", "int"), ("list", [lark.Token("LIST", "list"), NGenericType("t")])],
		"t",
		item_at
	)

	global_scope.types['str'] = 'str'
	global_scope.types['char'] = 'char'
	global_scope.types['int'] = 'int'
	global_scope.types['float'] = 'float'
	global_scope.types['bool'] = 'bool'
	global_scope.types['list'] = n_list_type
