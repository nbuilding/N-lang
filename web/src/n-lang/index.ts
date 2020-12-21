import * as monaco from 'monaco-editor'

import { language, configuration } from './tokens'

// Register a new language
monaco.languages.register({ id: 'n' })

monaco.languages.setLanguageConfiguration('n', configuration)

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('n', language)

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('n', {
  provideCompletionItems: (_model: monaco.editor.ITextModel, _position: monaco.Position, _context: monaco.languages.CompletionContext, _token: monaco.CancellationToken): monaco.languages.CompletionList => {
    const suggestions: monaco.languages.CompletionItem[] = [
      {
        label: 'simpleText',
        kind: monaco.languages.CompletionItemKind.Text,
        insertText: 'simpleText',
        range: { endColumn: 0, endLineNumber: 0, startColumn: 0, startLineNumber: 0 },
      },
      {
        label: 'testing',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'testing(${1:condition})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: { endColumn: 0, endLineNumber: 0, startColumn: 0, startLineNumber: 0 },
      },
      {
        label: 'ifelse',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: [
          'if ${1:condition} then',
          '\t$0',
          'else',
          '\t'
        ].join('\n'),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If-Else Statement',
        range: { endColumn: 0, endLineNumber: 0, startColumn: 0, startLineNumber: 0 },
      }
    ]
    return { suggestions }
  }
})
