import inspect

"""
An immutable class representing a command, which is anything that has a side
effect or is asynchronous.
"""
class Cmd:
	def __init__(self, performer_getter, map_functions=[], dependent=None):
		# A non-async function that, when given the result from `dependent`,
		# returns a function (can be async or not) that performs the side
		# effect. The function-returning function should ideally should be pure.
		self.performer_getter = performer_getter

		# Transform functions to perform on the resulting value
		self.map_functions = []

		# A Cmd that should be performed first before performing this command.
		# The result from this Cmd will be passed to `performer_getter` for this
		# Cmd's command.
		self.dependent = dependent

	def map(self, function):
		return type(self)(self.performer_getter, map_functions=[*self.map_functions, function], dependent=self.dependent)

	def then(self, then_command_getter):
		return type(self)(then_command_getter, dependent=self)

	async def eval(self):
		if self.dependent:
			result = await self.dependent.eval()
		else:
			result = ()
		for function in self.map_functions:
			result = function(result)
		performer = self.performer_getter(result)
		maybe_awaitable = performer()
		if inspect.isawaitable(maybe_awaitable):
			return await maybe_awaitable
		else:
			return maybe_awaitable

	def __repr__(self):
		return 'Cmd(%s, map_functions=%s, dependent=%s)' % (repr(self.performer_getter), repr(self.map_functions), repr(self.dependent))
