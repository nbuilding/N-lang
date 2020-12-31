import * as monaco from 'monaco-editor'
import { Base } from 'n-lang'

export function getElementUnsafely (id: string): HTMLElement {
  const element = document.getElementById(id)
  if (element) {
    return element
  } else {
    throw new Error(`Couldn't find #${id}.`)
  }
}

export function getModelUnsafely (editor: monaco.editor.ICodeEditor): monaco.editor.ITextModel {
  const model = editor.getModel()
  if (model) {
    return model
  } else {
    throw new Error('Couldn\'t get the model of editor.')
  }
}

export function toMonacoRange (base: Base): monaco.IRange {
  return {
    startLineNumber: base.line,
    startColumn: base.col,
    endLineNumber: base.endLine,
    endColumn: base.endCol,
  }
}
