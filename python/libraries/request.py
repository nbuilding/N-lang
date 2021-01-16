import requests
import json

#for gateways
scope = None

def _prepare(sc):
	scope = sc

def get(args):
	url, *rest = args
	headers = None
	try:
		headers = rest[1]
	except:
		pass

	r = requests.post(url, headers=headers)
	return {"code": r.status_code, "response": r.reason, "text": r.text}

def post(args):
	url, content, *rest = args
	headers = {}
	if len(rest) == 1:
		headers = rest[0]
	r = requests.post(url, data=json.dumps(content), headers=headers)
	return {"code": r.status_code, "response": r.reason, "text": r.text}


def _values():
	return {"post": {"code": "int", "reason": "str", "text": "str"}, "get": {"code": "int", "reason": "str", "text": "str"}}
