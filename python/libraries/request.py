import requests
import json
import aiohttp
import asyncio
import logging

from io import BytesIO
from flask import Flask, request as req, Response
from flask.logging import default_handler
from werkzeug.wsgi import FileWrapper

from native_types import n_cmd_type, NMap, n_map_type, n_list_type, none, n_maybe_type
from libraries.json import json_value_type, python_to_json, string, json_to_python
from ncmd import Cmd


async def request(request_type, url, headers, data):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(request_type, url, headers=json_to_python(headers.values[0]) if headers.variant == "yes" else None, data=json_to_python(data.values[0]) if data.variant == "yes" else None) as r:
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
        "request": (
            "str",
            "str",
            n_maybe_type.with_typevars([json_value_type]),
            n_maybe_type.with_typevars([json_value_type]),
            n_cmd_type.with_typevars(
                [{"code": "int", "response": "str", "return": json_value_type}]
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
