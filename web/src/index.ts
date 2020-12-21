import * as monaco from 'monaco-editor'

import './n-lang/index'
import materialTheme from './monaco-material-theme'

import './style.css'

// Since packaging is done by you, you need
// to instruct the editor how you named the
// bundles that contain the web workers.
(window as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, _label: string) {
    return './editor.worker.js';
  }
}

const container = document.getElementById('container')

if (!container) throw new Error('Couldn\'t find container.')

monaco.editor.defineTheme('material', materialTheme)

monaco.editor.create(container, {
  value: [
    'import fek',
    '',
    '> main test: int test1: str -> bool |',
    '  print "# Main"',
    '  print test',
    '  print test1',
    '  ; if test1 = "hi" then return true',
    '< false',
    '',
    '> loop 10 i: int |',
    '  var n: int < i + 1',
    '  print',
    '    if n % 3 = 0 & n % 5 = 0 then',
    '      "Fizzbuzz"',
    '    else if n % 3 = 0 then',
    '      "Fizz"',
    '    else if n % 5 = 0 then',
    '      "Buzz"',
    '    else',
    '      n',
    '<',
    '',
    'var test: int < if not 1 = 1 | 2 > 3 then 1 else 3',
    'var test1: int < 1 + 1',
    'var eee: str < "hi"',
    '',
    'var a: int < 1',
    'var b: int < 3',
    'var c: int < 2',
    'print a < c < b',
    '',
    '{main test1 eee}',
    '{fek.paer test}',
    'if not {main test "hello"} ->',
    '  print "{main test \\"hello\\"} returned false"',
    'if {main test eee} ->',
    '  print "{main test eee} returned true"',
    'else',
    '  print "{main test eee} returned false"',
    '',
    'print 2 + 3 * (4 + 1) * 4 + 5'
  ].join('\n'),
  theme: 'material',
  language: 'n',
  // What full autoindent means:
  // https://code.visualstudio.com/docs/getstarted/settings
  autoIndent: 'full',
  formatOnType: true,
  formatOnPaste: true,
  glyphMargin: true,
})
