import * as monaco from 'monaco-editor'

monaco.languages.register({ id: 'error' })

// Make everything red
monaco.languages.setMonarchTokensProvider('error', {
  tokenizer: {
    root: [
      [/.+/, 'sublimelinter.mark.error']
    ]
  }
})
