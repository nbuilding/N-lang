import { CompilationContext } from './CompilationContext'

type CmdChainElement = {
  statements: string[]
  cmd: string
  resultName: string
}

/** A context for scopes inside a procedure. */
export class ProcedureContext {
  context: CompilationContext
  private _chain: CmdChainElement[] = []
  private _nextStatements: string[] = []
  chainModified = false

  constructor (context: CompilationContext) {
    this.context = context
  }

  /**
   * Adds the given element, which contains an expression evaluating to a cmd,
   * to a chain of cmds. `toStatements` will turn this into a
   * callback-hell-esque chain of callbacks.
   */
  addToChain (element: CmdChainElement) {
    if (this._nextStatements.length > 0) {
      element.statements = [...this._nextStatements, ...element.statements]
      this._nextStatements = []
    }
    this._chain.push(element)
    this.chainModified = true
  }

  /** Prepend statements to the last element added to the chain */
  prependStatements (statements: string[]) {
    const lastElement = this._chain[this._chain.length - 1]
    if (lastElement) {
      lastElement.statements = [...statements, ...lastElement.statements]
    } else {
      this._nextStatements = statements
    }
  }

  /**
   * Create a chain of callbacks.
   *
   * IMPURE! This clears the chain.
   */
  toStatements (statements: string[]): string[] {
    for (let i = this._chain.length; i--; ) {
      const { statements: s, cmd, resultName } = this._chain[i]
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
    this._chain = []
    return statements
  }
}
