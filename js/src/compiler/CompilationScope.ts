import { Arguments } from '../ast/declaration/Arguments'
import { CompilationContext } from './CompilationContext'
import { ProcedureContext } from './ProcedureContext'

export class CompilationScope {
  context: CompilationContext

  /**
   * Mapping of the variable names in the scope from those from the original N
   * code to their compiled names. (eg wow -> wow_0)
   */
  names: Map<string, string> = new Map()

  private _parent?: CompilationScope

  procedure?: ProcedureContext

  constructor (
    context: CompilationContext,
    parent?: CompilationScope,
    procedure?: ProcedureContext,
  ) {
    this.context = context
    this._parent = parent
    this.procedure = procedure
  }

  /** Throws an error if the name can't be found. */
  getName (name: string): string {
    const varName = this.names.get(name)
    if (varName) {
      return varName
    } else if (this._parent) {
      return this._parent.getName(name)
    } else {
      throw new ReferenceError(`Cannot get name ${name}`)
    }
  }

  /**
   * Specify `isProcedure` to prevent the scope inheriting the procedure-ness of
   * the outer scope.
   */
  inner (isProcedure?: boolean): CompilationScope {
    return new CompilationScope(
      this.context,
      this,
      isProcedure !== undefined
        ? isProcedure
          ? new ProcedureContext(this.context)
          : undefined
        : this.procedure,
    )
  }

  functionExpression (
    args: Arguments | { argName: string; statements: string[] }[],
    getBody: (scope: CompilationScope) => string[],
    prefix = '',
    suffix = '',
    isProcedure = false,
  ): string[] {
    const scope = this.inner(isProcedure)
    const declarations =
      args instanceof Arguments
        ? args.params.map(declaration => {
            const argName = scope.context.genVarName('argument')
            const statements = declaration.compileDeclaration(scope, argName)
            return { argName, statements }
          })
        : args
    let statements = getBody(scope)
    if (declarations.length === 0) {
      return [
        `${prefix}function () {`,
        ...this.context.indent(statements),
        `}${suffix}`,
      ]
    }
    for (let i = declarations.length; i--; ) {
      const { argName, statements: declS } = declarations[i]
      if (i === 0) {
        statements = [
          `${prefix}function (${argName}) {`,
          ...this.context.indent([...declS, ...statements]),
          `}${suffix}`,
        ]
      } else {
        statements = [
          `return function (${argName}) {`,
          ...this.context.indent([...declS, ...statements]),
          '};',
        ]
      }
    }
    return statements
  }
}
