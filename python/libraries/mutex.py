from asyncio import Future
from colorama import Fore, Style
from typing import Union

from function import Function
from native_types import n_cmd_type, n_maybe_type, yes, none, n_list_type
from ncmd import Cmd
from type import NTypeVars, NGenericType
from display import Printable, display_value


class Mutex(Printable):
    next_unlock: Union[Future, None]

    def __init__(self, value):
        self.value = value
        # If locked, then this will be set to a `Future` that is done when the
        # lock is lifted.
        self.next_unlock = Future()
        self.next_unlock.set_result(None)

    async def _request_unlock(self, old_future: Future, new_future: Future, callback):
        if old_future is not None:
            await old_future
        result = await callback()
        new_future.set_result(None)
        return result

    def request_unlock(self, callback):
        new_future = Future()
        coroutine = self._request_unlock(self.next_unlock, new_future, callback)
        self.next_unlock = new_future
        return coroutine

    def locked(self):
        return not self.next_unlock.done()

    def get_display(self, color=True, indent="\t", indent_state="", preferred_max_len=50):
        start = "<mutex"
        end = ">"
        if color:
            start = Fore.MAGENTA + start + Style.RESET_ALL
            end = Fore.MAGENTA + end + Style.RESET_ALL
        display_list, multiline = display_value(
            self.value, color=color, indent=indent, indent_state=indent_state
        )
        return start + " " + display_list + end


def new(value):
    return Mutex(value)


async def access(callback: Function, mutex: Mutex):
    async def on_unlock():
        return await Cmd.wrap(await callback.run([mutex])).eval()

    return await mutex.request_unlock(on_unlock)


async def tryAccess(callback: Function, mutex: Mutex):
    if mutex.locked():
        return none
    else:

        async def on_unlock():
            return await Cmd.wrap(await callback.run([mutex])).eval()

        return yes(await mutex.request_unlock(on_unlock))


async def read(mutex: Mutex):
    return mutex.value


async def write(value, mutex: Mutex):
    mutex.value = value
    return value


locked_type = NTypeVars("locked", [NGenericType("t")])
unlocked_type = NTypeVars("unlocked", [NGenericType("t")])


def _values():
    t = NGenericType("t")
    a = NGenericType("a")
    b = NGenericType("b")
    return {
        # new : [t] (t) -> mutex.locked[t]
        "new": (t, locked_type.with_typevars([t])),
        # access : [a, b] (mutex.unlocked[a] -> cmd[b], mutex.locked[a]) -> cmd[b]
        "access": (
            (unlocked_type.with_typevars([a]), n_cmd_type.with_typevars([b])),
            locked_type.with_typevars([a]),
            n_cmd_type.with_typevars([b]),
        ),
        # tryAccess : [a, b] (mutex.unlocked[a] -> cmd[b], mutex.locked[a]) -> cmd[maybe[b]]
        "tryAccess": (
            (unlocked_type.with_typevars([a]), n_cmd_type.with_typevars([b])),
            locked_type.with_typevars([a]),
            n_cmd_type.with_typevars([n_maybe_type.with_typevars([b])]),
        ),
        # read : [t] mutex.unlocked[t] -> cmd[t]
        "read": (unlocked_type.with_typevars([t]), n_cmd_type.with_typevars([t])),
        # write : [t] (t, mutex.unlocked[t]) -> cmd[t]
        "write": (t, unlocked_type.with_typevars([t]), n_cmd_type.with_typevars([t])),
    }


def _types():
    return {
        "locked": locked_type,
        "unlocked": unlocked_type,
    }
