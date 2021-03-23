import { Scope } from './Scope'
import { TypeCheckerResult } from './TypeChecker'
import { bool, char, float, int, str } from './types/builtins'

export class GlobalScope extends Scope {
  constructor (checker: TypeCheckerResult) {
    super(checker)

    this.types.set('str', str)
    this.types.set('int', int)
    this.types.set('float', float)
    this.types.set('bool', bool)
    this.types.set('char', char)
  }
}
