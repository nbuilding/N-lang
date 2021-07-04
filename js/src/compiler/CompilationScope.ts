import { CompilationContext } from "./CompilationContext"

export class CompilationScope {
  context: CompilationContext

  /**
   * Mapping of the variable names in the scope from those from the original N
   * code to their compiled names. (eg wow -> wow_0)
   */
  private _names: Map<string, string> = new Map()

  private _parent?: CompilationScope

  constructor (context: CompilationContext, parent?: CompilationScope) {
    this.context = context
    this._parent = parent
  }

  inner (): CompilationScope {
    return new CompilationScope(this.context, this)
  }
}
