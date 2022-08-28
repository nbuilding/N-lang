const lines: Record<
  string,
  (name: string, require: (name: string) => string) => string[]
> = {
  write: name => [
    `function ${name}(path) {`,
    '  return function (content) {',
    '    return function (callback) {',
    '      try {',
    '        require("fs").writeFile(path, content, (err, data) => { callback() })',
    '      } catch (_) {',
    '        return;',
    '      }',
    '    };',
    '  };',
    '}',
  ],

  append: name => [
    `function ${name}(path) {`,
    '  return function (content) {',
    '    return function (callback) {',
    '      try {',
    '        require("fs").appendFile(path, content, (err, data) => { callback() })',
    '      } catch (_) {',
    '        return;',
    '      }',
    '    };',
    '  };',
    '}',
  ],

  read: name => [
    `function ${name}(path) {`,
    '  return function (callback) {',
    '    try {',
    '      require("fs").readFile(path, "utf8", (err, data) => { callback(err != null ? undefined : data) })',
    '    } catch (_) {',
    '      return;',
    '    }',
    '  };',
    '}',
  ],

  null: name => [`var ${name};`],

  string: name => [`function ${name}(str) {`, '  return [1, str];', '}'],

  number: name => [`function ${name}(float) {`, '  return [2, float];', '}'],

  boolean: name => [`function ${name}(bool) {`, '  return [3, bool];', '}'],

  array: name => [`function ${name}(list) {`, '  return [4, list];', '}'],

  object: name => [`function ${name}(map) {`, '  return [5, map];', '}'],

  parse: (name, require) => [
    `function ${name}(json) {`,
    '  try {',
    `    return ${require('jsValueToJson')}(JSON.parse(json));`,
    '  } catch (_) {',
    '    return;',
    '  }',
    '}',
  ],

  parseSafe: (name, require) => [
    `function ${name}(json) {`,
    '  try {',
    `    return ${require('jsValueToJson')}(JSON.parse(json));`,
    '  } catch (_) {',
    '    return;',
    '  }',
    '}',
  ],

  stringify: (name, require) => [
    `function ${name}(value) {`,
    `  // JSON.${name}: IE8+`,
    `  return JSON.${name}(${require('jsonValueToJs')}(value));`,
    '}',
  ],

  get: (name, require) => [
    `function ${name}() {`,
    '  return function (headers) {',
    '    return function (callback) {',
    `      ${require('httpRequest')}(url, "GET", undefined, headers, true, callback);`,
    '    };',
    '  };',
    '}',
  ],

  post: (name, require) => [
    `function ${name}(url) {`,
    '  return function (body) {',
    '    return function (headers) {',
    '      return function (callback) {',
    `        ${require('httpRequest')}(url, "POST", body, headers, false, callback);`,
    '      };',
    '    };',
    '  };',
    '}',
  ],

  inp: name => [
    `function ${name}(question) {`,
    '  return function (callback) {',
    '    try {',
    '      process.stdout.write(question)',
    '      process.stdin.once("data", function(val) {',
    '        callback(val.toString())',
    '        process.stdin.pause()',
    '      });',
    '    } catch (_) { callback("") }',
    '  };',
    '}',
  ],

  sleep: name => [
    `function ${name}(delay) {`,
    '  return function (callback) {',
    '    setTimeout(callback, delay);',
    '  };',
    '}',
  ],

  connect: name => [
    `function ${name}(listeners) {`,
    '  var onOpen = listeners.b;',
    '  var onMessage = listeners.a;',
    '  if (typeof WebSocket !== "function") {',
    '    var WebSocket = require("ws");',
    '  }',
    '  return function (url) {',
    '    return function (callback) {',
    '      try {',
    '        var ws = new WebSocket(url);',
    '        function send(content) {',
    '          return function (callback) {',
    '            ws.send(content);',
    '            callback();',
    '          };',
    '        }',
    '        function onWhetherClose(close) {',
    '          if (close && ws.readyState === WebSocket.OPEN) {',
    '            ws.close();',
    '          }',
    '        }',
    '        ws.addEventListener("open", function () {',
    '          onOpen(send)(onWhetherClose);',
    '        });',
    '        var onMsg = onMessage(send);',
    '        ws.addEventListener("message", function (event) {',
    '          // NOTE: `data` can be a Blob',
    '          onMsg(event.data)(onWhetherClose);',
    '        });',
    '        ws.addEventListener("close", function () {',
    '          callback();',
    '        });',
    '        ws.addEventListener("error", function () {',
    '          callback("The content of this string is undefined behaviour.");',
    '        });',
    '      } catch (err) {',
    '        callback(err.message);',
    '      }',
    '    };',
    '  };',
    '}',
  ],

  pear: name => [
    `function ${name}(value) {`,
    '  return function (callback) {',
    '    console.log(value);',
    '    callback();',
    '  };',
    '}',
  ],
}

export default lines
