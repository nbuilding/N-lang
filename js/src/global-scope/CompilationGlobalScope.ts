import { CompilationContext } from '../compiler/CompilationContext'
import { CompilationScope } from '../compiler/CompilationScope'

export class CompilationGlobalScope extends CompilationScope {
  constructor (context: CompilationContext) {
    super(context)
  }

  getName (name: string): string {
    return this.context.require(name)
  }
}
