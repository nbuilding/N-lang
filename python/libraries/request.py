import requests
import json
import aiohttp
import asyncio
import logging

from flask import Flask, request as req
from flask.logging import default_handler

from native_types import n_cmd_type, NMap, n_map_type, n_list_type
from libraries.json import json_value_type, python_to_json, string

server_page_type = {
    "method": "str",
    "path": "str",
    "handle": (json_value_type, n_cmd_type.with_typevars([{
        "responseCode": "int",
        "data": "str"
    }]))
}

async def get(url, headers):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as r:
            returndata = string(await r.text())
            try:
                returndata = python_to_json(json.loads(await r.text()))
            except:
                pass
            return {"code": r.status, "response": r.reason, "return": returndata}


async def delete(url, headers):
    async with aiohttp.ClientSession() as session:
        async with session.delete(url, headers=headers) as r:
            returndata = string(await r.text())
            try:
                returndata = python_to_json(json.loads(await r.text()))
            except:
                pass
            return {"code": r.status, "response": r.reason, "return": returndata}


async def head(url, headers):
    async with aiohttp.ClientSession() as session:
        async with session.head(url, headers=headers) as r:
            returndata = string(await r.text())
            try:
                returndata = python_to_json(json.loads(await r.text()))
            except:
                pass
            return {"code": r.status, "response": r.reason, "return": returndata}


async def options(url, headers):
    async with aiohttp.ClientSession() as session:
        async with session.options(url, headers=headers) as r:
            returndata = string(await r.text())
            try:
                returndata = python_to_json(json.loads(await r.text()))
            except:
                pass
            return {"code": r.status, "response": r.reason, "return": returndata}


async def post(url, content, headers):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=json.dumps(content), headers=headers) as r:
            return {"code": r.status, "response": r.reason, "text": await r.text()}


async def patch(url, content, headers):
    async with aiohttp.ClientSession() as session:
        async with session.patch(url, data=json.dumps(content), headers=headers) as r:
            return {"code": r.status, "response": r.reason, "text": await r.text()}


async def put(url, content, headers):
    async with aiohttp.ClientSession() as session:
        async with session.put(url, data=json.dumps(content), headers=headers) as r:
            return {"code": r.status, "response": r.reason, "text": await r.text()}

async def set_page(app, page, index):
    async def run():
        out = await page["handle"].run([python_to_json(dict(req.args.lists()))])
        return out["data"], out["responseCode"]
    run.__name__ = "run" + str(index)
    app.add_url_rule(page["path"], view_func=run, methods=[page["method"]])

async def createServer(port, pages, error_pages):
    app = Flask(__name__)
    for i, page in enumerate(pages):
        await set_page(app, page, i)
    for i, error_code in enumerate(error_pages.keys()):
        @app.errorhandler(error_code)
        async def run(error):
            return error_pages[error_code], error_code
    app.run(host="localhost", port=port)


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
            n_list_type.with_typevars([server_page_type]),
            n_map_type.with_typevars(["int", "str"]),
            n_cmd_type.with_typevars(["unit"]),
        ),
    }
