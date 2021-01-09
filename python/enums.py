from type import NType

class EnumType(NType):
	def __init__(self, name, variants=[]):
		super(NGenericType, self).__init__(name)
		self.variants = variants

class EnumValue:
	def __init__(self, variant, values=[]):
		self.variant = variant
		self.values = values

	def __repr__(self):
		return '<%s %s>' % (self.variant, ' '.join(repr(value) for value in self.values))

	@classmethod
	def construct(Self, variant):
		return lambda *values: Self(variant, values)

class EnumPattern:
	def __init__(self, variant, patterns=[]):
		self.variant = variant
		self.patterns = patterns
