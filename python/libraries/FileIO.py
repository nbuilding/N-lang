import os
import os.path

from os import listdir
from os.path import isfile, join
from aiofile import async_open
from native_types import n_cmd_type, n_maybe_type, yes, none, n_list_type

def write(scope):
    async def out(p, content):
        path = os.path.join(scope.base_path, p)
        try:
            if not os.path.exists(os.path.split(os.path.abspath(path))[0]):
                os.mkdir(os.path.split(os.path.abspath(path))[0])
            async with async_open(path, "w+", encoding="utf-8") as f:
                await f.write(content)
        except:
            pass

        return ()
    return out


def append(scope):
    async def out(p, content):
        path = os.path.join(scope.base_path, p)
        try:
            if not os.path.exists(os.path.split(os.path.abspath(path))[0]):
                os.mkdir(os.path.split(os.path.abspath(path))[0])
            async with async_open(path, "a+", encoding="utf-8") as f:
                await f.write(content)
        except:
            pass
    return out


def read(scope):
    async def out(p):
        path = os.path.join(scope.base_path, p)
        try:
            async with async_open(path, "r", encoding="utf-8") as f:
                return yes(await f.read())
        except:
            return none

    return out

def writeBytes(scope):
    async def out(p, content):
        path = os.path.join(scope.base_path, p)
        try:
            if not os.path.exists(os.path.split(os.path.abspath(path))[0]):
                os.mkdir(os.path.split(os.path.abspath(path))[0])
            async with async_open(path, "wb+") as f:
                await f.write(bytes([c % 256 for c in content]))
        except:
            pass

        return ()
    return out


def appendBytes(scope):
    async def out(p, content):
        path = os.path.join(scope.base_path, p)
        try:
            if not os.path.exists(os.path.split(os.path.abspath(path))[0]):
                os.mkdir(os.path.split(os.path.abspath(path))[0])
            async with async_open(path, "ab+") as f:
                await f.write(bytes([c % 256 for c in content]))
        except:
            pass

        return ()
    return out


def readBytes(scope):
    async def out(p):
        path = os.path.join(scope.base_path, p)
        try:
            async with async_open(path, "rb") as f:
                return yes(list(await f.read()))
        except:
            return none
    return out


def getFiles(scope):
    async def out(p):
        path = os.path.join(scope.base_path, p)
        can_run = os.environ.get("FILE_ALLOW") == "true"
        if not can_run:
            return []

        return [(isfile(join(path, f)), f) for f in listdir(path)]
    return out
    

def _values():
    return {
        # write: str -> str -> cmd[()]
        "write": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # append: str -> str -> cmd[()]
        "append": ("str", "str", n_cmd_type.with_typevars(["unit"])),
        # read: str -> cmd[maybe[str]]
        "read": (
            "str",
            n_cmd_type.with_typevars([n_maybe_type.with_typevars(["str"])]),
        ),
        "writeBytes": (
            "str",
            n_list_type.with_typevars(["int"]),
            n_cmd_type.with_typevars(["unit"]),
        ),
        "appendBytes": (
            "str",
            n_list_type.with_typevars(["int"]),
            n_cmd_type.with_typevars(["unit"]),
        ),
        "readBytes": (
            "str",
            n_cmd_type.with_typevars(
                [n_maybe_type.with_typevars([n_list_type.with_typevars(["int"])])]
            ),
        ),
        "getFiles": ("str", n_cmd_type.with_typevars([n_list_type.with_typevars([["bool", "str"]])])),
    }

def _pass_scope():
    return ["write", "append", "read", "writeBytes", "appendBytes", "getFiles"]