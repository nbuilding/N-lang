import { CompilationContext } from './CompilationContext'
import { CompilationScope } from './CompilationScope'

export class CompilationGlobalScope extends CompilationScope {
  // TEMP
  names = new Map([
    ['print', 'console.log'],
    ['intInBase10', 'String'],
    ['yes', 'a => a'],
    ['false', 'false'],
    ['true', 'true'],
  ])

  constructor (context: CompilationContext) {
    super(context)
  }
}
