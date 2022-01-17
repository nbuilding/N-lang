import requests
import json
import aiohttp
import asyncio
import logging

from io import BytesIO, StringIO
from flask import Flask, request as req, Response
from flask.logging import default_handler
from werkzeug.wsgi import FileWrapper

from native_types import n_cmd_type, NMap, n_map_type, n_list_type, none, n_maybe_type
from libraries.json import json_value_type, python_to_json, string, json_to_python
from ncmd import Cmd


async def request(request_type, url, headers, data):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(request_type, url, headers=json_to_python(headers.values[0]) if headers.variant == "yes" else None, data=json.dumps(json_to_python(data.values[0])) if data.variant == "yes" else None) as r:
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

async def sendMultipartForm(request_type, url, headers, data):
    try:
        form = aiohttp.FormData()
        for d in data:
            processed = {}
            for k, v in d.items():
                if isinstance(v, (str, tuple)):
                    processed[k] = v
                elif v.variant == "yes":
                    processed[k] = v.values[0]
            is_image, dat = processed["data"]
            form.add_field(processed["name"], bytes(dat) if is_image else "".join([chr(i) for i in dat]), filename=processed.get("filename"), content_type=processed.get("contentType"))
            
        # Man I love the fact that they try to infer whether you need a Multipart Form even though you are using the thing to create a multipart form, isn't that just amazing.
        form._is_multipart = True
        async with aiohttp.ClientSession() as session:
            async with session.request(request_type, url, headers=json_to_python(headers.values[0]) if headers.variant == "yes" else None, data=form) as r:
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
    except ValueError as err:
        return {
            "code": 400,
            "response": "Cannot parse input data",
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
        "sendMultipartForm": (
            "str",
            "str",
            n_maybe_type.with_typevars([json_value_type]),
            n_list_type.with_typevars([{
                "name": "str",
                "data": ["bool", n_list_type.with_typevars(["int"])],
                "filename": n_maybe_type.with_typevars(["str"]),
                "contentType": n_maybe_type.with_typevars(["str"]),
            }]),
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
