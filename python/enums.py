from type import NTypeVars

class EnumType(NTypeVars):
	def __init__(self, name, variants, typevars=[], original=None):
		super(EnumType, self).__init__(name, typevars, original=original)
		self.variants = variants

	def get_types(self, variant_name):
		for variant, types in self.variants:
			if variant == variant_name:
				return types
		return None

	def new_child(self, typevars):
		return type(self)(self.name, self.variants, typevars, original=self.base_type)

class EnumValue:
	def __init__(self, variant, values=[]):
		self.variant = variant
		self.values = values

	def __repr__(self):
		return '<' + self.variant + ''.join(' ' + repr(value) for value in self.values) + '>'

	def __eq__(self, other):
		return self.variant == other.variant and self.values == other.values

	@classmethod
	def construct(cls, variant):
		return lambda *values: cls(variant, values)

class EnumPattern:
	def __init__(self, variant, patterns=[]):
		self.variant = variant
		self.patterns = patterns
