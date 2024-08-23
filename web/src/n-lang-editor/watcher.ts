import * as monaco from 'monaco-editor'
import {
  TypeCheckerResults,
  TypeChecker,
  NOT_FOUND,
  parse,
  Block,
} from 'n-lang'

interface Success {
  type: 'success'
}

interface Failure {
  type: 'failure'
  error: any
}

export class Watcher {
  model: monaco.editor.ITextModel
  status!: Success | Failure
  lastSuccess: Success | null = null
  checker!: TypeChecker
  results!: TypeCheckerResults
  listeners: Set<(watcher: Watcher) => void> = new Set()

  constructor(model: monaco.editor.ITextModel) {
    this.model = model

    this.update()
    model.onDidChangeContent(this.update.bind(this))
  }

  update() {
    let m = this.model
    this.checker = new TypeChecker({
      absolutePath(basePath, importPath) {
        return '_UNUSED'
      },
      provideFile(path) {
        if (path === './run.n') {
          try {
            const file = m.getValue()
            const block = parse(file, {
              ambiguityOutput: 'omit',
              loud: true,
            })
            if (block instanceof Block) {
              return { source: file, block }
            } else {
              return { source: file, error: block }
            }
          } catch (err) {
            if (err instanceof Error) {
              const nodeError: NodeJS.ErrnoException = err
              if (nodeError.code === 'ENOENT') {
                return NOT_FOUND
              }
            }
            throw err
          }
        }
        return NOT_FOUND
      },
    })
    this.checker
      .start('./run.n')
      .then((v) => {
        this.results = v
        this.status = { type: 'success' }
        this.lastSuccess = this.status
      })
      .catch((error) => (this.status = { type: 'failure', error }))
    for (const onUpdate of this.listeners) {
      onUpdate(this)
    }
  }

  listen(listener: (watcher: Watcher) => void, runImmediately?: boolean) {
    this.listeners.add(listener)
    if (runImmediately) {
      listener(this)
    }
  }
}

const watchers: Map<monaco.editor.ITextModel, Watcher> = new Map()

export function getOrSetWatcher(model: monaco.editor.ITextModel): Watcher {
  const watcher = watchers.get(model)
  if (watcher) {
    return watcher
  } else {
    const watcher = new Watcher(model)
    watchers.set(model, watcher)
    return watcher
  }
}
