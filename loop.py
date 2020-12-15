import impdata

stack = []

def runCommand(c, l, d):
	if c.split(" ")[0] == "runf":
		if not c.split(" ")[1] in d.labels:
			impdata.throwError(impdata.Error("Label not found.", l + 1, 6))
		else:
			stack.append(l)
			return d.labels[c.split(" ")[1]]
	elif c.split(" ")[0] == "return":
		if stack == []:
			impdata.throwError(impdata.Error("Unable to return from empty stack.", l + 1, 8))
		return stack.pop()


	return -1