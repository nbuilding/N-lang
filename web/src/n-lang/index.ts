import * as monaco from 'monaco-editor'

import { language, configuration } from './tokens'
import { provideCompletionItems } from './competion-provider'
import { provideHover } from './hover-provider'

// Register a new language
monaco.languages.register({ id: 'n' })

monaco.languages.setLanguageConfiguration('n', configuration)

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('n', language)

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('n', {
  provideCompletionItems
})

monaco.languages.registerHoverProvider('n', {
  provideHover
})

/*
monaco.languages.registerCodeActionProvider('n', {
  provideCodeActions: (
    model: monaco.editor.ITextModel,
    range: monaco.Range,
    context: monaco.languages.CodeActionContext,
    token: monaco.CancellationToken,
  ): monaco.languages.CodeActionList => {
    return {
      actions: [
        {
          diagnostics: context.markers,
          title: 'wow a title',
          kind: 'error',
          edit: {
            edits: [
              {
                resource: model.uri,
                edit: {
                  range,
                  text: 'wow ok',
                },
                metadata: {
                  needsConfirmation: true,
                  label: 'label wow',
                  description: 'ok ok desc',
                },
              },
            ],
          },
        },
      ],
      dispose: () => {},
    }
  }
})
*/
