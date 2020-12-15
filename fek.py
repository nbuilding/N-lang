import re

def init():
	pass

def runCommand(c, l):
	if c.split(" ")[0] == "paer":
		print(re.search(r'"([A-Za-z0-9_\./\\-]*)"', ''.join(c.split(" ")[1:len(c.split(" "))]).replace("\\\"", u"\ufffc")).group(0).strip("\"").replace(u"\ufffc", "\""))
		return l

	return -1