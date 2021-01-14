from function import Function
from type_check_error import display_type
from native_types import n_cmd_type, Cmd

class NativeFunction(Function):
	def __init__(self, scope, arguments, return_type, function, argument_cache=[]):
		super(NativeFunction, self).__init__(scope, arguments, return_type, None)
		self.function = function
		self.argument_cache = argument_cache

	def run(self, arguments):
		arguments = self.argument_cache + arguments
		if len(arguments) < len(self.arguments):
			return NativeFunction(self.scope, self.arguments, self.returntype, self.function, argument_cache=self.argument_cache + arguments)
		return self.function(*arguments)

	def __str__(self):
		return display_type(self.arguments, False)

	@classmethod
	def from_imported(cls, scope, types, function):
		*arg_types, return_type = types
		if return_type.base_type is n_cmd_type:
			function = lambda *args: Cmd(lambda: function(*args))
		return cls(scope, [("whatever", typ) for typ in arg_types], return_type, function)
