import * as monaco from 'monaco-editor'
import { FileLines, TypeChecker, Warning, ParseError } from 'n-lang'

function toMarker (
  warning: Warning,
  severity: monaco.MarkerSeverity,
): monaco.editor.IMarkerData {
  return {
    severity,
    startLineNumber: warning.base.line,
    startColumn: warning.base.col,
    endLineNumber: warning.base.endLine,
    endColumn: warning.base.endCol,
    message: warning.message,
    source: 'run.n',
  }
}

// https://github.com/rcjsuen/dockerfile-language-service/blob/fb40a5d1504a8270cd21a533403d5bd7a0734a63/example/src/client.ts#L236-L252
export function displayDiagnostics (model: monaco.editor.ITextModel) {
  let lastDiagnosticMarkers: monaco.editor.IMarkerData[] = []
  function showDiagnostics () {
    const file = new FileLines(model.getValue())
    try {
      const ast = file.parse()
      const checker = new TypeChecker({
        colours: false
      })
      checker.check(ast)
      lastDiagnosticMarkers = [
        ...checker.errors.map(error => toMarker(error, monaco.MarkerSeverity.Error)),
        ...checker.warnings.map(warning => toMarker(warning, monaco.MarkerSeverity.Warning)),
      ]
      monaco.editor.setModelMarkers(model, 'n', lastDiagnosticMarkers)
    } catch (err) {
      // Avoid losing errors in the middle of typing (where there'll be syntax
      // errors)
      const markers = [...lastDiagnosticMarkers]
      if (err instanceof ParseError) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: err.message,
          startLineNumber: file.lines.length,
          startColumn: 1,
          endLineNumber: file.lines.length,
          endColumn: file.getLine(file.lines.length).length,
          source: 'run.n',
        })
      } else if (err.token) {
        const { line, col } = err.token
        const endLine = err.token.line + err.token.lineBreaks
        const lastLine = err.token.text.includes('\n')
          ? err.token.text.slice(err.token.text.lastIndexOf('\n') + 1)
          : err.token.text
        const endCol = err.token.col + lastLine.length
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: err.message,
          startLineNumber: line,
          startColumn: col,
          endLineNumber: endLine,
          endColumn: endCol,
          source: 'run.n',
        })
      } else if (err instanceof Error) {
        const match = err.message.match(/invalid syntax at line (\d+) col (\d+)/)
        if (match) {
          const [, line, col] = match
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: err.message,
            startLineNumber: +line,
            startColumn: +col,
            endLineNumber: +line,
            endColumn: +col + 1,
            source: 'run.n',
          })
        } else {
          console.dir(err)
        }
      } else {
        console.dir(err)
      }
      monaco.editor.setModelMarkers(model, 'n', markers)
    }
  }
  model.onDidChangeContent(showDiagnostics)
  showDiagnostics()
}
