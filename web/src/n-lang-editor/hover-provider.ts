import * as monaco from 'monaco-editor'
import { Base, displayType, NType } from 'n-lang'

import { getOrSetWatcher } from './watcher'

export function provideHover(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _token: monaco.CancellationToken
): monaco.languages.Hover {
  return { contents: [] }
  // I dont know what to do here
  // const watcher = getOrSetWatcher(model)
  // if (!watcher.lastSuccess) return { contents: [] }
  // const { lineNumber, column } = position
  // // From most specific -> least specific range
  // if (watcher.checker.moduleCache.get('./run.n').state !== 'loaded')
  // return

  // const bases = watcher.checker.moduleCache.get('./run.n').find(lineNumber, column)
  // let typeEntry: [Base, NType] | undefined
  // for (const base of bases) {
  //   const type = watcher.results.types.get(base)
  //   if (type) {
  //     typeEntry = [base, type]
  //     break
  //   }
  // }
  // if (!typeEntry) return { contents: [] }
  // return {
  //   contents: [{ value: displayType(typeEntry[1]) }],
  //   range: {
  //     startLineNumber: typeEntry[0].line,
  //     startColumn: typeEntry[0].col,
  //     endLineNumber: typeEntry[0].endLine,
  //     endColumn: typeEntry[0].endCol,
  //   },
  // }
}
