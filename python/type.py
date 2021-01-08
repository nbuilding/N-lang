class NType:
	def __init__(self, name):
		self.name = name

class NGenericType(NType):
	def __init__(self, name):
		super(NGenericType, self).__init__(name)

def apply_generics(expected, actual, generics={}):
	pass
