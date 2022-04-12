const lines: Record<
  string,
  (name: string, require: (name: string) => string) => string[]
> = {
  write: name => [
    `function ${name}(path) {`,
    '  return function (content) {',
    '    return function (callback) {',
    '      runtime.writeFile(path, content, callback);',
    '    };',
    '  };',
    '}',
  ],

  append: name => [
    `function ${name}(path) {`,
    '  return function (content) {',
    '    return function (callback) {',
    '      runtime.appendFile(path, content, callback);',
    '    };',
    '  };',
    '}',
  ],

  read: name => [
    `function ${name}(path) {`,
    '  return function (callback) {',
    '    runtime.readFile(path, function (content) {',
    '      callback(content === null ? undefined : content);',
    '    });',
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
    '    runtime.readline(question, callback);',
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
}

export default lines
