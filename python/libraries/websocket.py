import websockets
import os
import asyncio
import uuid

from colorama import Fore, Style

from native_types import n_cmd_type, n_maybe_type, n_result_type, yes, none, ok, err as error
from native_function import NativeFunction
from type import NAliasType
from ncmd import Cmd
from libraries.SystemIO import inp as async_input

# alias send = str -> cmd[()]
send_type = "str", n_cmd_type.with_typevars([n_result_type.with_typevars(["unit", "int"])])

close_type = ("unit", n_cmd_type.with_typevars(["unit"]))

# alias connectOptions = {
# 	onOpen: (str -> cmd[()]) -> cmd[()]
# 	onMessage: (str -> cmd[()]) -> str -> cmd[()]
# 	onClose: cmd[()]
# }
connect_options_type = {
    "onOpen": (send_type, n_cmd_type.with_typevars(["bool"])),
    "onMessage": (send_type, "str", n_cmd_type.with_typevars(["bool"])),
    # "onClose": ("unit", n_cmd_type.with_typevars(["unit"])),
}

# alias user = {
#   send: str -> cmd[()]
#   disconnect: () -> cmd[()]
#   ip: (int, int, int, int)
#   uuid: str
# }
user_type = {
    "send": ("str", n_cmd_type.with_typevars(["unit"])),
    "disconnect": ("unit", n_cmd_type.with_typevars(["unit"])),
    "ip": ["int", "int", "int", "int"],
    "uuid": "str",
}

# alias setupOptions = {
#   onConnect: user -> str -> cmd[bool]
#   onMessage: user -> str -> cmd[bool]
#   onDisconnect: user -> { code: int; reason: str } -> cmd[bool]
# }
setup_options_type = {
    "onConnect": (user_type, "str", n_cmd_type.with_typevars(["bool"])),
    "onMessage": (user_type, "str", n_cmd_type.with_typevars(["bool"])),
    "onDisconnect": (
        user_type,
        n_maybe_type.with_typevars(
            [
                {
                    "code": "int",
                    "reason": "str",
                }
            ]
        ),
        n_cmd_type.with_typevars(["bool"]),
    ),
}


async def connect(options, url):
    debug = os.environ.get("N_WS_DEBUG") == "experimental"
    if debug:
        print(
            f"{Fore.YELLOW}Websocket debugging is experimental and may be removed in the future.{Style.RESET_ALL}"
        )
        print(f"[{url}] {Fore.BLUE}Connecting.{Style.RESET_ALL}")

        async def manual_send():
            try:
                while True:
                    message = await async_input(
                        f"[{url}] NOTICE ME! Type a message and press enter to send.\n"
                    )
                    print(
                        f"[{url}] {Fore.CYAN}send*{Style.RESET_ALL} {Fore.GREEN}{message}{Style.RESET_ALL}"
                    )
                    await websocket.send(message)
            except asyncio.CancelledError:
                pass

        debug_task = asyncio.create_task(manual_send())
    try:
        async with websockets.connect(url) as websocket:
            if debug:
                print(f"[{url}] {Fore.BLUE}Open!{Style.RESET_ALL}")

            async def send_msg(message):
                if debug:
                    print(
                        f"[{url}] {Fore.CYAN}send{Style.RESET_ALL} {Fore.GREEN}{message}{Style.RESET_ALL}"
                    )
                try:
                    await websocket.send(message)
                    return ok(())
                except websockets.exceptions.ConnectionClosed as err:
                    # Ignore all runtime errors (eg when attempting sending to a closed websocket)
                    return error(err.code)

            # Why is this so complicated
            send = NativeFunction(
                None, [], None, lambda message: Cmd(lambda _: lambda: send_msg(message))
            )

            async def on_message():
                try:
                    async for message in websocket:
                        if debug:
                            print(
                                f"[{url}] {Fore.CYAN}recv{Style.RESET_ALL} {Fore.MAGENTA}{message}{Style.RESET_ALL}"
                            )
                        close = await options["onMessage"].run([send, message])
                        if debug:
                            print(
                                f"[{url}] {Fore.BLUE}onMessage handled.{Style.RESET_ALL}"
                            )
                        if isinstance(close, Cmd):
                            close = await close.eval()
                        if close:
                            await websocket.close()
                            try:
                                on_close.set_result(None) # Mark `on_close` as done
                            except:
                                pass
                except websockets.exceptions.ConnectionClosedError as err:
                    if debug:
                        print(
                            f"[{url}] {Fore.CYAN}ERROR{Style.RESET_ALL} {Fore.RED}{err}{Style.RESET_ALL}"
                        )
                    return yes(err.reason)

            async def on_connect():
                try:
                    close = await options["onOpen"].run([send])
                    if debug:
                        print(f"[{url}] {Fore.BLUE}onOpen handled.{Style.RESET_ALL}")
                    if isinstance(close, Cmd):
                        close = await close.eval()
                    if close:
                        await websocket.close()
                        try:
                            on_close.set_result(None) # Mark `on_close` as done
                        except:
                            pass
                    # await options['onClose'].eval()
                    if debug:
                        debug_task.cancel()

                except websockets.exceptions.ConnectionClosedError as err:
                    if debug:
                        print(
                            f"[{url}] {Fore.CYAN}ERROR{Style.RESET_ALL} {Fore.RED}{err}{Style.RESET_ALL}"
                        )
                    return yes(err.reason)

            on_close = asyncio.Future()
            
            asyncio.create_task(on_message())
            asyncio.create_task(on_connect())

            await on_close
        if debug:
            print(f"[{url}] {Fore.BLUE}Closed.{Style.RESET_ALL}")
        return none
    except Exception as err:
        return yes(str(err))


