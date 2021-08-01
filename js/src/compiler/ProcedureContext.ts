import { CompilationContext } from './CompilationContext'

type CmdChainElement = {
  statements: string[]
  cmd: string
  resultName: string
}

type StackElement = {
  chain: CmdChainElement[]
  modified: boolean
  modifiedEver: boolean
}

/** A context for scopes inside a procedure. */
export class ProcedureContext {
  context: CompilationContext

  /**
   * A stack of chains. Nested blocks each have their own chains, but all
   * expressions within a statement share the same chain.
   */
  private _stack: StackElement[] = []

  private _nextStatements: string[] = []

  constructor (context: CompilationContext) {
    this.context = context
  }

  /**
   * Pushes a new chain to the stack.
   */
  newChain () {
    this._stack.push({
      chain: [],
      modified: false,
      modifiedEver: false,
    })
  }

  private _lastItem (): StackElement {
    return this._stack[this._stack.length - 1]
  }

  /**
   * Adds the given element, which contains an expression evaluating to a cmd,
   * to a chain of cmds. `toStatements` will turn this into a
   * callback-hell-esque chain of callbacks.
   */
  addToChain (element: CmdChainElement) {
    const item = this._lastItem()
    if (this._nextStatements.length > 0) {
      element.statements = [...this._nextStatements, ...element.statements]
      this._nextStatements = []
    }
    item.chain.push(element)
    item.modified = true
    item.modifiedEver = true
  }

  /**
   * Prepend statements to the last element added to the chain like tag-alongs.
   */
  prependStatements (statements: string[]) {
    const { chain } = this._lastItem()
    const lastElement = chain[chain.length - 1]
    if (lastElement) {
      lastElement.statements = [...statements, ...lastElement.statements]
    } else {
      this._nextStatements = statements
    }
  }

  /**
   * Returns whether the chain had been modified.
   *
   * IMPURE: This will reset the `modified` property, so subsequent calls will
   * return `false`.
   */
  wasModified (): boolean {
    const item = this._lastItem()
    const modified = item.modified
    item.modified = false
    return modified
  }

  /**
   * Create a chain of callbacks.
   */
  toStatements (statements: string[]): string[] {
    const { chain } = this._lastItem()
    for (let i = chain.length; i--; ) {
      const { statements: s, cmd, resultName } = chain[i]
      if (statements.length > 0) {
        statements = [
          ...s,
          `(${cmd})(function (${resultName}) {`,
          ...this.context.indent(statements),
          '});',
        ]
      } else {
        statements = [...s, `${cmd}(${this.context.helpers.noop});`]
      }
    }
    return statements
  }

  /**
   * Pops the last chain off the stack.
   */
  endChain () {
    const item = this._stack.pop()
    if (item?.modifiedEver) {
      // Mark the parent as `modified` (TODO: Requires more thought)
      const parent = this._lastItem()
      parent.modified = true
      parent.modifiedEver = true
    }
  }
}
