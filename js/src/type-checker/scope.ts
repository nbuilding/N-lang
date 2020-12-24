import * as ast from '../grammar/ast'
import { displayType } from '../utils/display-type'
import { TypeChecker } from "./checker"
import NType, * as types from "./n-type"

// TEMP?
enum Implementation {
  Compare,
  Iterate,
  Add,
  Subtract,
  Multiply,
  Divide,
  Modulo,
  Exponent,
  And,
  Or,
  Not,
  Negate,
}
const operatorToImpl: { [operator in ast.Operator]: Implementation } = {
  [ast.Operator.ADD]: Implementation.Add,
  [ast.Operator.MINUS]: Implementation.Subtract,
  [ast.Operator.MULTIPLY]: Implementation.Multiply,
  [ast.Operator.DIVIDE]: Implementation.Divide,
  [ast.Operator.MODULO]: Implementation.Modulo,
  [ast.Operator.EXPONENT]: Implementation.Exponent,
  [ast.Operator.AND]: Implementation.And,
  [ast.Operator.OR]: Implementation.Or,
}
const unaryOperatorToImpl: { [operator in ast.UnaryOperator]: Implementation } = {
  [ast.UnaryOperator.NOT]: Implementation.Not,
  [ast.UnaryOperator.NEGATE]: Implementation.Negate,
}

export class Scope {
  checker: TypeChecker
  parent?: Scope
  returnType?: NType
  values: Map<string, NType>
  implementations: Map<NType, Map<Implementation, [NType, NType]>>

  constructor (checker: TypeChecker, parent?: Scope, returnType?: NType) {
    this.checker = checker
    this.parent = parent
    this.returnType = returnType
    this.values = new Map()
    this.implementations = new Map()
  }

  implements (type: NType, impl: Implementation): [NType, NType] | null {
    const impls = this.implementations.get(type)
    if (impls) {
      const types = impls.get(impl)
      if (types) {
        return types
      }
    }
    if (this.parent) {
      return this.parent.implements(type, impl)
    } else {
      return null
    }
  }

