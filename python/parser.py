from lark import Lark
import sys
import lark

file = "run.n"
if len(sys.argv) > 1:
	file = ''.join(sys.argv[1:]) 

parse = ""
text = ""
with open("syntax.lark", "r") as f:
	parse = f.read()
with open(file, "r") as f:
	text = f.read()

n_parser = Lark(parse, start='start')

try:
	print(n_parser.parse(text).pretty())
	print(n_parser.parse(text))
except lark.exceptions.UnexpectedCharacters as e:
	print(e.get_context(text)[0:-2])