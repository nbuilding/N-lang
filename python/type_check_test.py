# python -m unittest parse_test.py

import unittest
from os import walk, path
import re

from n import run_file
from parse import basepath


class AssertionTestCases(unittest.TestCase):
    @classmethod
    def add_assertion_test_case(cls, file_name):
        file_path = path.join(basepath, "../tests/assertions/", file_name)

        def test_method(self):
            errors = run_file(file_path)
            if errors is not None:
                raise Exception(errors)

        # Dynamically add methods to the class
        # https://stackoverflow.com/a/17930262
        setattr(cls, "test_" + re.sub(r"\W", "_", file_name[0:-2]), test_method)


# Get files in directory https://stackoverflow.com/a/3207973
_, _, file_names = next(walk(path.join(basepath, "../tests/assertions/")))
for file_name in file_names:
    if not file_name.endswith(".n"):
        continue
    SyntaxTestCases.add_assertion_test_case(file_name)

if __name__ == "__main__":
    unittest.main()
