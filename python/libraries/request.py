import requests
import json
import ast
import aiohttp
import asyncio
from native_types import n_cmd_type, NMap, n_map_type

#for gateways
scope = None

def _prepare(sc):
	scope = sc

async def get(args):
	url, headers = args
	async with aiohttp.ClientSession() as session:
		async with session.get(requests.get(url, headers)) as r:
			out = ast.literal_eval(await r.text)
			for key in out.keys():
				out[key] = str(out[key])

			return {"code": r.status_code, "response": r.reason, "out": NMap(out)}

async def post(args):
	url, content, headers = args
	
	async with aiohttp.ClientSession() as session:
		async with session.get(requests.post(url, data=json.dumps(content), headers=headers)) as r:
			for key in out.keys():
				out[key] = str(out[key])

			return {"code": r.status_code, "response": r.reason, "text": await r.text}

def _values():
	return {
		"post": (
			"str",
			n_map_type.with_typevars(["str", "str"]),
			n_map_type.with_typevars(["str", "str"]),
			{"code": "int", "reason": "str", "text": "str"}
		),
		"get": (
			"str",
			n_map_type.with_typevars(["str", "str"]),
			n_cmd_type.with_typevars([{"code": "int", "reason": "str", "return": n_map_type.with_typevars(["str", "str"])}])
		)
	}
