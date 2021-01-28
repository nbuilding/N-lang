class NClass:
	def __init__(self, name, types, values, constructors):
		self.name = name
		self.types = types
		self.values = values
		self.constructors = constructors

	def call_constructor(self, *args):
		# Calls contructor and returns a record of values and things