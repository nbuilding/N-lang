from lark import Lark

parse = ""
text = ""
with open("syntax.lark", "r") as f:
	parse = f.read()
with open("run.n", "r") as f:
	text = f.read()

n_parser = Lark(parse, start='start')

print(n_parser.parse(text).pretty())
print(n_parser.parse(text))