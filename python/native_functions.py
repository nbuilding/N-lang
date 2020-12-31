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
	lambda number: floor(number),
)
global_scope.add_native_function(
	"ceil",
	[("number", "float")],
	"int",
	lambda number: ceil(number),
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
	[("string", "str"), ("location", "int")],
	"char",
	lambda string, location: char_at(string, location),
)
global_scope.add_native_function(
	"substring",
	[("string", "str"), ("start", "int"), ("end", "int")],
	"char",
	lambda string, start, end: substr(string, start, end),
)
global_scope.add_native_function(
	"len",
	[("obj", "any")],
	"int",
	lambda obj: length(obj),
)
