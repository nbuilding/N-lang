import unittest
from os import walk, path
import re

from parse import n_parser, basepath

class SyntaxTestCases(unittest.TestCase):
	pass

# Get files in directory https://stackoverflow.com/a/3207973
_, _, file_names = next(walk(path.join(basepath, "../tests/syntax/")))
for file_name in file_names:
	if not file_name.endswith('.n'):
		continue
	file_path = path.join(basepath, "../tests/syntax/", file_name)
	def test_method(self):
		with open(file_path, "r") as file:
			parts = re.split(r"(\r?\n){3}", file.read())
			tree, *other_trees = [n_parser.parse(part) for part in parts]
			for other_tree in other_trees:
				self.assertEqual(tree, other_tree)
	# Dynamically add methods to the class https://stackoverflow.com/a/17930262
	setattr(SyntaxTestCases, 'test_' + re.sub(r"\W", '_', file_name[0:-2]), test_method)

if __name__ == "__main__":
    unittest.main()
