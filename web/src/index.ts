import * as monaco from 'monaco-editor'

import { parse, compileToJS } from 'n-lang'

import './n-lang/index'
import './error'
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

const editor = monaco.editor.create(getElement('container'), {
  value: defaultCode,
  theme: 'material',
  language: 'n',
  // What full autoindent means:
  // https://code.visualstudio.com/docs/getstarted/settings
  autoIndent: 'full',
  formatOnType: true,
  formatOnPaste: true,
  glyphMargin: true,
  fontFamily: '"Fira Code", Consolas, "Courier New", monospace',
  fontLigatures: '"ss06"',
  tabCompletion: 'on',
})

const log = monaco.editor.create(getElement('log'), {
  theme: 'material',
  readOnly: true,
  lineNumbers: 'off',
  minimap: {
    enabled: false
  },
  glyphMargin: false,
  lineDecorationsWidth: 0,
  folding: false,
  fontFamily: '"Fira Code", Consolas, "Courier New", monospace',
  fontLigatures: '"ss06"',
})

function addToLog (value: any) {
  const existingOutput = log.getValue()
  log.setValue(existingOutput ? existingOutput + '\n' + value : value + '')
}
(window as any).__addToLog = addToLog

getElement('run').addEventListener('click', () => {
  const logModel = log.getModel()
  try {
    if (logModel) {
      monaco.editor.setModelLanguage(logModel, '')
    }
    log.setValue('')
    const ast = parse(editor.getValue(), {
      ambiguityOutput: 'string'
    })
    const compiled = compileToJS(ast, {
      print: '__addToLog'
    })
    ;(null, eval)(compiled)
  } catch (err) {
    console.error(err)
    log.setValue(err.stack)
    if (logModel) {
      monaco.editor.setModelLanguage(logModel, 'error')
    }
  }
})

window.addEventListener('resize', () => {
  editor.layout()
  log.layout()
})
