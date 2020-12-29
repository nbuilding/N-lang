import * as monaco from 'monaco-editor'
import { saveAs } from 'file-saver'

import { displayDiagnostics } from '../n-lang/diagnostics'
import { Watcher } from '../n-lang/watcher'
import { getElementUnsafely, getModelUnsafely } from '../utils'
import defaultCode from './default-code'

export const editor = monaco.editor.create(getElementUnsafely('container'), {
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
  wordWrap: 'on',
})

export const editorModel = getModelUnsafely(editor)

export const watcher = new Watcher(editorModel)
displayDiagnostics(watcher)

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
