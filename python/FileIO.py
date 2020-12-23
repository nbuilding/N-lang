def write(args):
	with open(str(args[0])[1:-1], "w+") as f:
		f.write(''.join(args[1:])[1:-1])

def append(args):
	with open(str(args[0])[1:-1], "a+") as f:
		f.write(''.join(args[1:])[1:-1])

def read(args):
	with open(str(args[0])[1:-1], "r", encoding="utf-8") as f:
		return f.read()