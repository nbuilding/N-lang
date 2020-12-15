class SysInfo:
	def __init__(self, labels):
		self.labels = labels

class Error:
	def __init__(self, message, linenumber, char):
		self.message = message
		self.linenumber = linenumber
		self.char = char

def throwError(e):
	print("Error at: " + str(e.linenumber) + ", " + str(e.char) + ": " + e.message)
	exit()