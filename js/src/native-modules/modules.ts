const lines: Record<
  string,
  (name: string, require: (name: string) => string) => string[]
> = {
  write: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
    '}',
  ],

  append: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
    '}',
  ],

  read: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
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
    '    // TODO: json.null is represented as undefined as well; maybe[json.value]',
    '    // needs to be wrapped',
    '    return;',
    '  }',
    '}',
  ],

  stringify: (name, require) => [
    `function ${name}(value) {`,
    '  // JSON.stringify: IE8+',
    `  return JSON.stringify(${require('jsonValueToJs')}(value));`,
    '}',
  ],

  post: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
    '}',
  ],

  get: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
    '}',
  ],

  inp: name => [
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
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
    `function ${name}() {`,
    '  throw new Error("Not implemented");',
    '}',
  ],
}

export default lines
