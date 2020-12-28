import * as monaco from "monaco-editor";

export function provideHover (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _token: monaco.CancellationToken,
): monaco.languages.Hover {
  const { lineNumber, column } = position
  return {
    contents: [
      { value: 'wow' }
    ]
  }
}
