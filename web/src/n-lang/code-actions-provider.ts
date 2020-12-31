import * as monaco from 'monaco-editor'

import { toMonacoRange } from '../utils'
import { getOrSetWatcher } from './watcher'

export function provideCodeActions (
  model: monaco.editor.ITextModel,
  _range: monaco.Range,
  _context: monaco.languages.CodeActionContext,
  _token: monaco.CancellationToken,
): monaco.languages.CodeActionList {
  const watcher = getOrSetWatcher(model)
  const actions: monaco.languages.CodeAction[] = []
  for (const warning of [
    ...watcher.checker.errors,
    ...watcher.checker.warnings,
  ]) {
    if (warning.options && warning.options.fix) {
      if (warning.options.fix.type === 'replace-with') {
        const { label, replace, with: withText } = warning.options.fix
        actions.push({
          diagnostics: [],
          title: label,
          kind: 'quickfix',
          edit: {
            edits: [
              {
                resource: model.uri,
                edit: {
                  range: toMonacoRange(replace),
                  text: withText,
                },
              },
            ],
          },
        })
      } else if (warning.options.fix.type === 'insert-before') {
        const { label, before, insert } = warning.options.fix
        const range = toMonacoRange(before)
        actions.push({
          diagnostics: [],
          title: label,
          kind: 'quickfix',
          edit: {
            edits: [
              {
                resource: model.uri,
                edit: {
                  range,
                  text: insert + model.getValueInRange(range),
                },
              },
            ],
          },
        })
      }
    }
  }
  return {
    actions,
    dispose: () => {},
  }
}
