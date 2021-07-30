import { Arguments } from '../ast/declaration/Arguments'
import { CompilationContext } from './CompilationContext'

export class CompilationScope {
  context: CompilationContext

  /**
   * Mapping of the variable names in the scope from those from the original N
   * code to their compiled names. (eg wow -> wow_0)
   */
  names: Map<string, string> = new Map()

  private _parent?: CompilationScope

  constructor (context: CompilationContext, parent?: CompilationScope) {
    this.context = context
    this._parent = parent
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

  inner (): CompilationScope {
    return new CompilationScope(this.context, this)
  }

  functionExpression (
    args: Arguments,
    getBody: (scope: CompilationScope) => string[],
    prefix = '',
    suffix = '',
  ): string[] {
    const scope = this.inner()
    const declarations = args.params.map(declaration => {
      const argName = scope.context.genVarName('argument')
      const statements = declaration.compileDeclaration(scope, argName)
      return { argName, statements }
    })
    let statements = getBody(scope)
    if (args.params.length === 0) {
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
