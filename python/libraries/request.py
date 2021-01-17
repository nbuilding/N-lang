import requests
import json

#for gateways
scope = None

def _prepare(sc):
	scope = sc

def get(args):
	url = args[0]

	r = requests.get(url)
	return {"code": r.status_code, "response": r.reason, "text": r.text}

def post(args):
	url, content, *rest = args
	headers = {}
	if len(rest) == 1:
		headers = rest[0]
	r = requests.post(url, data=json.dumps(content), headers=headers)
	return {"code": r.status_code, "response": r.reason, "text": r.text}


def _values():
	return {"post": ("str", {"code": "int", "reason": "str", "text": "str"}), "get": ("str", {"code": "int", "reason": "str", "text": "str"})}
