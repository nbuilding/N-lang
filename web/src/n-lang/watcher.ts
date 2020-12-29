import * as monaco from 'monaco-editor'
import { FileLines, TypeChecker } from 'n-lang'
import { Block } from 'n-lang/src/grammar/ast'

interface Success {
  type: 'success'
  ast: Block
}

interface Failure {
  type: 'failure'
  error: any
}

export class Watcher {
  model: monaco.editor.ITextModel
  file!: FileLines
  status!: Success | Failure
  lastSuccess: Success | null = null
  checker!: TypeChecker
  listeners: Set<(watcher: Watcher) => void> = new Set()

  constructor (model: monaco.editor.ITextModel) {
    this.model = model

    this.update()
    model.onDidChangeContent(this.update.bind(this))
  }

  update () {
    this.file = new FileLines(this.model.getValue())
    this.checker = new TypeChecker({
      colours: false
    })
    try {
      const ast = this.file.parse()
      this.checker.check(ast)
      this.status = { type: 'success', ast }
      this.lastSuccess = this.status
    } catch (error) {
      this.status = { type: 'failure', error }
    }
    for (const onUpdate of this.listeners) {
      onUpdate(this)
    }
  }

  listen (listener: (watcher: Watcher) => void, runImmediately?: boolean) {
    this.listeners.add(listener)
    if (runImmediately) {
      listener(this)
    }
  }
}

const watchers: Map<monaco.editor.ITextModel, Watcher> = new Map()

export function getOrSetWatcher (model: monaco.editor.ITextModel): Watcher {
  const watcher = watchers.get(model)
  if (watcher) {
    return watcher
  } else {
    const watcher = new Watcher(model)
    watchers.set(model, watcher)
    return watcher
  }
}
