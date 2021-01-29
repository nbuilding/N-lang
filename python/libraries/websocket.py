import websockets

from native_types import n_cmd_type, n_maybe_type, yes, none
from native_function import NativeFunction
from type import NAliasType
from cmd import Cmd

# alias send = str -> cmd[()]
send_type = "str", n_cmd_type.with_typevars(["unit"])

# alias connectOptions = {
# 	onOpen: (str -> cmd[()]) -> cmd[()]
# 	onMessage: (str -> cmd[()]) -> str -> cmd[()]
# 	onClose: cmd[()]
# }
connect_options_type = {
	"onOpen": (send_type, n_cmd_type.with_typevars(["bool"])),
	"onMessage": (send_type, "str", n_cmd_type.with_typevars(["bool"])),
	# "onClose": n_cmd_type.with_typevars(["unit"]),
}

async def connect(options, url):
	async with websockets.connect(url) as websocket:
		async def send_msg(message):
			await websocket.send(message)
		# Why is this so complicated
		send = NativeFunction(None, [], None, lambda message: Cmd(lambda _: lambda: send_msg(message)))
		close = await options['onOpen'].run([send])
		if isinstance(close, Cmd):
			close = await close.eval()
		if not close:
			try:
				async for message in websocket:
					close = await options['onMessage'].run([send, message])
					if isinstance(close, Cmd):
						close = await close.eval()
					if close:
						break
			except websockets.exceptions.ConnectionClosedError as err:
				return yes(err.reason)
		# await options['onClose'].eval()
	return none

def _values():
	return {
		# connect: connectOptions -> str -> cmd[maybe[str]]
		"connect": (connect_options_type, "str", n_cmd_type.with_typevars([n_maybe_type.with_typevars(["str"])])),
	}

def _types():
	return {
		"send": NAliasType("send", send_type),
	}
