import asyncio
from variable import Variable
from ncmd import Cmd
from type_check_error import display_type


class Function(Variable):
    def __init__(self, scope, arguments, returntype, codeblock, generics=None, public=False):
        # Tuples represent function types. (a, b, c) represents a -> b -> c.
        types = tuple([ty for _, ty in arguments] + [returntype])
        if None in types:
            types = None
        super(Function, self).__init__(types, self, public)

        self.scope = scope
        self.arguments = arguments
        self.returntype = returntype
        self.codeblock = codeblock
        self.generics = generics or []

    async def run(self, arguments):
        # This function suddenly got so complicated because of async.
        loop = asyncio.get_running_loop()
        using_await_future = loop.create_future()
        cmd_resume_future = loop.create_future()
        scope = self.scope.new_scope(parent_function=(self, using_await_future, cmd_resume_future))

        for value, (arg_pattern, _) in zip(arguments, self.arguments):
            scope.assign_to_pattern(arg_pattern, value)
        if len(arguments) < len(self.arguments):
            # Curry :o
            return Function(scope, self.arguments[len(arguments):], self.returntype, self.codeblock)

        async def run_command():
            try:
                _, value = await scope.eval_command(self.codeblock)
                if not using_await_future.done():
                    using_await_future.set_result((False, value))
                return value
            except Exception as err:
                print("OMG AN ERROR ==>", err)
                using_await_future.set_exception(err)

        # Run eval_command in a parallel Task because the await operator might
        # block it.
        run_task = loop.create_task(run_command())
        # Wait until either the function encounters the await operator or it
        # finishes evalling.
        awaiting, value = await using_await_future

        if awaiting:
            async def continue_async():
                cmd_resume_future.set_result(True)
                return await run_task

            return Cmd(lambda _: continue_async)
        else:
            return value

    def __str__(self):
        return '<function %s>' % display_type(self.arguments, False)
