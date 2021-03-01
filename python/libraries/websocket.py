import websockets
import os
import asyncio

from colorama import Fore, Style

from native_types import n_cmd_type, n_maybe_type, yes, none
from native_function import NativeFunction
from type import NAliasType
from cmd import Cmd
from libraries.SystemIO import inp as async_input

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
	debug = os.environ['N_WS_DEBUG'] == 'experimental'
	if debug:
		print(f"{Fore.YELLOW}Websocket debugging is experimental and may be removed in the future.{Style.RESET_ALL}")
		print(f"[{url}] {Fore.BLUE}Connecting.{Style.RESET_ALL}")
		async def manual_send():
			try:
				while True:
					message = await async_input(f"[{url}] NOTICE ME! Type a message and press enter to send.\n")
					print(f"[{url}] {Fore.CYAN}send*{Style.RESET_ALL} {Fore.GREEN}{message}{Style.RESET_ALL}")
					await websocket.send(message)
			except asyncio.CancelledError:
				pass
		debug_task = asyncio.create_task(manual_send())
	async with websockets.connect(url) as websocket:
		if debug:
			print(f"[{url}] {Fore.BLUE}Open!{Style.RESET_ALL}")
		async def send_msg(message):
			if debug:
				print(f"[{url}] {Fore.CYAN}send{Style.RESET_ALL} {Fore.GREEN}{message}{Style.RESET_ALL}")
			await websocket.send(message)
		# Why is this so complicated
		send = NativeFunction(None, [], None, lambda message: Cmd(lambda _: lambda: send_msg(message)))
		close = await options['onOpen'].run([send])
		if debug:
			print(f"[{url}] {Fore.BLUE}onOpen handled.{Style.RESET_ALL}")
		if isinstance(close, Cmd):
			close = await close.eval()
		if not close:
			try:
				async for message in websocket:
					if debug:
						print(f"[{url}] {Fore.CYAN}recv{Style.RESET_ALL} {Fore.MAGENTA}{message}{Style.RESET_ALL}")
					close = await options['onMessage'].run([send, message])
					if debug:
						print(f"[{url}] {Fore.BLUE}onMessage handled.{Style.RESET_ALL}")
					if isinstance(close, Cmd):
						close = await close.eval()
					if close:
						break
			except websockets.exceptions.ConnectionClosedError as err:
				if debug:
					print(f"[{url}] {Fore.CYAN}ERROR{Style.RESET_ALL} {Fore.RED}{err}{Style.RESET_ALL}")
				return yes(err.reason)
		# await options['onClose'].eval()
		if debug:
			debug_task.cancel()
	if debug:
		print(f"[{url}] {Fore.BLUE}Closed.{Style.RESET_ALL}")
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
