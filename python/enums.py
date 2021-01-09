from type import NType

class EnumType(NType):
	def __init__(self, name, variants=[]):
		super(EnumType, self).__init__(name)
		self.variants = variants

	def get_types(self, variant_name):
		for variant, types in self.variants:
			if variant == variant_name:
				return types
		return None

class EnumValue:
	def __init__(self, variant, values=[]):
		self.variant = variant
		self.values = values

	def __repr__(self):
		return '<%s %s>' % (self.variant, ' '.join(repr(value) for value in self.values))

	@classmethod
	def construct(cls, variant):
		return lambda *values: cls(variant, values)

class EnumPattern:
	def __init__(self, variant, patterns=[]):
		self.variant = variant
		self.patterns = patterns
