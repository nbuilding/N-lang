import re
import functools
import importlib
from impdata import *


# get lines, strip, and remove any emtpy lines
lines = []
with open("run.n", "r") as f:
	lines = [line.strip() for line in f.readlines()]


end = False

labels = {}

imports = []

specialcom = ["sendt", "if", "import", "exit"]

# get the location of all quotes in te 
def findQuotes(s):
	out = []
	for i,char in enumerate(s.replace("\\\"", "ee")):
		if char == "\"":
			if len(out) == 0:
				out.append([i])
			elif len(out[len(out)-1]) == 1:
				out[len(out)-1].append(i)
			else:
				out.append([i])

	return out


def inQuotes(l, q):
	for i in q:
		if l >= i[0] and l <= i[1]:
			return True

	return False

def sReplace(s, f, r):
	return re.sub(r'(' + f + r')(?=(?:[^"]|"[^"]*")*$)', r, s)

def runCommand(c, l):
	for imp in imports:
		li = imp.runCommand(c, l, SysInfo(labels))

		if li != -1:
			return li

	return runBaseCommand(c, l)

def runBaseCommand(c, l):
	if c.split(" ")[0].strip() == "sendt":
		if not c.split(" ")[1] in labels:
			throwError(Error("Label not found.", l + 1, 7))
		else:
			return labels[c.split(" ")[1]]
	elif c.split(" ")[0].strip() == "exit":
		exit()
	elif c.split(" ")[0].strip() == "if":
		if re.search(r'\((.+)\)', c) == None:
			throwError(Error("Boolean not found", l, 4))
		if eval(re.search(r'\((.+)\)', c).group(0).replace('&&', 'and').replace('||', 'or').replace('!', 'not ')):
			return runCommand(c[re.search(r'\((.+)\)', c).span()[1] + 1 :].strip(), l)
	elif c.split(" ")[0].strip() == "import":
		works = True
		try:
			imports.append(importlib.import_module(c.split(" ")[1].strip()))
		except:
			works = False

		if not works:
			throwError(Error("Modlue not found", l + 1, 8))

		return l
	else:
		return l

for linenumb,line in enumerate(lines):
	if line != "":
		# check for comments and remove them
		if ";" in line.replace("\\;", ""):
			line = line.replace("\\;", u"\ufffc").split(";")[0].replace(u"\ufffc", "\\;")

		# do some pre processing before running commands

		# find the location of quotes
		quotes = findQuotes(line)

		# check for unbalanced quotes
		if not all([len(l) == 2 for l in quotes]):
			throwError(Error("Unmatched quote.", linenumb + 1, quotes[len(quotes) - 1][0] + 1))

		# check if line declares a label
		if line.startswith(">"):
			labels[line[1:].strip()] = linenumb


# linenumber, useful because it will be changed by sendt
linenumb = 0

while True:
	if linenumb >= len(lines):
		exit()
	line = lines[linenumb]


	if line != "" and not line.startswith(">"):
		linenumb = runCommand(line, linenumb)

				



	linenumb += 1
