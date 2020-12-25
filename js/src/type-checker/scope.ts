import * as ast from '../grammar/ast'
import { displayType } from '../utils/display-type'
import { TypeChecker } from "./checker"
import { Module } from './modules'
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

export class Scope extends Module {
  checker: TypeChecker
  parent?: Scope
  returnType?: NType
  implementations: Map<NType, Map<Implementation, [NType, NType]>>

  constructor (checker: TypeChecker, parent?: Scope, returnType?: NType) {
    super(new Map(), new Map(), new Map())
    this.checker = checker
    this.parent = parent
    this.returnType = returnType
    this.implementations = new Map()
  }

  getModule (moduleName: string): Module | null | undefined {
    const module = this.modules.get(moduleName)
    if (module !== undefined) {
      return module
    } else if (this.parent) {
      return this.parent.getModule(moduleName)
    } else {
      return null
    }
  }

  resolveModuleSource (moduleNames: string[]): Module | string | null {
    let source: Module = this
    if (moduleNames.length) {
      const [moduleName, ...innerModules] = moduleNames
      const module = this.getModule(moduleName)
      if (!module) {
        if (module === null) {
          return null
        } else if (this.parent) {
          return this.resolveModuleSource(moduleNames)
        } else {
          return `I do not know of a module named "${moduleName}" in this scope.`
        }
      }
      let lastModuleName = moduleName
      for (const moduleName of innerModules) {
        const module = source.getModule(moduleName)
        if (module) {
          source = module
        } else {
          return `Module ${lastModuleName} does not have a submodule named "${moduleName}."`
        }
        lastModuleName = moduleName
      }
    }
    return source
  }

  getValue (id: ast.Identifier): NType | string {
    const { modules, name } = id
    const source = this.resolveModuleSource(modules)
    if (!source || typeof source === 'string') return source
    const value = source.values.get(name)
    if (value !== undefined) {
      return value
    } else if (modules.length === 0 && this.parent) {
      return this.parent.getValue(id)
    } else {
      return `I can't find a variable with the name ${name} in this scope.`
    }
  }

  getType (typeId: ast.Identifier): NType | string {
    const { modules, name } = typeId
    const source = this.resolveModuleSource(modules)
    if (!source || typeof source === 'string') return source
    const type = source.types.get(name)
    if (type) {
      return type
    } else if (modules.length === 0 && this.parent) {
      return this.parent.getType(typeId)
    } else {
      return `I can't find a type with the name ${name} in this scope.`
    }
  }

