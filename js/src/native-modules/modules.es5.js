// FileIO

function write () {
  throw new Error('Not implemented')
}

function append () {
  throw new Error('Not implemented')
}

function read () {
  throw new Error('Not implemented')
}

// json

var null_;

function string (str) {
  return [1, str]
}

function number (float) {
  return [2, float]
}

function boolean (bool) {
  return [3, bool]
}

function array (list) {
  return [4, list]
}

function object (map) {
  return [5, map]
}

function parse (json) {
  try {
    return jsValueToJson(JSON.parse(json))
  } catch (_) {
    return
  }
}

function parseSafe (json) {
  try {
    return jsValueToJson(JSON.parse(json))
  } catch (_) {
    // TODO: json.null is represented as undefined as well; maybe[json.value]
    // needs to be wrapped
    return
  }
}

function stringify (value) {
  // JSON.stringify: IE8+
  return JSON.stringify(jsonValueToJs(value))
}

// request

function post () {
  throw new Error('Not implemented')
}

function get () {
  throw new Error('Not implemented')
}

// SystemIO

function inp () {
  throw new Error('Not implemented')
}

// times

function sleep (delay) {
  return function (callback) {
    setTimeout(callback, delay)
  }
}

// websocket

function connect () {
  throw new Error('Not implemented')
}
