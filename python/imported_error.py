from file import File


class ImportedError:
    def __init__(self, err, file):
        self.err = err
        self.file = file.duplicate()

    def display(self, ty, unused_thing_to_match_type_check_error):
        return "\n".join([e.display(ty, self.file) for e in self.err])

    def compare(self, other):
        if not isinstance(other, ImportedError):
            return False

        return self.file == other.file

    def __len__(self):
    	value = 0
    	for error in self.err:
    		if isinstance(error, ImportedError):
    			value += len(error)
    		else:
    			value += 1

    	return value