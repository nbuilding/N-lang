class ImportedError:
	def __init__(self, err, file):
		self.err = err
		self.file = file

	def display(self, ty, unused_thing_to_match_type_check_error):
		return '\n'.join([e.display(ty, self.file) for e in self.err])