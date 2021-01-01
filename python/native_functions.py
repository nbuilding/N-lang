import math

from scope import Scope

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
			
def type_check(o):
	if isinstance(n_type, str):
		return n_type
	elif isinstance(n_type, tuple):
		return ' -> '.join(n_type)
	elif isinstance(n_type, list):
		if(type(n_type[0]) == lark.Token):
			if (n_type[0].type == "LIST"):
				# try catch for empty list stuff
				try:
					return 'list[' + display_type(n_type[1]) + Fore.YELLOW + ']'
				except:
					return 'list[]'
		return '(' + ', '.join(n_type) + ')'
	else:
		return '???'

# Define global functions/variables
global_scope = Scope()
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
	lambda obj: type_check(global_scope.type_check_expr(obj)),
)