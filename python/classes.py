class NClass:
	def __init__(self, name, types, values, constructors, public=False):
		self.name = name
		self.types = types
		self.values = values
		self.constructors = constructors
		self.public = public

	def call_constructor(self, *args):
		pass
		# Calls contructor and returns a record of values and things

class NConstructor:
	def __init__(self, args, instructions):
		self.args = args
		self.instructions = instructions