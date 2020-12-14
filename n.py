import re
import rstr

# get lines, strip, and remove any emtpy lines
lines = []
with open("run.n", "r") as f:
	lines = [line.strip() for line in f.readlines()]
	lines = list(filter(None, lines))

print(lines)

# linenumber, useful because it will be changed by sendt
linenumb = 0

end = False

while True:
	try:
		line = lines[linenumb]
	except:
		end = True

	if end:
		exit()
	# check for comments and remove them
	if ";" in line.replace("\\;", ""):
		line = line.replace("\\;", u"\ufffc").split(";")[0].replace(u"\ufffc", "\\;")

	print(line)

	linenumb += 1
