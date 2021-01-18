import requests
import json
import aiohttp
import asyncio
from native_types import n_cmd_type, NMap, n_map_type

#for gateways
scope = None

def _prepare(sc):
	scope = sc

async def get(url, headers):
	async with aiohttp.ClientSession() as session:
		async with session.get(url, headers=headers) as r:
			out = json.loads(await r.text())
			for key in out.keys():
				out[key] = str(out[key])

			return {"code": r.status, "response": r.reason, "return": NMap(out)}

async def post(url, content, headers):
	print(json.dumps(content))
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
			n_cmd_type.with_typevars([{"code": "int", "response": "str", "return": n_map_type.with_typevars(["str", "str"])}])
		)
	}
