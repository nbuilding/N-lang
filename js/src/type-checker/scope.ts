import * as ast from '../grammar/ast'
import { displayType } from '../utils/display-type'
import { TypeChecker } from './checker'
import { Module } from './modules'
import NType, * as types from './n-type'

interface ScopeContext {
  asStatement?: boolean
  functionBody?: boolean
}

export class Scope extends Module {
  checker: TypeChecker
  parent?: Scope
  returnType?: NType
  unusedModules: Map<string, ast.Base>
  unusedValues: Map<string, ast.Base>
  unusedTypes: Map<string, ast.Base>

  constructor (checker: TypeChecker, parent?: Scope, returnType?: NType) {
    super(new Map(), new Map(), new Map())
    this.checker = checker
    this.parent = parent
    this.returnType = returnType
    this.unusedModules = new Map()
    this.unusedValues = new Map()
    this.unusedTypes = new Map()
  }

  getModule (moduleName: string): Module | null | undefined {
    const module = this.modules.get(moduleName)
    if (module !== undefined) {
      this.unusedModules.delete(moduleName)
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
      if (source === this) {
        this.unusedValues.delete(name)
      }
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
      if (source === this) {
        this.unusedTypes.delete(name)
      }
      return type
    } else if (modules.length === 0 && this.parent) {
      return this.parent.getType(typeId)
    } else {
      return `I can't find a type with the name ${name} in this scope.`
    }
  }

  astToType (type: ast.Type): NType {
    if (type instanceof ast.FuncType) {
      const takes = this.astToType(type.takes)
      const returns = this.astToType(type.returns)
      if (takes && returns) {
        return types.func(takes, returns)
      }
    } else if (type instanceof ast.UnitType) {
      return types.unit()
    } else if (type instanceof ast.TupleType) {
      const types = type.types.map(type => this.astToType(type))
      if (!types.includes(null)) {
        return types
      }
    } else if (type instanceof ast.Identifier) {
      const resolvedType = this.getType(type)
      if (typeof resolvedType === 'string') {
        this.checker.err(type, resolvedType)
        return null
      } else {
        return resolvedType
      }
    }
    return null
  }

  private _resolveNumberAs (numberType: types.NNumber, as: NType) {
    const { toResolve } = numberType
    for (const base of toResolve) {
      this.checker.types.set(base, as)
    }
  }

  private _ensureMatch (a: NType, b: NType, base: ast.Base, message: string): NType {
    if (a === null || b === null) {
      return null
    } else if (types.is(a, b)) {
      // NOTE: If both types are number, then this will return number.
      return a
    } else if (types.isTuple(a) && types.isTuple(b) && a.length === b.length) {
      const type = a.map((type, i) => this._ensureMatch(type, b[i], base, message))
      if (type.includes(null)) {
        return null
      }
      return type
    } else if (types.isNumberResolvable(a) && types.isNumber(b)) {
      this._resolveNumberAs(b, a)
      return a
    } else if (types.isNumberResolvable(b) && types.isNumber(a)) {
      this._resolveNumberAs(a, b)
      return b
    } else {
      this.checker.err(base, message)
      return null
    }
  }

  warnExit (exit: ast.Base, expr: ast.Base, message: string) {
    this.checker.warn(expr, `${message} because the expression will return out of the function.`, {
      exit
    })
  }

