import * as ast from '../grammar/ast'
import NType from './n-type'
import { TopLevelScope } from './scope'

interface Warning {
  base: ast.Base
  message: string
}

export class TypeChecker {
  types: Map<ast.Base, NType>
  errors: Warning[]
  warnings: Warning[]

  constructor () {
    this.types = new Map()
    this.errors = []
    this.warnings = []
  }

  err (base: ast.Base, message: string) {
    this.errors.push({ base, message })
  }

  warn (base: ast.Base, message: string) {
    this.warnings.push({ base, message })
  }

  check (ast: ast.Block) {
    const scope = new TopLevelScope(this)
    scope.checkStatementType(ast)
  }
}
