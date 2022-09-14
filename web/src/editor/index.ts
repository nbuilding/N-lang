import * as monaco from 'monaco-editor'
import { ErrorDisplayer } from 'n-lang'

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

function run() {
  log.setValue('')
  monaco.editor.setModelLanguage(logModel, '')
  if (watcher.status.type === 'success') {
    const displayer = new ErrorDisplayer({
      type: 'plain',
      displayPath(absolutePath: string, basePath: string) {
        return './run.n'
      },
    })
    const { display, errors } = watcher.results.displayAll(displayer)
    if (errors !== 0) addToLog(display)
    if (errors == 0) {
      const compiled = watcher.checker.compile(watcher.results)
      const old = console.log
      console.log = function (value) {
        addToLog(value)
      }
      ;(null, eval)(compiled)
      console.log = old
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
