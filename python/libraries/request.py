import requests
import json
import aiohttp
import asyncio
import logging

from io import BytesIO
from flask import Flask, request as req, Response
from flask.logging import default_handler
from werkzeug.wsgi import FileWrapper

from native_types import n_cmd_type, NMap, n_map_type, n_list_type
from libraries.json import json_value_type, python_to_json, string
from ncmd import Cmd


async def get(url, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as r:
                returndata = string(await r.text())
                try:
                    returndata = python_to_json(json.loads(await r.text()))
                except:
                    pass
                return {"code": r.status, "response": r.reason, "return": returndata}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "return": string(str(err)),
        }


async def delete(url, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=headers) as r:
                returndata = string(await r.text())
                try:
                    returndata = python_to_json(json.loads(await r.text()))
                except:
                    pass
                return {"code": r.status, "response": r.reason, "return": returndata}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "return": string(str(err)),
        }


async def head(url, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.head(url, headers=headers) as r:
                returndata = string(await r.text())
                try:
                    returndata = python_to_json(json.loads(await r.text()))
                except:
                    pass
                return {"code": r.status, "response": r.reason, "return": returndata}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "return": string(str(err)),
        }


async def options(url, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.options(url, headers=headers) as r:
                returndata = string(await r.text())
                try:
                    returndata = python_to_json(json.loads(await r.text()))
                except:
                    pass
                return {"code": r.status, "response": r.reason, "return": returndata}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "return": string(str(err)),
        }


async def post(url, content, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=json.dumps(content), headers=headers) as r:
                return {"code": r.status, "response": r.reason, "text": await r.text()}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "text": str(err),
        }


async def patch(url, content, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.patch(url, data=json.dumps(content), headers=headers) as r:
                return {"code": r.status, "response": r.reason, "text": await r.text()}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "text": str(err),
        }


async def put(url, content, headers):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.put(url, data=json.dumps(content), headers=headers) as r:
                return {"code": r.status, "response": r.reason, "text": await r.text()}
    except aiohttp.client_exceptions.ClientError as err:
        return {
            "code": 400,
            "response": "Cannot connect",
            "text": str(err),
        }


async def createServer(port, page_handler):
    app = Flask(__name__)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    async def catch_all(path):
        out = await page_handler.run(
            [path, req.method, python_to_json(dict(req.args.lists()))]
        )
        if isinstance(out, Cmd):
            out = await out.eval()

        b = BytesIO(bytes(out["data"]))
        w = FileWrapper(b)
        return Response(
            w,
            status=out["responseCode"],
            headers=out["headers"],
            mimetype=out["mimetype"],
            direct_passthrough=True,
        )

    app.run(host="localhost", port=port)

    return ()


def _values():
    return {
        "post": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "text": "str"}]
            ),
        ),
        "get": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "return": json_value_type}]
            ),
        ),
        "delete": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "return": json_value_type}]
            ),
        ),
        "head": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "return": json_value_type}]
            ),
        ),
        "options": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "return": json_value_type}]
            ),
        ),
        "patch": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "text": "str"}]
            ),
        ),
        "put": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "text": "str"}]
            ),
        ),
        "createServer": (
            "int",
            (
                "str",
                "str",
                json_value_type,
                n_cmd_type.with_typevars(
                    [
                        {
                            "responseCode": "int",
                            "data": n_list_type.with_typevars(["int"]),
                            "headers": n_map_type.with_typevars(["str", "str"]),
                            "mimetype": "str",
                        }
                    ]
                ),
            ),  # [path:str requestType:str data:json.value] -> cmd[{ responseCode:int; data:list[int]; headers:map[str, str]; mimetype:str }]
            n_cmd_type.with_typevars(["unit"]),
        ),
    }