# https://limecoda.com/how-to-build-basic-websocket-server-python/
async def createServer(options, port):
    ws_server = None

    async def server(websocket, path):
        try:
            user_data = {
                "send": NativeFunction(
                    None,
                    [],
                    None,
                    lambda message: Cmd(lambda _: lambda: websocket.send(message)),
                ),
                "disconnect": NativeFunction(
                    None,
                    [],
                    None,
                    lambda: Cmd(
                        lambda: lambda: websocket.close()
                    ),  # TODO: add code and reason
                ),
                "ip": tuple([int(i) for i in websocket.remote_address[0].split(".")]),
                "uuid": str(uuid.uuid4()),
            }

            stop = await options["onConnect"].run([user_data, path])
            if isinstance(stop, Cmd):
                stop = await stop.eval()

            if stop:
                ws_server.close()

            async for message in websocket:
                stop = await options["onMessage"].run([user_data, message])
                if isinstance(stop, Cmd):
                    stop = await stop.eval()

                if stop:
                    ws_server.close()

            if websocket.closed:
                stop = await options["onDisconnect"].run([user_data, none])
                if isinstance(stop, Cmd):
                    stop = await stop.eval()

                if stop:
                    ws_server.close()
        except websockets.exceptions.ConnectionClosed as err:
            stop = await options["onDisconnect"].run(
                [user_data, yes({"code": err.code, "reason": err.reason})]
            )
            if isinstance(stop, Cmd):
                stop = await stop.eval()

            if stop:
                ws_server.close()

    # Create and start websocket server
    ws_server = await websockets.serve(server, "0.0.0.0", port)

    # Run websocket server until it ends
    await ws_server.wait_closed()

    return ()


def _values():
    return {
        # connect: connectOptions -> str -> cmd[maybe[str]]
        "connect": (
            connect_options_type,
            "str",
            n_cmd_type.with_typevars([n_maybe_type.with_typevars(["str"])]),
        ),
        # createServer: setupOptions -> int -> cmd[()]
        "createServer": (
            setup_options_type,
            "int",
            n_cmd_type.with_typevars(["unit"]),
        ),
    }


def _types():
    return {
        "send": NAliasType("send", send_type),
        "close": NAliasType("close", close_type),
        "user": NAliasType("user", user_type),
    }
