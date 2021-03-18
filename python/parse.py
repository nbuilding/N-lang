import sys
from os import path

from lark import Lark
import lark

# https://stackoverflow.com/a/4381638
basepath = ""
if getattr(sys, "frozen", False):
	basepath = path.dirname(sys.executable)
elif __file__:
	basepath = path.dirname(__file__)

syntaxpath = path.join(basepath, "syntax.lark")
with open(syntaxpath, "r") as f:
	parse = f.read()

n_parser = Lark(parse, start="start", propagate_positions=True)
