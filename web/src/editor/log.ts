import * as monaco from 'monaco-editor'
import { saveAs } from 'file-saver'

import { getElementUnsafely, getModelUnsafely } from '../utils'
import { editor } from './editor'

export const log = monaco.editor.create(getElementUnsafely('log'), {
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

export const logModel = getModelUnsafely(log)

export function addToLog (value: any) {
  log.setValue(log.getValue() + value + '\n')
}

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
