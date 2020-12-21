import * as monaco from 'monaco-editor'

import { language, configuration } from './tokens'
import { provideCompletionItems } from './competion-provider'

// Register a new language
monaco.languages.register({ id: 'n' })

monaco.languages.setLanguageConfiguration('n', configuration)

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('n', language)

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('n', {
  provideCompletionItems
})
