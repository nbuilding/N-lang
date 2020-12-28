import * as monaco from 'monaco-editor'

export const configuration: monaco.languages.LanguageConfiguration = {
  // the default separators except `@$`
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  comments: {
    lineComment: ';'
  },
  brackets: [
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
  ],
  indentationRules: {
    increaseIndentPattern: /^\s*>/,
    decreaseIndentPattern: /^\s*</,
    indentNextLinePattern: /(?:\b(?:then|else|print)|->|\w\s*<)\s*$/,
  },
}

// Create your own language definition here
// You can safely look at other samples without losing modifications.
// Modifications are not saved on browser refresh/close though -- copy often!
export const language = <monaco.languages.IMonarchLanguage>{
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',

  keywords: [
    'import', 'for', 'var', 'return', 'if',
    'else', 'print',
  ],

  typeKeywords: [
    'int', 'str', 'bool', 'float',
  ],

  operators: [
    '->', '>=', '<=', '%', '=', '>', '<', '&', '|', '+', '-',
    '*', '/', 'not',
  ],

  constants: [
    'true', 'false',
  ],

  // we include these common regular expressions
  symbols:  /[=><!~?:&|+\-*\/\^%]+/,

  escapes: /\\(?:[0bfnrtv\\"']|u\{[0-9A-Fa-f]+\})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [
        /[a-z][\w$]*/,
        {
          cases: {
            '@typeKeywords': 'support.type',
            '@keywords': 'keyword',
            '@constants': 'constant.language',
            '@operators': 'keyword.operator',
            '@default': 'support.other.variable'
          }
        }
      ],
      [/[A-Z_]+/, 'support.constant'],
      [/[A-Z][\w]*/, 'type.identifier'],  // to show class names nicely

      // whitespace
      { include: '@whitespace' },

      // delimiters and operators
      [/[{}()\[\]\>\<]/, '@brackets'],

      // numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'constant.numeric.float'],
      [/0[xX][0-9a-fA-F]+/, 'constant.numeric.hex'],
      [/\d+/, 'constant.numeric'],

      // delimiter: after number because of .\d floats
      [/[.]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'invalid' ],  // non-teminated string
      [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],
    ],

    string: [
      [/[^\\"]+/,  'string'],
      [/@escapes/, 'constant.character.escape'],
      [/\\./,      'invalid'],
      [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/;.*$/,    'comment'],
    ],
  },
}
