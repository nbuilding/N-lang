import { CompilationContext } from './CompilationContext'

type CmdChainElement = {
  statements: string[]
  cmd: string
  resultName: string
}

/** A context for scopes inside a procedure. */
export class ProcedureContext {
  context: CompilationContext
  chain: CmdChainElement[] = []

  constructor (context: CompilationContext) {
    this.context = context
  }

  toStatements (statements: string[]): string[] {
    for (let i = this.chain.length; i--; ) {
      const { statements: s, cmd, resultName } = this.chain[i]
      statements = [
        ...s,
        `return (${cmd}).then(function (${resultName}) {`,
        ...this.context.indent(statements),
        '});',
      ]
    }
    return statements
  }
}
