import * as monaco from 'monaco-editor'

const escapes = /\\(?:[nrtv0fb"\\]|u\{[0-9a-fA-F]+\}|\{(?:.|[\uD800-\uDBFF][\uDC00-\uDFFF])\})/

export const configuration: monaco.languages.LanguageConfiguration = {
  // the default separators except `@$`
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
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
    { open: '/*', close: '*/' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: '/*', close: '*/' },
  ],
}

// Create your own language definition here
// You can safely look at other samples without losing modifications.
// Modifications are not saved on browser refresh/close though -- copy often!
export const language = <monaco.languages.IMonarchLanguage>{
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',

  keywords: [
    'import', 'for', 'let', 'return', 'if',
    'else', 'print', '_',
  ],

  typeKeywords: [
    'int', 'str', 'bool', 'float',
  ],

  operators: [
    '->', '>=', '<=', '%', '=', '>', '<', '&', '|', '+', '-',
    '*', '/', 'not', '!', '~', '&&', '||', '/=', '!=',
  ],

  constants: [
    'true', 'false',
  ],

  builtIns: [
    'intInBase10',
  ],

  // we include these common regular expressions
  symbols:  /[=><!~?:&|+\-*\/\^%]+/,

  escapes,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // numbers
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'constant.numeric.float'],
      [/0[xX][0-9a-fA-F]+/, 'constant.numeric.hex'],
      [/\d+/, 'constant.numeric'],

      // identifiers and keywords
      [
        /\w+/,
        {
          cases: {
            '@typeKeywords': 'support.type',
            '@keywords': 'keyword',
            '@constants': 'constant.language',
            '@operators': 'keyword.operator',
            '@builtIns': 'keyword.other.special-method',
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

      // chars
      [escapes, 'constant.character'],

      // delimiter: after number because of .\d floats
      [/[.]/, 'delimiter'],

      // strings
      [/"([^"\\]|\\.)*$/, 'invalid' ],  // non-teminated string
      [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' } ],
    ],

    comment: [
      [/[^\/*]+/, 'comment' ],
      [/\/\*/,    'comment', '@push' ],    // nested comment
      ["\\*/",    'comment', '@pop'  ],
      [/[\/*]/,   'comment' ],
    ],

    string: [
      [/[^\\"]+/,  'string'],
      [/@escapes/, 'constant.character.escape'],
      [/\\./,      'invalid'],
      [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' } ]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/,       'comment', '@comment' ],
      [/\/\/.*$/,    'comment'],
    ],
  },
}
