import * as monaco from 'monaco-editor'

import { parse, compileToJS } from 'n-lang'

import './n-lang/index'
import materialTheme from './monaco-material-theme'
import defaultCode from './default-code'

import './style.css'

function getElement (id: string): HTMLElement {
  const element = document.getElementById(id)
  if (element) {
    return element
  } else {
    throw new Error(`Couldn't find #${id}.`)
  }
}

// Since packaging is done by you, you need
// to instruct the editor how you named the
// bundles that contain the web workers.
(window as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, _label: string) {
    return './editor.worker.js';
  }
}

monaco.editor.defineTheme('material', materialTheme)

monaco.editor.create(getElement('container'), {
  value: defaultCode,
  theme: 'material',
  language: 'n',
  // What full autoindent means:
  // https://code.visualstudio.com/docs/getstarted/settings
  autoIndent: 'full',
  formatOnType: true,
  formatOnPaste: true,
  glyphMargin: true,
})

const log = monaco.editor.create(getElement('log'), {
  theme: 'material',
  readOnly: true,
  lineNumbers: 'off',
  minimap: {
    enabled: false
  }
})

function addToLog (value: any) {
  const existingOutput = log.getValue()
  log.setValue(existingOutput ? existingOutput + '\n' + value : value + '')
}
(window as any).addToLog = addToLog

getElement('run').addEventListener('click', () => {
  try {
    log.setValue('')
    const ast = parse(log.getValue(), {
      ambiguityOutput: 'string'
    })
    const compiled = compileToJS(ast, {
      print: 'addToLog'
    })
    ;(null, eval)(compiled)
  } catch (err) {
    log.setValue(err)
  }
})
