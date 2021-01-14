import requests
import json
from native_types import n_cmd_type

botid = ""

def setId(id):
	global botid
	botid = id

def sendMessage(channel, message, tts):
	r = requests.post(f"https://discord.com/api/channels/{channel}/messages", data=json.dumps({"content": message, "tts": tts}), headers={'Content-Type': "application/json", "Authorization": f"Bot {botid}"})
	return {"code": r.status_code, "response": r.reason, "text": r.text}

def _values():
	return {
		"setId": ("str", n_cmd_type.with_typevars(["unit"])),
		# TODO: Should Discord snowflakes be ints or strings?
		"sendMessage": ("str", "str", "bool", n_cmd_type.with_typevars([{"code": "int", "response": "str", "text": "str"}])),
	}
