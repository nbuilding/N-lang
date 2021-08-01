import { CompilationContext } from './CompilationContext'
import { CompilationScope } from './CompilationScope'

export class CompilationGlobalScope extends CompilationScope {
  // TEMP
  names = new Map([
    ['print', 'console.log'],
    ['intInBase10', 'String'],
    ['yes', 'a => a'],
    ['none', 'undefined'],
    ['false', 'false'],
    ['true', 'true'],
    ['range', 'n => _ => _ => [...Array(n).keys()]'],
  ])

  constructor (context: CompilationContext) {
    super(context)
  }

  getName (name: string): string {
    try {
      return super.getName(name)
    } catch {
      return `(function () { throw new Error("${name} not implemented."); })()`
    }
  }
}
