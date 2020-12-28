import * as monaco from 'monaco-editor'
import { saveAs } from 'file-saver'
import { compileToJS, FileLines, TypeChecker } from 'n-lang'

import './n-lang/index'
import './error'
import materialTheme from './monaco-material-theme'
import defaultCode from './default-code'

import './style.css'
import { displayDiagnostics } from './n-lang/diagnostics'

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

const editorModel = editor.getModel()
if (editorModel) {
  displayDiagnostics(editorModel)
}

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
  log.setValue(log.getValue() + value + '\n')
}
(window as any).__addToLog = addToLog

function run () {
  const logModel = log.getModel()
  try {
    if (logModel) {
      monaco.editor.setModelLanguage(logModel, '')
    }
    log.setValue('')
    const code = editor.getValue()
    const lines = new FileLines(code, 'run.n')
    const ast = lines.parse({
      ambiguityOutput: 'string'
    })
    const checker = new TypeChecker({
      colours: false
    })
    checker.check(ast)
    if (checker.errors.length || checker.warnings.length) {
      log.setValue(log.getValue() + checker.displayWarnings(lines) + '\n')
    }
    if (checker.errors.length) {
      if (logModel) {
        monaco.editor.setModelLanguage(logModel, 'error')
      }
    } else {
      const compiled = compileToJS(ast, checker.types, {
        print: '__addToLog'
      })
      ;(null, eval)(compiled)
    }
  } catch (err) {
    console.error(err)
    log.setValue(log.getValue() + err.stack + '\n')
    if (logModel) {
      monaco.editor.setModelLanguage(logModel, 'error')
    }
  }
}

getElement('run').addEventListener('click', run)

window.addEventListener('resize', () => {
  editor.layout()
  log.layout()
})

editor.addAction({
  id: 'save',
  label: 'Download as file',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
	contextMenuGroupId: 'n-lang',
	contextMenuOrder: 2,
  run: () => {
    const blob = new Blob([editor.getValue()], { type: 'text/x-n-lang;charset=utf-8' })
    saveAs(blob, 'main.n', { autoBom: true })
  }
})
editor.addAction({
  id: 'run',
  label: 'Execute code',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
	contextMenuGroupId: 'n-lang',
	contextMenuOrder: 1,
  run
})

log.addAction({
  id: 'save',
  label: 'Download log',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
	contextMenuGroupId: 'n-lang',
  run: () => {
    const blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, 'log.txt', { autoBom: true })
  }
})
