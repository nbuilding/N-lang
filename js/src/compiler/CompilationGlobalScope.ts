import { CompilationContext } from './CompilationContext'
import { CompilationScope } from './CompilationScope'

export class CompilationGlobalScope extends CompilationScope {
  // TEMP
  names = new Map([
    ['print', 'console.log'],
    ['intInBase10', 'String'],
  ])

  constructor (context: CompilationContext) {
    super(context)
  }
}
