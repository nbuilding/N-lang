import requests
import json
import native_types
import ast

#for gateways
scope = None

def _prepare(sc):
	scope = sc

def get(args):
	url = args[0]

	r = requests.get(url)
	out = ast.literal_eval(r.text)
	for key in out.keys():
		out[key] = str(out[key])

	return {"code": r.status_code, "response": r.reason, "out": native_types.NMap(out)}

def post(args):
	url, content, *rest = args
	headers = {}
	if len(rest) == 1:
		headers = rest[0]
	r = requests.post(url, data=json.dumps(content), headers=headers)
	return {"code": r.status_code, "response": r.reason, "text": r.text}


def _values():
	return {"post": ("str", native_types.n_map_type.with_typevars(["str", "str"]), {"code": "int", "reason": "str", "text": "str"}), "get": ("str", native_types.n_map_type.with_typevars(["str", "str"]), {"code": "int", "reason": "str", "return": native_types.n_map_type.with_typevars(["str", "str"])})}
