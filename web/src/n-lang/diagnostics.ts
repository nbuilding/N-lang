import * as monaco from 'monaco-editor'
import { Warning, ParseError } from 'n-lang'

import { editor } from '../editor/editor'
import { toMonacoRange } from '../utils'
import { Watcher } from './watcher'

function toMarker (
  warning: Warning,
  severity: monaco.MarkerSeverity,
): monaco.editor.IMarkerData {
  return {
    severity,
    message: warning.message
      + (warning.options && warning.options.tip ? '\n\nTip: ' + warning.options.tip : ''),
    source: 'run.n',
    ...toMonacoRange(warning.base),
  }
}

function getExpectationsFromErrMsg (err: string): string {
  const nearleyExpectRegex = /^A (.+) based on:$/gm
  const literals: Set<string> = new Set()
  const tokens: Set<string> = new Set()
  let match
  while ((match = nearleyExpectRegex.exec(err))) {
    const [, expectation] = match
    if (expectation[0] === '"') {
      literals.add(expectation)
    } else {
      tokens.add(expectation)
    }
  }
  if (tokens.size === 0) {
    if (literals.size === 0) {
      return 'I didn\'t expect anything.'
    }
    const literalsArr = [...literals]
    if (literalsArr.length === 1) {
      return `I expected ${literalsArr[0]}.`
    } else if (literalsArr.length === 2) {
      return `I expected ${literalsArr.join(' or ')}.`
    } else {
      const last = literalsArr.pop()
      return `I expected ${literalsArr.join(', ')}, or ${last}.`
    }
  } else {
    const tokensArr = [...tokens]
    return `I expected ${
      literals.size === 0
        ? ''
        : [...literals].join(', ') + (literals.size === 1 ? ' ' : ', ')
    }or one of the following:${
      tokensArr.map(token => `\n- a ${token}`).join('')
    }`
  }
}

// https://github.com/rcjsuen/dockerfile-language-service/blob/fb40a5d1504a8270cd21a533403d5bd7a0734a63/example/src/client.ts#L236-L252
export function displayDiagnostics (watcher: Watcher) {
  let oldDecorations: string[] = []
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

    const decorations: monaco.editor.IModelDeltaDecoration[] = markers.map(({
      startLineNumber,
      severity,
      message,
    }) => ({
      range: new monaco.Range(startLineNumber, 1, startLineNumber, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: severity === monaco.MarkerSeverity.Error
          ? 'codicon-error n-error'
          : 'codicon-warning n-warning',
        glyphMarginHoverMessage: { value: message },
      }
    }))
    oldDecorations = editor.deltaDecorations(oldDecorations, decorations)
  }
  watcher.listen(showDiagnostics, true)
}
