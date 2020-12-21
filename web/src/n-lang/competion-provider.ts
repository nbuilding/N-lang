import * as monaco from 'monaco-editor'

export function provideCompletionItems (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  _context: monaco.languages.CompletionContext,
  _token: monaco.CancellationToken
): monaco.languages.CompletionList {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  })
  const word = model.getWordUntilPosition(position)
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  }

  if (/\bimport\s+\w*$/.test(textUntilPosition)) {
    return {
      suggestions: ['fek', 'future'].map(moduleName => ({
        label: moduleName,
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: moduleName,
        range,
      }))
    }
  }

  const suggestions: monaco.languages.CompletionItem[] = [
    ...['import', 'print'].map(keyword => ({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: keyword + ' ',
      range
    })),
    {
      label: 'ifelse',
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: [
        'if ${1:condition} then',
        '\t$2',
        'else',
        '\t$0',
      ].join('\n'),
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'If-else expression',
      range: range,
    },
    {
      label: 'loop',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: [
        '> loop ${1:10} ${2:i}: int |',
        '\t$0',
        '<',
      ].join('\n'),
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Loop statement',
      range: range,
    },
    {
      label: 'define',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: [
        '> ${1:myFunction} $2 ${3:-> $4 }|',
        '\t$0',
        '<',
      ].join('\n'),
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Define a function',
      range: range,
    },
    {
      label: 'var',
      kind: monaco.languages.CompletionItemKind.Variable,
      insertText: 'var ${1:name}: ${2:type} < ${3:value}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Declare a variable',
      range: range,
    }
  ]
  return { suggestions }
}
