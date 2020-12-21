import * as monaco from 'monaco-editor'

// Since packaging is done by you, you need
// to instruct the editor how you named the
// bundles that contain the web workers.
(window as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, _label: string) {
    return './editor.worker.bundle.js';
  }
}

const container = document.getElementById('container')

if (!container) throw new Error('Couldn\'t find container.')

monaco.editor.create(container, {
  value: [
    'function x() {',
    '\tconsole.log("Hello world!");',
    '}'
  ].join('\n')
})