  private _getExprType (
    expression: ast.Expression,
    context: ScopeContext = {}
  ): [NType, ast.Base?] {
    const displ = (type: NType) => this.checker.displayType(type)
    if (expression instanceof ast.Literal) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store the value anywhere, so this is redundant.')
      if (expression instanceof ast.Number) {
        return [types.number()]
      } else if (expression instanceof ast.Float) {
        return [types.float()]
      } else if (expression instanceof ast.String) {
        return [types.string()]
      } else if (expression instanceof ast.Char) {
        return [types.char()]
      } else if (expression instanceof ast.Unit) {
        return [types.unit()]
      } else {
        console.error(expression)
        this.checker.err(expression, `Internal problem: I wasn't expecting this kind of Literal (type ${displayType(expression)}). (This is a bug with the type checker.)`)
        return [null]
      }
    } else if (expression instanceof ast.Operation) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store the result anywhere, so this is redundant.')
      let [aType, aExit] = this.getExprType(expression.a)
      const [bType, bExit] = this.getExprType(expression.b)
      let returnType
      let shortCircuit = false
      // TODO: Operator overloading?
      if (types.isNumber(aType)) {
        // Assumes that both operands are the same type
        if (types.isInt(bType) || types.isFloat(bType)) {
          this._resolveNumberAs(aType, bType)
          aType = bType
        } else if (types.isString(bType)) {
          this._resolveNumberAs(aType, types.int())
          aType = types.int()
        }
      }
      if (types.isNumber(aType) && types.isNumber(bType)) {
        // At this point, both operands are numbers
        if ([
          ast.Operator.ADD,
          ast.Operator.MINUS,
          ast.Operator.MULTIPLY,
          ast.Operator.DIVIDE,
          ast.Operator.MODULO,
          ast.Operator.EXPONENT,
        ].includes(expression.type)) {
          returnType = aType.merge(bType)
        } else if ([
          ast.Operator.AND,
          ast.Operator.OR,
        ].includes(expression.type)) {
          // Only int supports these operations, so therefore both numbers are
          // ints.
          this._resolveNumberAs(aType, types.int())
          this._resolveNumberAs(bType, types.int())
          returnType = types.int()
        }
      } else if (types.isInt(aType)) {
        if (expression.type === ast.Operator.MULTIPLY && types.isString(bType)) {
          // String multiplication like in Python
          returnType = types.string()
        } else if ([
          ast.Operator.ADD,
          ast.Operator.MINUS,
          ast.Operator.MULTIPLY,
          ast.Operator.DIVIDE,
          ast.Operator.MODULO,
          // Negative exponents shall be rounded to zero
          ast.Operator.EXPONENT,
          ast.Operator.AND,
          ast.Operator.OR,
        ].includes(expression.type)) {
          // These operations are int op int, so bType must be an int.
          returnType = this._ensureMatch(aType, bType, expression, `${displ(aType)} performs ${ast.operatorToString(expression.type)} with ${displ(types.int())}, not ${displ(bType)}.`)
        }
      } else if (types.isFloat(aType)) {
        if ([
          ast.Operator.ADD,
          ast.Operator.MINUS,
          ast.Operator.MULTIPLY,
          ast.Operator.DIVIDE,
          ast.Operator.MODULO,
          ast.Operator.EXPONENT,
        ].includes(expression.type)) {
          // These operations are float op float, so bType must be an float.
          returnType = this._ensureMatch(aType, bType, expression, `${displ(aType)} performs ${ast.operatorToString(expression.type)} with ${displ(types.float())}, not ${displ(bType)}.`)
        }
      } else if (types.isBool(aType)) {
        if ([
          ast.Operator.AND,
          ast.Operator.OR,
        ].includes(expression.type)) {
          // These operations are bool op bool, so bType must be an bool.
          returnType = this._ensureMatch(aType, bType, expression, `${displ(aType)} performs ${ast.operatorToString(expression.type)} with ${displ(types.bool())}, not ${displ(bType)}.`)
          shortCircuit = true
        }
      } else if (types.isString(aType)) {
        if (expression.type === ast.Operator.ADD && types.isString(bType)) {
          returnType = types.string()
        } else if (expression.type === ast.Operator.MULTIPLY && (types.isInt(bType) || types.isNumber(bType))) {
          if (types.isNumber(bType)) {
            this._resolveNumberAs(bType, types.int())
          }
          // Commutative case for int * string
          returnType = types.string()
        }
      }
      if (shortCircuit) {
        if (bExit) this.warnExit(bExit, expression, `I'll never perform this ${ast.operatorToString(expression.type)} operation`)
      } else {
        const exit = aExit || bExit
        if (exit) this.warnExit(exit, expression, `I'll never perform this ${ast.operatorToString(expression.type)} operation`)
      }
      if (returnType === undefined) {
        if (aType && bType) {
          this.checker.err(expression, `${displ(aType)} and ${displ(bType)} cannot perform ${ast.operatorToString(expression.type)}.`)
        }
        returnType = null
      }
      return [returnType]
    } else if (expression instanceof ast.UnaryOperation) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store the result anywhere, so this is redundant.')
      const [type, exit] = this.getExprType(expression.value)
      if (exit) this.warnExit(exit, expression, `I'll never perform this ${ast.unaryOperatorToString(expression.type)} operation`)
      let returnType
      // TODO: Operator overloading?
      if (types.isNumber(type)) {
        if (expression.type === ast.UnaryOperator.NEGATE) {
          returnType = type
        } else if (expression.type === ast.UnaryOperator.NOT) {
          this._resolveNumberAs(type, types.int())
          returnType = types.int()
        }
      } else if (types.isInt(type)) {
        if ([
          ast.UnaryOperator.NEGATE,
          ast.UnaryOperator.NOT,
        ].includes(expression.type)) {
          returnType = type
        }
      } else if (types.isFloat(type)) {
        if (expression.type === ast.UnaryOperator.NEGATE) {
          returnType = type
        }
      } else if (types.isBool(type)) {
        if (expression.type === ast.UnaryOperator.NOT) {
          returnType = type
        }
      }
      if (returnType === undefined) {
        if (type) {
          this.checker.err(expression, `${displ(type)} cannot perform ${ast.unaryOperatorToString(expression.type)}.`)
        }
        returnType = null
      }
      return [returnType]
    } else if (expression instanceof ast.Comparisons) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store the result anywhere, so this is redundant.')
      let warned = false
      for (const comparison of expression.comparisons) {
        const { type, a, b } = comparison
        const [aType, aExit] = this.getExprType(a)
        const [bType, bExit] = this.getExprType(b)
        if (aType && bType) {
          const result = this._ensureMatch(aType, bType, comparison, `I can't compare ${displ(aType)} and ${displ(bType)} since they're different types.`)
          if (types.isFunc(aType)) {
            this.checker.err(comparison, `I can't compare ${displ(aType)} because it's rather complicated to compare functions.`)
          }
          // TODO: Custom comparisons?
          if (type !== ast.Compare.EQUAL && type !== ast.Compare.NEQ) {
            if (result && !(types.isInt(result) || types.isFloat(result))) {
              this.checker.err(comparison, `I can't compare ${displ(result)} values.`)
            }
          }
        }
        const exit = aExit || bExit
        if (!warned && exit) {
          warned = true
          this.warnExit(exit, comparison, 'I\'ll never make this comparison')
        }
      }
      return [types.bool()]
    } else if (expression instanceof ast.Tuple) {
      return [
        expression.values.map(value => {
          const [type, exit] = this.getExprType(value)
          if (exit) this.warnExit(exit, expression, 'I\'ll never make this tuple')
          return type
        })
      ]
    } else if (expression instanceof ast.CallFunc) {
      const [fnInitType, fnExit] = this.getExprType(expression.func)
      if (fnExit) this.warnExit(fnExit, expression.func, 'I\'ll never call this function')
      if (fnInitType && !types.isFunc(fnInitType)) {
        this.checker.err(expression.func, `I cannot run ${displ(fnInitType)} because it is not a function.`)
      }
      let fnType = fnInitType
      let argNum = 1
      for (const param of expression.params) {
        const [type, exit] = this.getExprType(param)
        if (exit) this.warnExit(exit, param, 'I\'ll never use this argument for this function')
        if (fnType) {
          if (types.isFunc(fnType)) {
            const { takes, returns } = fnType
            this._ensureMatch(takes, type, param, `${displ(fnInitType)}'s argument #${argNum} takes ${displ(takes)}, not ${displ(type)}.`)
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
      if (exit) this.warnExit(exit, expression, 'This will never print')
      return [type]
    } else if (expression instanceof ast.Return) {
      const [type] = this.getExprType(expression.value)
      if (!this.returnType) {
        this.checker.err(expression, `You can't return outside a function.`)
        return [null]
      } else {
        this._ensureMatch(type, this.returnType, expression.value, `You returned a ${displ(type)} in a function that is meant to return a ${types.display(this.returnType)}`)
        return [types.never(), expression]
      }
    } else if (expression instanceof ast.If) {
      const [condType, exit] = this.getExprType(expression.condition)
      if (exit) this.warnExit(exit, expression.condition, 'I\'ll never check the condition')
      if (condType && !types.isBool(condType)) {
        this.checker.err(expression.condition, `The condition should return a boolean, not a ${displ(condType)}.`)
      }
      const [ifTrueType, ifTrueExit] = this.getExprType(expression.then, {
        asStatement: context.asStatement
      })
      if (expression.else) {
        const [ifFalseType, ifFalseExit] = this.getExprType(expression.else, {
          asStatement: context.asStatement
        })
        const exit = ifTrueExit && ifFalseExit ? expression : undefined
        const neitherBranchNever = !types.isNever(ifTrueType) && !types.isNever(ifFalseType)
        if (!ifTrueType || !ifFalseType || context.asStatement) {
          return [null, exit]
        } else if (neitherBranchNever) {
          return [
            this._ensureMatch(ifTrueType, ifFalseType, expression, `The types of either branch, ${displ(ifTrueType)} and ${displ(ifFalseType)}, are not the same.`),
            exit
          ]
        } else {
          return [
            // If both branches return, then the if-else's type shall be never.
            // There may be a good reason to have both branches exit, so we
            // aren't warning about it here.
            types.isNever(ifTrueType) ? ifFalseType : ifTrueType,
            exit
          ]
        }
      } else {
        if (!context.asStatement) {
          // TODO
          this.checker.warn(expression, 'Unimplemented: I currently cannot determine return values from conditionals without an "else" branch.')
        }
        return [null]
      }
    } else if (expression instanceof ast.Identifier) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store its value anywhere, so this is redundant.')
      const value = this.getValue(expression)
      if (typeof value === 'string') {
        this.checker.err(expression, value)
        return [null]
      }
      return [value]
    } else if (expression instanceof ast.Function) {
      if (context.asStatement) this.checker.warn(expression, 'You don\'t store the function anywhere, so this is redundant.')
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
        scope.unusedValues.set(name, declaration)
        this.checker.types.set(declaration, type)
      }
      fnTypes.push(returnType)
      this.checker.types.set(expression.returnType, returnType)
      const [actualReturnType] = scope.getExprType(expression.body, {
        functionBody: true
      })
      // This only checks the implicit return value of blocks (and expressions);
      // explicit return statements are checked by the return statement, not
      // here.
      if (!types.isNever(actualReturnType)) {
        this._ensureMatch(returnType, actualReturnType, expression.body, `The body of this function, which should return a ${displ(returnType)}, returns a ${displ(actualReturnType)}.`)
      }
      scope.endScope()
      return [types.toFunc(fnTypes)]
    } else if (expression instanceof ast.For) {
      const [iterable, iterableExit] = this.getExprType(expression.value)
      if (iterableExit) this.warnExit(iterableExit, expression, 'I\'ll never iterate')
      const { name, type } = expression.var
      const scope = this.newScope()
      scope.values.set(name, null)
      // TODO: Implementing iteration protocol?
      let iterated
      if (iterable && (types.isInt(iterable) || types.isNumber(iterable))) {
        if (types.isNumber(iterable)) {
          this._resolveNumberAs(iterable, types.int())
        }
        iterated = types.int()
      }
      if (iterated) {
        if (type) {
          const resolvedType = this.astToType(type)
          if (types.is(iterated, resolvedType)) {
            // Only set the type if everything is ok because I'm not sure if the
            // user used the wrong iterable type or the wrong type declaration,
            // and I don't want to give irrelevant errors.
            scope.values.set(name, iterated)
            this.checker.types.set(expression.var, iterated)
          } else if (resolvedType) {
            this.checker.err(expression.var, `Iterating over ${displ(iterable)} produces values of ${displ(iterated)}, not ${displ(resolvedType)}.`)
          }
        } else {
          scope.values.set(name, iterated)
          this.checker.types.set(expression.var, iterated)
        }
      } else if (iterable) {
        this.checker.err(expression.value, `I can't iterate over ${displ(iterable)}.`)
      }
      const [bodyType, exit] = scope.getExprType(expression.body, {
        asStatement: context.asStatement
      })
      scope.endScope()
      if (!context.asStatement) {
        // TODO
        this.checker.warn(expression, 'Unimplemented: I currently cannot determine return values from for loops.')
      }
      return [null, exit]
    } else if (expression instanceof ast.Block) {
      const scope = this.newScope()
      let exited = null
      let warned = false
      let lastType
      let lastExpression: ast.Expression | null = null
      if (!context.asStatement) {
        for (let i = expression.statements.length; i--;) {
          const statement = expression.statements[i]
          if (ast.isExpression(statement)) {
            lastExpression = statement
            break
          }
        }
      }
      for (const statement of expression.statements) {
        let exit
        if (statement === lastExpression) {
          ;[lastType, exit] = scope.getExprType(statement as ast.Expression)
          if (context.functionBody && statement instanceof ast.Return) {
            this.checker.warn(statement, 'You don\'t need to explicitly use return here.')
          }
        } else {
          exit = scope.checkStatementType(statement)
        }
        if (exited) {
          if (!warned) {
            warned = true
            this.checker.warn(statement, 'All code beyond here will never run because the function has returned.', {
              exit: exited
            })
          }
        } else if (exit) {
          exited = exit
        }
      }
      scope.endScope()
      if (lastType === undefined) {
        if (!context.asStatement) {
          this.checker.err(expression, `The block doesn't return a value.`)
        }
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

  // Wrapper method to cache expression types
  getExprType (
    expression: ast.Expression,
    context: ScopeContext = {}
  ): [NType, ast.Base?] {
    const maybeType = this.checker.types.get(expression)
    if (maybeType !== undefined) return [maybeType]
    const [type, exit] = this._getExprType(expression, context)
    if (types.isNumber(type)) {
      type.addToResolve(expression)
    }
    this.checker.types.set(expression, type)
    return [type, exit]
  }

  checkStatementType (statement: ast.Statement): ast.Base | undefined {
    const displ = (type: NType) => this.checker.displayType(type)
    if (statement instanceof ast.ImportStmt) {
      if (this.modules.has(statement.name)) {
        this.checker.err(statement, `You already imported ${statement.name} in this scope.`)
      }
      const module = this.checker.getModule(statement.name)
      if (module) {
        // Allows for "import ... as ..." statements in the future
        this.modules.set(statement.name, module)
      } else {
        this.modules.set(statement.name, null)
        this.checker.err(statement, `I don't know of a module named "${statement.name}".`)
      }
      this.unusedModules.set(statement.name, statement)
      return
    } else if (statement instanceof ast.VarStmt) {
      const { name, type } = statement.declaration
      if (this.values.has(name)) {
        this.checker.err(statement.declaration, `You already defined ${name} in this scope.`)
      }
      const [resolvedType, exit] = this.getExprType(statement.value)
      if (exit) this.warnExit(exit, statement, 'I will never create this variable')
      if (type) {
        const idealType = this.astToType(type)
        this._ensureMatch(idealType, resolvedType, statement.value, `You set ${name}, which should be ${displ(idealType)}, to a value of ${displ(resolvedType)}`)
        this.values.set(name, idealType)
        this.checker.types.set(statement.declaration, idealType)
      } else {
        const type = types.isNever(resolvedType) ? null : resolvedType
        this.values.set(name, type)
        this.checker.types.set(statement.declaration, type)
      }
      this.unusedValues.set(name, statement.declaration)
      return exit
    } else {
      const [, exit] = this.getExprType(statement, {
        asStatement: true
      })
      return exit
    }
  }

  newScope (returnType: NType | undefined = this.returnType): Scope {
    return new Scope(this.checker, this, returnType)
  }

  endScope () {
    for (const [name] of this.modules) {
      const base = this.unusedModules.get(name)
      if (base) {
        this.checker.warn(base, `You imported ${name} but never used it.`)
      }
    }
    for (const [name] of this.values) {
      const base = this.unusedValues.get(name)
      if (base) {
        this.checker.warn(base, `You declared ${name} but never used it.`)
      }
    }
    for (const [name] of this.types) {
      const base = this.unusedTypes.get(name)
      if (base) {
        this.checker.warn(base, `You never used ${name}.`)
      }
    }
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
    this.types.set('char', types.char())
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
  }
}
