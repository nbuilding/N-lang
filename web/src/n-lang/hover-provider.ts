import * as monaco from 'monaco-editor'
import { getOrSetWatcher } from './watcher'

export function provideHover (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _token: monaco.CancellationToken,
): monaco.languages.Hover {
  const watcher = getOrSetWatcher(model)
  const { lineNumber, column } = position
  return {
    contents: [
      { value: 'wow' }
    ]
  }
}
