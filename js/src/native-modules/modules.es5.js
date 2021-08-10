// FileIO

function write (path) {
  return function (content) {
    return function (callback) {
      runtime.writeFile(path, content, callback)
    }
  }
}

function append (path) {
  return function (content) {
    return function (callback) {
      runtime.appendFile(path, content, callback)
    }
  }
}

function read (path) {
  return function (callback) {
    runtime.readFile(path, function (content) {
      callback(content === null ? undefined : content)
    })
  }
}

// json

var null_

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
    return
  }
}

function stringify (value) {
  // JSON.stringify: IE8+
  return JSON.stringify(jsonValueToJs(value))
}

// request

// IE11 only supports XMLHttpRequest
// Deno only supports fetch
// Node only supports require('http')
// >_<

function get () {
  return function (headers) {
    return function (callback) {
      httpRequest(url, 'GET', undefined, headers, true, callback)
    }
  }
}

function post (url) {
  return function (body) {
    return function (headers) {
      return function (callback) {
        httpRequest(url, 'POST', body, headers, false, callback)
      }
    }
  }
}

// SystemIO

function inp (question) {
  return function (callback) {
    runtime.readline(question, callback)
  }
}

// times

function sleep (delay) {
  return function (callback) {
    setTimeout(callback, delay)
  }
}

// websocket

function connect (listeners) {
  var onOpen = listeners.b
  var onMessage = listeners.a
  if (typeof WebSocket !== 'function') {
    var WebSocket = require('ws')
  }
  return function (url) {
    return function (callback) {
      try {
        var ws = new WebSocket(url)
        function send (content) {
          return function (callback) {
            ws.send(content)
            callback()
          }
        }
        function onWhetherClose (close) {
          if (close && ws.readyState === WebSocket.OPEN) {
            ws.close()
          }
        }
        ws.addEventListener('open', function () {
          onOpen(send)(onWhetherClose)
        })
        var onMsg = onMessage(send)
        ws.addEventListener('message', function (event) {
          // NOTE: `data` can be a Blob
          onMsg(event.data)(onWhetherClose)
        })
        ws.addEventListener('close', function () {
          callback()
        })
        ws.addEventListener('error', function () {
          callback('The content of this string is undefined behaviour.')
        })
      } catch (err) {
        callback(err.message)
      }
    }
  }
}
