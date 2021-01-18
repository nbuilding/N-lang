import requests
import json
import ast
import aiohttp
import asyncio
from native_types import n_cmd_type, NMap, n_map_type

botid = ""

def setId(id):
	global botid
	botid = id

async def sendMessage(channel, message, tts):
	async with aiohttp.ClientSession() as session:
		async with session.get(
			f"https://discord.com/api/channels/{channel}/messages",
			data=json.dumps({"content": message, "tts": tts}),
			headers={'Content-Type': "application/json", "Authorization": f"Bot {botid}"},
		) as response:
			return {
				"code": response.status,
				"response": response.reason,
				"text": await response.text(),
			}

#for gateways
scope = None

def _prepare(sc):
	scope = sc

async def get(args):
	url = args[0]
	headers = args[1]
	async with aiohttp.ClientSession() as session:
		async with session.get(requests.get(url, headers)) as r:
			out = ast.literal_eval(r.text)
			for key in out.keys():
				out[key] = str(out[key])

			return {"code": r.status_code, "response": r.reason, "out": NMap(out)}

def post(args):
	url, content, *rest = args
	headers = {}
	if len(rest) == 1:
		headers = rest[0]
	r = requests.post(url, data=json.dumps(content), headers=headers)
	return {"code": r.status_code, "response": r.reason, "text": r.text}


def _values():
	return {
		"post": (
			"str",
			n_map_type.with_typevars(["str", "str"]),
			{"code": "int", "reason": "str", "text": "str"}
		),
		"get": (
			"str",
			n_map_type.with_typevars(["str", "str"]),
			n_cmd_type.with_typevars([{"code": "int", "reason": "str", "return": n_map_type.with_typevars(["str", "str"])}])
		)
	}