  private _getExprType (expression: ast.Expression): [NType, ast.Expression?] {
    const displ = types.display
    if (expression instanceof ast.Literal) {
      if (expression instanceof ast.Number) {
        // IDEA: Maybe it should keep track of all the number types so when it's
        // resolved, all of these can be set to the resolved number type.
        return [types.number()]
      } else if (expression instanceof ast.String) {
        return [types.string()]
      } else {
        console.error(expression)
        this.checker.err(expression, `Internal problem: I wasn't expecting this kind of Literal (type ${displayType(expression)}). (This is a bug with the type checker.)`)
      }
    } else if (expression instanceof ast.Operation) {
      const [aType, aExit] = this.getExprType(expression.a)
      const [bType, bExit] = this.getExprType(expression.b)
      const exit = aExit || bExit
      // TODO: Technically, & and | short circuit for booleans, so it's not
      // exactly necessary to check if they'll exit.
      if (exit) exit(expression, `I'll never perform this ${ast.operatorToString(expression.type)}`)
      let returnType
      // Special case for exponentiation because it goes right to left
      if (expression.type === ast.Operator.EXPONENT) {
        if (!bType) return [null]
        const impl = this.implements(bType, operatorToImpl[expression.type])
        if (!impl) {
          this.checker.err(expression, `${displ(bType)} cannot perform exponentiation.`)
          return [null]
        }
        const [idealOtherType, implReturnType] = impl
        if (aType && types.is(idealOtherType, aType)) {
          this.checker.err(expression, `${displ(bType)} performs exponentiation with ${displ(idealOtherType)}, not ${displ(aType)}.`)
        }
        returnType = implReturnType
      } else {
        if (!aType) return [null]
        const impl = this.implements(aType, operatorToImpl[expression.type])
        if (!impl) {
          this.checker.err(expression, `${displ(aType)} cannot perform ${ast.operatorToString(expression.type)}.`)
          return [null]
        }
        const [idealOtherType, implReturnType] = impl
        if (bType && !types.is(idealOtherType, bType)) {
          this.checker.err(expression, `${displ(aType)} performs ${ast.operatorToString(expression.type)} with ${displ(idealOtherType)}, not ${displ(bType)}.`)
        }
        returnType = implReturnType
      }
      return [returnType]
    } else if (expression instanceof ast.UnaryOperation) {
      const [type, exit] = this.getExprType(expression.value)
      if (exit) exit(expression, `I'll never perform this ${ast.unaryOperatorToString(expression.type)} operation`)
      if (!type) return [null]
      const impl = this.implements(type, unaryOperatorToImpl[expression.type])
      if (impl) {
        const [, returnType] = impl
        return [returnType]
      } else {
        this.checker.err(expression, `${displ(type)} cannot perform ${ast.unaryOperatorToString(expression.type)}.`)
        return [null]
      }
    } else if (expression instanceof ast.Comparisons) {
      let warned = false
      for (const comparison of expression.comparisons) {
        const { type, a, b } = comparison
        const [aType, aExit] = this.getExprType(a)
        const [bType, bExit] = this.getExprType(b)
        if (aType && bType) {
          if (aType !== bType) {
            this.checker.err(comparison, `I can't compare ${displ(aType)} and ${displ(bType)} since they're different types.`)
          } else if (types.isFunc(aType)) {
            this.checker.err(comparison, `I can't compare ${displ(aType)} because it's rather complicated to compare functions.`)
          } else if (type !== ast.Compare.EQUAL && type !== ast.Compare.NEQ) {
            if (!this.implements(aType, Implementation.Compare)) {
              this.checker.err(comparison, `I can't compare ${displ(aType)} values.`)
            }
          }
        }
        const exit = aExit || bExit
        if (!warned && exit) {
          warned = true
          exit(comparison, 'I\'ll never make this comparison')
        }
      }
      return [types.bool()]
    } else if (expression instanceof ast.CallFunc) {
      const [fnInitType, fnExit] = this.getExprType(expression.func)
      if (fnExit) fnExit(expression.func, 'I\'ll never call this function')
      if (fnInitType && !types.isFunc(fnInitType)) {
        this.checker.err(expression.func, `I cannot run ${displ(fnInitType)} because it is not a function.`)
      }
      let fnType = fnInitType
      let argNum = 1
      for (const param of expression.params) {
        const [type, exit] = this.getExprType(param)
        if (exit) exit(param, 'I\'ll never use this argument for this function')
        if (fnType) {
          if (types.isFunc(fnType)) {
            const { takes, returns } = fnType
            if (!types.is(takes, type)) {
              this.checker.err(param, `${displ(fnInitType)}'s argument #${argNum} takes ${displ(takes)}, not ${displ(type)}.`)
            }
            fnType = returns
          } else {
            this.checker.err(param, `${displ(fnInitType)} does not take an argument #${argNum}.`)
          }
        }
        argNum++
      }
      return types.isFunc(fnInitType) ? [fnType] : [null]
    } else if (expression instanceof ast.Print) {
      const [type, exit] = this.getExprType(expression.value)
      if (exit) exit(expression, 'This will never print')
      return [type]
    } else if (expression instanceof ast.Return) {
      const [type] = this.getExprType(expression.value)
      if (!this.returnType) {
        this.checker.err(expression, `You can't return outside a function.`)
        return [null]
      } else {
        if (type && type !== this.returnType) {
          this.checker.err(expression.value, `You returned a ${types.display(type)} in a function that is meant to return a ${types.display(this.returnType)}`)
        }
        return [types.never(), expression]
      }
    } else if (expression instanceof ast.If) {
      const [condType, exit] = this.getExprType(expression.condition)
      if (exit) exit(expression.condition, 'I\'ll never check the condition')
      if (!types.isBool(condType)) {
        this.checker.err(expression.condition, `The condition should return a boolean.`)
      }
      const [ifTrueType, ifTrueExit] = this.getExprType(expression.then)
      if (expression.else) {
        const [ifFalseType, ifFalseExit] = this.getExprType(expression.else)
        const exit = ifTrueExit && ifFalseExit ? expression : undefined
        if (!types.is(ifTrueType, ifFalseType)) {
          this.checker.err(expression, `The types of either branch, ${displ(ifTrueType)} and ${displ(ifFalseType)}, are not the same.`)
          return [null, exit]
        }
        // There may be good reason to have both branches exit, so we aren't
        // warning here.
        return [ifTrueType, exit]
      } else {
        this.checker.warn(expression, 'Unimplemented: I currently cannot return values from conditionals without an "else" branch.')
        return [null]
      }
    } else if (expression instanceof ast.Identifier) {
      // TODO
    } else if (expression instanceof ast.Function) {
      // TODO
    } else if (expression instanceof ast.For) {
      // TODO
    } else if (expression instanceof ast.Block) {
      // TODO
    } else {
      console.error(expression)
      this.checker.err(expression, `Internal problem: I wasn't expecting this kind of Expression (type ${displayType(expression)}). (This is a bug with the type checker.)`)
    }
  }

