import * as monaco from 'monaco-editor'
import { TypeCheckerResultsForFile } from 'n-lang'

import { toMonacoRange } from '../utils'
import { getOrSetWatcher } from './watcher'

export function provideCodeActions(
  model: monaco.editor.ITextModel,
  _range: monaco.Range,
  _context: monaco.languages.CodeActionContext,
  _token: monaco.CancellationToken
): monaco.languages.CodeActionList {
  const watcher = getOrSetWatcher(model)
  const actions: monaco.languages.CodeAction[] = []
  const fileResults = watcher.results.files.get(
    './run.n'
  ) as TypeCheckerResultsForFile
  // Currently unimplemented
  return {
    actions,
    dispose: () => {},
  }
}
