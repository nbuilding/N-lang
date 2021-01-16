import math
import lark

from variable import Variable
from function import Function
from type_check_error import display_type
from type import NGenericType
from enums import EnumType, EnumValue
from native_types import n_list_type, n_cmd_type, n_maybe_type, maybe_generic, none, yes

def substr(start, end, string):
	return string[start:end]

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
	except TypeError:
		return len(str(string))

def type_display(o):
	if type(o) == Function:
		return str(o)
	return type(o).__name__

def with_default(default_value, maybe_value):
	if maybe_value.variant == "yes":
		return maybe_value.values[0]
	else:
		return default_value

def cmd_then(n_function, cmd):
	async def then(result):
		return (await n_function.run([result])).eval
	return cmd.then(then)

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
		"split",
		[("splitter", "char"), ("string", "str")],
		(lark.Token("LIST", "list"), "str"),
		lambda string, splitter: string.split(splitter)
	)
	global_scope.add_native_function(
		"strip",
		[("string", "str")],
		"str",
		lambda string: string.strip()
	)
	global_scope.add_native_function(
		"type",
		[("obj", NGenericType("t"))],
		"str",
		type_display,
	)
	item_at_generic = NGenericType("t")
	global_scope.add_native_function(
		"itemAt",
		[("index", "int"), ("list", n_list_type.with_typevars([item_at_generic]))],
		n_maybe_type.with_typevars([item_at_generic]),
		item_at
	)
	yes_generic = NGenericType("t")
	global_scope.add_native_function(
		"yes",
		[("value", n_maybe_type.with_typevars([yes_generic]))],
		yes_generic,
		yes,
	)
	default_generic = NGenericType("t")
	global_scope.add_native_function(
		"default",
		[("default", default_generic), ("maybeValue", n_maybe_type.with_typevars([default_generic]))],
		default_generic,
		with_default,
	)
	map_generic_in = NGenericType("a")
	map_generic_out = NGenericType("b")
	global_scope.add_native_function(
		"then",
		[("thenFunction", (map_generic_in, n_cmd_type.with_typevars([map_generic_out]))), ("cmd", n_cmd_type.with_typevars([map_generic_in]))],
		n_cmd_type.with_typevars([map_generic_out]),
		cmd_then,
	)

	global_scope.types['str'] = 'str'
	global_scope.types['char'] = 'char'
	global_scope.types['int'] = 'int'
	global_scope.types['float'] = 'float'
	global_scope.types['bool'] = 'bool'
	global_scope.types['list'] = n_list_type
	global_scope.types['cmd'] = n_cmd_type
	global_scope.types['maybe'] = n_maybe_type