  // Wrapper method to check if
  getExprType (expression: ast.Expression): [NType, ((expr: ast.Base, message: string) => void)?] {
    const maybeType = this.checker.types.get(expression)
    if (maybeType !== undefined) return [maybeType]
    const [type, exit] = this._getExprType(expression)
    this.checker.types.set(expression, type)
    return [
      type,
      (expr, message) => {
        this.checker.warn(expr, `${message} because the expression will return out of the function.`, {
          exit
        })
      }
    ]
  }

  checkStatementType (statement: ast.Statement) {
    if (statement instanceof ast.ImportStmt) {
      // TODO
    } else if (statement instanceof ast.VarStmt) {
      // TODO
    } else {
      this.getExprType(statement)
    }
  }
}

export class TopLevelScope extends Scope {
  constructor (checker: TypeChecker) {
    super(checker)

    // Global variables and functions
    this.values.set('false', types.bool())
    this.values.set('true', types.bool())

    // Global implementations
    // TODO: This isn't ideal.
    this.implementations.set(types.int(), new Map([
      [Implementation.Compare, [null, null]],
      [Implementation.Iterate, [null, types.int()]],
      [Implementation.Negate, [null, types.int()]],
      [Implementation.Add, [types.int(), types.int()]],
      [Implementation.Subtract, [types.int(), types.int()]],
      [Implementation.Multiply, [types.int(), types.int()]],
      [Implementation.Divide, [types.int(), types.int()]],
      [Implementation.Modulo, [types.int(), types.int()]],
      // Negative powers can lead to
      [Implementation.Exponent, [types.int(), types.float()]],
      [Implementation.And, [types.int(), types.int()]],
      [Implementation.Or, [types.int(), types.int()]],
      [Implementation.Not, [null, types.int()]],
    ]))
    this.implementations.set(types.float(), new Map([
      [Implementation.Compare, [null, null]],
      [Implementation.Negate, [null, types.float()]],
      [Implementation.Add, [types.float(), types.float()]],
      [Implementation.Subtract, [types.float(), types.float()]],
      [Implementation.Multiply, [types.float(), types.float()]],
      [Implementation.Divide, [types.float(), types.float()]],
      [Implementation.Modulo, [types.float(), types.float()]],
      [Implementation.Exponent, [types.float(), types.float()]],
    ]))
    this.implementations.set(types.string(), new Map([
      [Implementation.Add, [types.string(), types.string()]],
      [Implementation.Multiply, [types.int(), types.string()]],
    ]))
    this.implementations.set(types.bool(), new Map([
      [Implementation.And, [types.bool(), types.bool()]],
      [Implementation.Or, [types.bool(), types.bool()]],
      [Implementation.Not, [null, types.bool()]],
    ]))
  }
}
