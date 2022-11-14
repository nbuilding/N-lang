// FileIO

function write(path) {
  return function (content) {
    return function (callback) {
      try {
        require('fs').writeFile(path, content, (err, data) => {
          callback();
        });
      } catch (_) {
        return;
      }
    };
  };
}

function writeBytes(path) {
  return function (content) {
    return function (callback) {
      try {
        require('fs').writeFile(path, Buffer.from(content), (err, data) => {
          callback();
        });
      } catch (_) {
        return;
      }
    };
  };
}

function append(path) {
  return function (content) {
    return function (callback) {
      try {
        require('fs').appendFile(path, content, (err, data) => {
          callback();
        });
      } catch (_) {
        return;
      }
    };
  };
}

function appendBytes(path) {
  return function (content) {
    return function (callback) {
      try {
        require('fs').appendFile(path, Buffer.from(content), (err, data) => {
          callback();
        });
      } catch (_) {
        return;
      }
    };
  };
}

function read(path) {
  return function (callback) {
    try {
      require('fs').readFile(path, 'utf8', (err, data) => {
        callback(err != null ? undefined : data);
      });
    } catch (_) {
      return;
    }
  };
}

function readBytes(path) {
  return function (callback) {
    try {
      require('fs').readFile(path, (err, data) => {
        callback(err != null ? undefined : [...data]);
      });
    } catch (_) {
      return;
    }
  };
}

// json

var null_;

function string(str) {
  return [1, str];
}

function number(float) {
  return [2, float];
}

function boolean(bool) {
  return [3, bool];
}

function array(list) {
  return [4, list];
}

function object(map) {
  return [5, map];
}

function parse(json) {
  try {
    return jsValueToJson(JSON.parse(json));
  } catch (_) {
    return;
  }
}

function parseSafe(json) {
  try {
    return [jsValueToJson(JSON.parse(json))];
  } catch (_) {
    return;
  }
}

function stringify(value) {
  // JSON.stringify: IE8+
  return JSON.stringify(jsonValueToJs(value));
}

// request

// IE11 only supports XMLHttpRequest
// Deno only supports fetch
// Node only supports require('http')
// >_<

function request(url) {
  return function (method) {
    return function (body) {
      return function (headers) {
        return function (callback) {
          httpRequest(url, method, body, headers, callback);
        };
      };
    };
  };
}

// SystemIO

function inp(question) {
  return function (callback) {
    try {
      process.stdout.write(question);
      process.stdin.once('data', function (val) {
        callback(val.toString());
        process.stdin.pause();
      });
    } catch (_) {
      callback('');
    }
  };
}

function sendSTDOUT(question) {
  return function (callback) {
    try {
      process.stdout.write(question);
    } catch (_) {}
    callback();
  };
}

// times

function sleep(delay) {
  return function (callback) {
    setTimeout(callback, delay);
  };
}

function getTime() {
  return function (callback) {
    callback(Date.now());
  };
}

// websocket

function connect(listeners) {
  var onOpen = listeners.b;
  var onMessage = listeners.a;
  if (typeof WebSocket !== 'function') {
    var WebSocket = require('ws');
  }
  return function (url) {
    return function (callback) {
      try {
        var ws = new WebSocket(url);
        function send(content) {
          return function (callback) {
            ws.send(content);
            callback();
          };
        }
        function onWhetherClose(close) {
          if (close && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        }
        ws.addEventListener('open', function () {
          onOpen(send)(onWhetherClose);
        });
        var onMsg = onMessage(send);
        ws.addEventListener('message', function (event) {
          // NOTE: `data` can be a Blob
          onMsg(event.data)(onWhetherClose);
        });
        ws.addEventListener('close', function () {
          callback();
        });
        ws.addEventListener('error', function () {
          callback('The content of this string is undefined behaviour.');
        });
      } catch (err) {
        callback(err.message);
      }
    };
  };
}

// fek

function pear(value) {
  return function (callback) {
    console.log(value);
    callback();
  };
}
