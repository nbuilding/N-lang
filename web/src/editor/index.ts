import * as monaco from 'monaco-editor'
import { compileToJS } from 'n-lang'

import materialTheme from './themes/material'
import './themes/error'

monaco.editor.defineTheme('material', materialTheme)

import { editor, watcher } from './editor'
import { log, logModel, addToLog } from './log'
import { getElementUnsafely } from '../utils'

window.addEventListener('resize', () => {
  editor.layout()
  log.layout()
})
;(window as any).__addToLog = addToLog

function run () {
  log.setValue('')
  monaco.editor.setModelLanguage(logModel, '')
  if (watcher.status.type === 'success') {
    if (watcher.checker.errors.length || watcher.checker.warnings.length) {
      log.setValue(log.getValue() + watcher.checker.displayWarnings(watcher.file) + '\n')
    }
    if (watcher.checker.errors.length) {
      monaco.editor.setModelLanguage(logModel, 'error')
    } else {
      const compiled = compileToJS(watcher.status.ast, watcher.checker.types, {
        print: '__addToLog'
      })
      ;(null, eval)(compiled)
    }
  } else {
    console.error(watcher.status.error)
    log.setValue(log.getValue() + watcher.status.error.stack + '\n')
    monaco.editor.setModelLanguage(logModel, 'error')
  }
}

getElementUnsafely('run').addEventListener('click', run)
editor.addAction({
  id: 'run',
  label: 'Execute code',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
  contextMenuGroupId: 'n-lang',
  contextMenuOrder: 1,
  run,
})
