from variable import Variable
from type_check_error import display_type

class Function(Variable):
	def __init__(self, scope, arguments, returntype, codeblock, generics=[]):
		# Tuples represent function types. (a, b, c) represents a -> b -> c.
		types = tuple([ty for _, ty in arguments] + [returntype])
		super(Function, self).__init__(types, self)

		self.scope = scope
		self.arguments = arguments
		self.returntype = returntype
		self.codeblock = codeblock
		self.generics = generics

	def run(self, arguments):
		scope = self.scope.new_scope(parent_function=self)
		for value, (arg_pattern, _) in zip(arguments, self.arguments):
			scope.assign_to_pattern(arg_pattern, value)
		if len(arguments) < len(self.arguments):
			# Curry :o
			return Function(scope, self.arguments[len(arguments):], self.returntype, self.codeblock)
		for instruction in self.codeblock.children:
			exit, value = scope.eval_command(instruction)
			if exit:
				return value

	def __str__(self):
		return '<function %s>' % display_type(self.arguments, False)
