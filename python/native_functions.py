import math
import lark

from variable import Variable
from function import Function
from type_check_error import display_type
from type import NGenericType, NListType, n_list_type
from enums import EnumType, EnumValue

maybe_generic = NGenericType("t")
n_maybe_type = EnumType("maybe", [
	("yes", [maybe_generic]),
	("none", []),
], [maybe_generic])
none = EnumValue("none")
def yes(value):
	return EnumValue("yes", [value])

def substr(start, end, string):
	try:
		return string[start:end]
	except:
		return ""

def char_at(index, string):
	if index < 0 or index >= len(string):
		return none
	else:
		return yes(string[index])

def item_at(index, lis):
	if index < 0 or index >= len(lis):
		return none
	else:
		return yes(lis[index])

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

def with_default(default_value, maybe_value):
	if maybe_value.variant == "yes":
		return maybe_value.values[0]
	else:
		return default_value

# Define global functions/variables
def add_funcs(global_scope):
	global_scope.variables["none"] = Variable(n_maybe_type, none)

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
		n_maybe_type.with_typevars(["char"]),
		char_at,
	)
	global_scope.add_native_function(
		"substring",
		[("start", "int"), ("end", "int"), ("string", "str")],
		"str",
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
	generic = NGenericType("t")
	global_scope.add_native_function(
		"itemAt",
		[("index", "int"), ("list", n_list_type.with_typevars([generic]))],
		n_maybe_type.with_typevars([generic]),
		item_at
	)
	global_scope.add_native_function(
		"yes",
		[("value", maybe_generic)],
		n_maybe_type,
		yes,
	)
	global_scope.add_native_function(
		"default",
		[("default", maybe_generic), ("maybeValue", n_maybe_type)],
		maybe_generic,
		with_default,
	)

	global_scope.types['str'] = 'str'
	global_scope.types['char'] = 'char'
	global_scope.types['int'] = 'int'
	global_scope.types['float'] = 'float'
	global_scope.types['bool'] = 'bool'
	global_scope.types['list'] = n_list_type
	global_scope.types['maybe'] = n_maybe_type
