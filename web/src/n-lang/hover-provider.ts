import * as monaco from 'monaco-editor'

export function provideHover (
  model: monaco.editor.ITextModel,
  _position: monaco.Position,
  _token: monaco.CancellationToken,
): monaco.languages.ProviderResult<monaco.languages.Hover> {
  return {
    contents: [
      {
        value: 'ok',
        supportThemeIcons: true
      }
    ]
  }
}
