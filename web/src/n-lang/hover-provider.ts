import * as monaco from 'monaco-editor'
import { Base, displayType, NType } from 'n-lang'

import { getOrSetWatcher } from './watcher'

export function provideHover (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _token: monaco.CancellationToken,
): monaco.languages.Hover {
  const watcher = getOrSetWatcher(model)
  if (!watcher.lastSuccess) return { contents: [] }
  const { lineNumber, column } = position
  // From most specific -> least specific range
  const bases = watcher.lastSuccess.ast.find(lineNumber, column)
  let typeEntry: [Base, NType] | undefined
  for (const base of bases) {
    const type = watcher.checker.types.get(base)
    if (type) {
      typeEntry = [base, type]
      break
    }
  }
  if (!typeEntry) return { contents: [] }
  return {
    contents: [
      { value: displayType(typeEntry[1]) }
    ],
    range: {
      startLineNumber: typeEntry[0].line,
      startColumn: typeEntry[0].col,
      endLineNumber: typeEntry[0].endLine,
      endColumn: typeEntry[0].endCol,
    }
  }
}
