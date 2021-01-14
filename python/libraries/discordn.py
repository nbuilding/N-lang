import aiohttp
import asyncio
import json
from native_types import n_cmd_type

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

def _values():
	return {
		"setId": ("str", n_cmd_type.with_typevars(["unit"])),
		# TODO: Should Discord snowflakes be ints or strings?
		"sendMessage": ("str", "str", "bool", n_cmd_type.with_typevars([{"code": "int", "response": "str", "text": "str"}])),
	}
