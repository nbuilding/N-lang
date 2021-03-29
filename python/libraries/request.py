import requests
import json
import aiohttp
import asyncio
from native_types import n_cmd_type, NMap, n_map_type
from libraries.json import json_value_type, python_to_json, string


async def get(url, headers):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as r:
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


def _values():
    return {
        "post": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars([{"code": "int", "response": "str", "text": "str"}])
        ),
        "get": (
            "str",
            n_map_type.with_typevars(["str", "str"]),
            n_cmd_type.with_typevars([{"code": "int", "response": "str", "return": json_value_type}])
        )
    }
