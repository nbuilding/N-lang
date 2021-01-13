import requests
import json

botid = ""

def setId(args):
	global botid
	botid = args[0]

def sendMessage(args):
	channel, message, *rest = args
	tts = False
	if len(rest) == 1:
		tts = rest[0]
	r = requests.post(f"https://discord.com/api/channels/{channel}/messages", data=json.dumps({"content": message, "tts": tts}), headers={'Content-Type': "application/json", "Authorization": f"Bot {botid}"})
	return {"code": r.status_code, "response": r.reason, "text": r.text}

def _values():
	return {"setId": None, "sendMessage": {"code": "int", "response": "str", "text": "str"}}