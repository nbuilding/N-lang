import * as monaco from 'monaco-editor'
import { Warning, ParseError } from 'n-lang'
import { Watcher } from './watcher'

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

function getExpectationsFromErrMsg (err: string): string {
  const nearleyExpectRegex = /^A (.+) based on:$/gm
  const expectations = []
  let match
  while ((match = nearleyExpectRegex.exec(err))) {
    const [, expectation] = match
    expectations.push(
      expectation[0] === '"'
        ? expectation :
        'a ' + expectation
    )
  }
  if (expectations.length === 1) {
    return `I expected to see ${expectations[0]}.`
  } else if (expectations.length === 2) {
    return `I expected to see ${expectations.join(' or ')}.`
  } else if (expectations.length > 2) {
    const last = expectations.pop()
    return `I expected to see ${expectations.join(', ')}, or ${last}.`
  } else {
    return 'At this point I didn\'t expect anything.'
  }
}

// https://github.com/rcjsuen/dockerfile-language-service/blob/fb40a5d1504a8270cd21a533403d5bd7a0734a63/example/src/client.ts#L236-L252
export function displayDiagnostics (watcher: Watcher) {
  function showDiagnostics () {
    const markers = watcher.lastSuccess ? [
      ...watcher.checker.errors.map(error => toMarker(error, monaco.MarkerSeverity.Error)),
      ...watcher.checker.warnings.map(warning => toMarker(warning, monaco.MarkerSeverity.Warning)),
    ] : []
    if (watcher.status.type !== 'success') {
      const { error: err } = watcher.status
      // Avoid losing errors in the middle of typing (where there'll be syntax
      // errors)
      if (err instanceof ParseError) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: err.message,
          startLineNumber: watcher.file.lines.length,
          startColumn: 1,
          endLineNumber: watcher.file.lines.length,
          endColumn: watcher.file.getLine(watcher.file.lines.length).length,
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
          message: `Syntax error: ${getExpectationsFromErrMsg(err.message)}`,
          startLineNumber: line,
          startColumn: col,
          endLineNumber: endLine,
          endColumn: endCol,
          source: 'run.n',
        })
      } else if (err instanceof Error) {
        const match = err.message.match(/(?:invalid syntax|Syntax error) at line (\d+) col (\d+)/)
        if (match) {
          const [, line, col] = match
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: `Syntax error: ${getExpectationsFromErrMsg(err.message)}`,
            startLineNumber: +line,
            startColumn: +col,
            endLineNumber: +line,
            endColumn: +col + 1,
            source: 'run.n',
          })
        } else {
          console.dir('Didn\'t match syntax error location finder', err)
        }
      } else {
        console.dir(err)
      }
    }
    monaco.editor.setModelMarkers(watcher.model, 'n', markers)
  }
  watcher.listen(showDiagnostics, true)
}