  astToType (typeId: ast.Identifier): NType {
    const type = this.getType(typeId)
    if (typeof type === 'string') {
      this.checker.err(typeId, type)
      return null
    } else {
      return type
    }
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
    const displ = (type: NType) => this.checker.displayType(type)
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
        return [null]
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
            if (type && !types.is(takes, type)) {
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
        const neitherBranchNever = !types.isNever(ifTrueType) && !types.isNever(ifFalseType)
        if (!ifTrueType || !ifFalseType) {
          return [null, exit]
        } else if (neitherBranchNever && !types.is(ifTrueType, ifFalseType)) {
          this.checker.err(expression, `The types of either branch, ${displ(ifTrueType)} and ${displ(ifFalseType)}, are not the same.`)
          return [null, exit]
        }
        // There may be good reason to have both branches exit, so we aren't
        // warning here.
        return [
          ifTrueType && ifFalseType
            // If both branches return, then the if-else's type shall be never.
            ? (types.isNever(ifTrueType) ? ifFalseType : ifTrueType)
            : null,
          exit
        ]
      } else {
        // TODO
        this.checker.warn(expression, 'Unimplemented: I currently cannot return values from conditionals without an "else" branch.')
        return [null]
      }
    } else if (expression instanceof ast.Identifier) {
      const value = this.getValue(expression)
      if (typeof value === 'string') {
        this.checker.err(expression, value)
        return [null]
      }
      return [value]
    } else if (expression instanceof ast.Function) {
      const returnType = this.astToType(expression.returnType)
      const scope = this.newScope(returnType)
      const fnTypes = []
      for (const declaration of expression.params) {
        const { name, type: maybeType } = declaration
        if (!maybeType) {
          this.checker.err(declaration, 'I need to know what type this parameter is.')
        }
        const type = maybeType ? this.astToType(maybeType) : null
        fnTypes.push(type)
        if (scope.values.has(name)) {
          this.checker.err(declaration, 'This is a duplicate parameter name.')
        }
        scope.values.set(name, type)
      }
      fnTypes.push(returnType)
      const [actualReturnType] = scope.getExprType(expression.body)
      if (returnType && actualReturnType && !types.is(returnType, actualReturnType)) {
        this.checker.err(expression.body, `The body of this function, which should return a ${displ(returnType)}, returns a ${displ(actualReturnType)}.`)
      }
      return [types.toFunc(fnTypes)]
    } else if (expression instanceof ast.For) {
      const [iterable] = this.getExprType(expression.value)
      const impl = this.implements(iterable, Implementation.Iterate)
      const scope = this.newScope()
      const { name, type } = expression.var
      scope.values.set(name, null)
      if (impl) {
        const [, iterated] = impl
        const resolvedType = type && this.astToType(type)
        if (type) {
          if (types.is(iterated, resolvedType)) {
            scope.values.set(name, iterated)
          } else if (resolvedType) {
            this.checker.err(expression.var, `Iterating over ${displ(iterable)} produces values of ${displ(iterated)}, not ${displ(resolvedType)}.`)
          }
        }
      } else if (iterable) {
        this.checker.err(expression.value, `I can't iterate over ${displ(iterable)}.`)
      }
      // The for loop will not warn about exits, so using the private method to
      // pass on the expression directly.
      const [bodyType, exit] = scope._getExprType(expression.body)
      // TODO: generics???
      return [bodyType && this.checker.global.defTypes.list, exit]
    } else if (expression instanceof ast.Block) {
      const scope = this.newScope()
      let exited = false
      let warned = false
      let lastType
      for (const statement of expression.statements) {
        const [type, exit] = scope.checkStatementType(statement)
        if (type !== undefined) {
          lastType = type
        }
        if (exited) {
          if (!warned) {
            warned = true
            this.checker.warn(statement, 'All code beyond here will never run because the function has returned.')
          }
        } else if (exit) {
          exited = true
        }
      }
      // TODO: Warn about unused variables/types/imports
      // TODO: Warn about needlessly using `return` on the last line? (But only
      // if it's directly of a child)
      if (lastType === undefined) {
        // TODO: Warn only if used as expression?
        this.checker.err(expression, `The block doesn't return a value.`)
        return [null]
      } else {
        return [lastType]
      }
    } else {
      console.error(expression)
      this.checker.err(expression, `Internal problem: I wasn't expecting this kind of Expression (type ${displayType(expression)}). (This is a bug with the type checker.)`)
      return [null]
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
      exit
        ? (expr, message) => {
          this.checker.warn(expr, `${message} because the expression will return out of the function.`, {
            exit
          })
        }
        : undefined
    ]
  }

  checkStatementType (statement: ast.Statement): [NType?, boolean?] {
    const displ = (type: NType) => this.checker.displayType(type)
    if (statement instanceof ast.ImportStmt) {
      const module = this.checker.getModule(statement.name)
      if (module) {
        // Allows for "import ... as ..." statements in the future
        this.modules.set(statement.name, module)
      } else {
        this.modules.set(statement.name, null)
        this.checker.err(statement, `I don't know of a module named "${statement.name}".`)
      }
      return []
    } else if (statement instanceof ast.VarStmt) {
      const { name, type } = statement.declaration
      if (this.values.has(name)) {
        this.checker.err(statement.declaration, `You already defined ${name} in this scope.`)
      }
      const [resolvedType, exit] = this.getExprType(statement.value)
      if (exit) exit(statement, 'I will never create this variable')
      if (type) {
        const idealType = this.astToType(type)
        if (resolvedType && !types.is(idealType, resolvedType)) {
          this.checker.err(statement.value, `You set ${name}, which should be ${displ(idealType)}, to a value of ${displ(resolvedType)}`)
        }
        this.values.set(name, idealType)
      } else {
        this.values.set(name, types.isNever(resolvedType) ? null : resolvedType)
      }
      return [undefined, !!exit]
    } else {
      const [type, exit] = this.getExprType(statement)
      return [type, !!exit]
    }
  }

  newScope (returnType: NType | undefined = this.returnType): Scope {
    return new Scope(this.checker, this, returnType)
  }
}

export class TopLevelScope extends Scope {
  defTypes: { [name: string]: NType }

  constructor (checker: TypeChecker) {
    super(checker)

    // Global variables and functions
    this.values.set('false', types.bool())
    this.values.set('true', types.bool())
    this.values.set('intInBase10', types.func(types.int(), types.string()))

    // Global types
    this.types.set('str', types.string())
    this.types.set('int', types.int())
    this.types.set('float', types.float())
    this.types.set('bool', types.bool())
    this.defTypes = {
      list: types.custom('List', ['T']),
      maybe: types.custom('Maybe', ['T']),
      result: types.custom('Result', ['T', 'E']),
      cmd: types.custom('Cmd', ['T']),
    }
    this.types.set('List', this.defTypes.list)
    this.types.set('Maybe', this.defTypes.maybe)
    this.types.set('Result', this.defTypes.result)
    this.types.set('Cmd', this.defTypes.cmd)

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
