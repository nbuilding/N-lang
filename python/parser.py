from lark import Lark
import sys

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

print(n_parser.parse(text).pretty())
print(n_parser.parse(text))
print(type(n_parser.parse(text)))