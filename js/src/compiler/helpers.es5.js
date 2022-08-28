function modulo (a, b) {
  return ((a % b) + b) % b
}

function assertValue (valueAssertionId, pass) {
  valueAssertionResults_n[valueAssertionId] = pass
}

// Assumptions:
// - a and b are of similar structure thanks to type checking.
// - Neither a nor b contain a function
function deepEqual (a, b) {
  if (typeof a === 'object') {
    // Array.isArray: IE9+
    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false
      }
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) {
          return false
        }
      }
    } else {
      // Object.keys: IE9+
      var keys = Object.keys(a)
      if (keys.length !== Object.keys(b).length) {
        return false
      }
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] in b) {
          if (!deepEqual(a[keys[i]], b[keys[i]])) {
            return false
          }
        } else {
          return false
        }
      }
    }
    return true
  } else {
    return a === b
  }
}

function jsonValueToJs (value) {
  if (!value) {
    return null
  } else if (value[0] === 4) {
    // Array#map: IE9+
    return value[1].map(jsonValueToJs)
  } else if (value[0] === 5) {
    throw new Error('Not implemented')
  } else {
    return value[1]
  }
}

function jsValueToJson (value) {
  if (typeof value === 'object') {
    if (value === null) {
      return
    } else if (Array.isArray(value)) {
      // Array#map: IE9+
      return [4, value.map(jsValueToJson)]
    } else {
      throw new Error('Not implemented')
    }
  } else if (typeof value === 'string') {
    return [1, value]
  } else if (typeof value === 'number') {
    return [2, value]
  } else if (typeof value === 'boolean') {
    return [3, value]
  } else {
    throw new TypeError('This is not a JSON value.')
  }
}

// Some truthy value that isn't `undefined` and should be equal to itself
var unit = {}

function httpRequest (url, method, headers, bodyJson, returnJson, callback) {
  var body = bodyJson === undefined ? undefined : JSON.stringify(bodyJson)
  if (typeof fetch === 'function') {
    fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(function (response) {
        if (returnJson) {
          return response
            .json()
            .then(function (json) {
              callback({
                a: response.status,
                b: response.statusText,
                c: jsValueToJson(json),
              })
            })
            .catch(function () {
              callback({
                a: response.status,
                b: response.statusText,
              })
            })
        } else {
          return response.text().then(function (text) {
            callback({
              a: response.status,
              b: response.statusText,
              c: text,
            })
          })
        }
      })
      .catch(function () {
        callback({
          a: 0,
          b: '',
          c: returnJson ? undefined : '',
        })
      })
  } else if (typeof XMLHttpRequest === 'function') {
    var request = new XMLHttpRequest()
    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        var parsed = request.responseText
        if (returnJson) {
          try {
            parsed = jsValueToJson(JSON.parse(parsed))
          } catch (_) {}
        }
        callback({
          a: response.status,
          b: response.statusText,
          c: parsed,
        })
      }
    }
    request.open('POST', url)
    for (var key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        request.setRequestHeader(key, headers[key])
      }
    }
    request.send(body)
  } else if (typeof require === 'function') {
    try {
      var parsedUrl = new (require('url').URL)(url)
      var http =
        parsedUrl.protocol === 'https:' ? require('https') : require('http')
      var request = http.request(parsedUrl, { headers }, function (response) {
        response.setEncoding('utf8')

        var responseText = ''
        response.on('data', function (data) {
          responseText += data
        })
        response.on('end', function () {
          var parsed = responseText
          if (returnJson) {
            try {
              parsed = jsValueToJson(JSON.parse(parsed))
            } catch (_) {}
          }
          callback({
            a: response.status,
            b: response.statusText,
            c: parsed,
          })
        })
        response.on('error', function () {
          callback({ a: 0, b: '', c: returnJson ? undefined : '' })
        })
      })
      if (body !== undefined) {
        request.write(body)
      }
      request.end()
    } catch (_) {
      callback({ a: 0, b: '', c: returnJson ? undefined : '' })
    }
  } else {
    callback({ a: 0, b: '', c: returnJson ? undefined : '' })
  }
}
