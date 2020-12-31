from variable import Variable

class Function(Variable):
	def __init__(self, scope, arguments, returntype, codeblock):
		# Tuples represent function types. (a, b, c) represents a -> b -> c.
		types = tuple([ty for _, ty in arguments] + [returntype])
		super(Function, self).__init__(types, self)

		self.scope = scope
		self.arguments = arguments
		self.returntype = returntype
		self.codeblock = codeblock

	def run(self, arguments):
		scope = self.scope.new_scope(parent_function=self)
		for value, (arg_name, arg_type) in zip(arguments, self.arguments):
			scope.variables[arg_name] = Variable(arg_type, value)
		if len(arguments) < len(self.arguments):
			# Curry :o
			return Function(scope, self.arguments[len(arguments):], self.returntype, self.codeblock)
		for instruction in self.codeblock.children:
			exit, value = scope.eval_command(instruction)
			if exit:
				return value
