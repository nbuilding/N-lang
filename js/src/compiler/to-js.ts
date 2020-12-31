import * as ast from '../grammar/ast'
import NType, * as types from '../type-checker/n-type'
import { displayType } from '../utils/display-type'

const modules: { [key: string]: string } = {
  _prelude: `
var __nativeModules = {};
function __require(name) {
  return __nativeModules[name] || {};
}
function __module(module) {
  var exports = {};
  module(exports);
  return exports;
}
function __modulo(a, b) {
  return (a % b + b) % b;
}
function __intPow(base, power) {
  if (power < 0) {
    return 0;
  } else {
    return Math.pow(base, power);
  }
}
function __never() {
  throw new Error("This error should never have been thrown! This is a bug with the compiler.")
}
function __deepEquals(a, b) {
  if (Array.isArray(a)) {
    for (var i = 0; i < a.length; i++) {
      if (!__deepEquals(a[i], b[i])) return false;
    }
  } else if (typeof a === "object" && a !== null) {
    for (var key in a) {
      if (!__deepEquals(a[key], b[key])) return false;
    }
  } else {
    return a === b;
  }
  return true;
}
var __unset = { symbol: "Unset" };
function intInBase10(int) {
  return int.toString();
}
  `,
  fek: `
__nativeModules.fek = __module(function (exports) {
  exports.paer = function (message) {
    console.log(message);
    return message;
  };
});
  `,
  future: `
__nativeModules.future = __module(function (exports) {
  exports.split = function (separator) {
    return function (string) {
      return string.split(separator);
    };
  };
  exports.join = function (separator) {
    return function (list) {
      return list.join(separator);
    };
  };
  exports.map = function (mapFn) {
    return function (array) {
      return array.map(mapFn);
    };
  };
  exports.length = function (array) {
    return array.length;
  };
  exports.get = function (index) {
    return function (array) {
      return array[index] || 0;
    };
  };
  exports.strToIntOrZero = function (string) {
    return parseInt(string) || 0;
  };
});
  `
}

const jsOperations: { [operation in ast.Operator]: string } = {
  [ast.Operator.AND]: '&',
  [ast.Operator.OR]: '|',
  [ast.Operator.ADD]: '+',
  [ast.Operator.MINUS]: '-',
  [ast.Operator.MULTIPLY]: '*',
  [ast.Operator.DIVIDE]: '/',
  [ast.Operator.MODULO]: '@__modulo',
  [ast.Operator.EXPONENT]: '@Math.pow',
}
const jsUnaryOperators: { [operation in ast.UnaryOperator]: string } = {
  [ast.UnaryOperator.NEGATE]: '-',
  [ast.UnaryOperator.NOT]: '!',
}
const jsComparators: { [operation in ast.Compare]: string } = {
  [ast.Compare.LESS]: '<',
  [ast.Compare.EQUAL]: '===',
  [ast.Compare.GREATER]: '>',
  [ast.Compare.LEQ]: '<=',
  [ast.Compare.NEQ]: '!==',
  [ast.Compare.GEQ]: '>=',
}

function statementsToBlock (statements: string[]): string {
  return `{\n  ${statements.join('\n').replace(/\n/g, '\n  ')}\n}`
}

interface CompilerOptions {
  print?: string
  useBigInt?: boolean
}

interface CompiledExpression {
  expression: string
  statements: string[]
}
interface CompiledStatement {
  expression: string | null
  statements: string[]
}

class JSCompiler {
  types: Map<ast.Base, NType>
  modules: Set<string>
  id: number
  options: CompilerOptions

  constructor (types: Map<ast.Base, NType>, options: CompilerOptions) {
    this.types = types
    this.modules = new Set(['_prelude'])
    this.id = 0
    this.options = options

    this.expressionToJS = this.expressionToJS.bind(this)
    this.statementToJS = this.statementToJS.bind(this)
  }

  private uid (name = '') {
    return `_${name}_${this.id++}`
  }

  comparisonToJS (
    varName: string,
    variables: Map<ast.Expression, string>,
    [{ type, a, b }, ...rest]: ast.Comparison[]
  ): string[] {
    const statements = []
    let aName = variables.get(a)
    let bName = variables.get(b)
    if (!aName) {
      aName = this.uid('intermediate')
      const { expression: output, statements: evalStmts } = this.expressionToJS(a)
      statements.push(...evalStmts, `var ${aName} = ${output};`)
      variables.set(a, aName)
    }
    if (!bName) {
      bName = this.uid('intermediate')
      const { expression: output, statements: evalStmts } = this.expressionToJS(b)
      statements.push(...evalStmts, `var ${bName} = ${output};`)
      variables.set(b, bName)
    }
    const comparableType = this.types.get(a)
    let condition
    if (comparableType && types.isTuple(comparableType)) {
      const isNeq = type === ast.Compare.NEQ
      if (isNeq || type === ast.Compare.EQUAL) {
        condition = `if (${isNeq ? '!' : ''}__deepEquals(${aName}, ${bName})) `
      }
    }
    if (!condition) {
      condition = `if (${aName} ${jsComparators[type]} ${bName}) `
    }
    if (rest.length === 0) {
      statements.push(condition + `${varName} = true;`)
    } else {
      statements.push(condition + statementsToBlock(this.comparisonToJS(varName, variables, rest)))
    }
    return statements
  }

  functionToJS (body: ast.Expression, [param, ...params]: ast.Declaration[]): string {
    if (params.length) {
      return `function (${param.name || ''}) ` + statementsToBlock([
        `return ${this.functionToJS(body, params)};`,
      ])
    } else {
      const { expression, statements } = this.expressionToJS(body)
      return `function (${param.name || ''}) ` + statementsToBlock([
        ...statements,
        `return ${expression};`,
      ])
    }
  }

  expressionToJS (expression: ast.Expression): CompiledExpression {
    if (expression instanceof ast.Literal) {
      if (expression instanceof ast.Unit) {
        return {
          expression: '0',
          statements: [],
        }
      } else if (expression instanceof ast.Char) {
        return {
          expression: JSON.stringify(expression.value),
          statements: [],
        }
      } else {
        const type = this.types.get(expression)
        return {
          expression: this.options.useBigInt && type && types.isInt(type)
            ? expression + 'n'
            : expression.toString(),
          statements: [],
        }
      }
    } else if (expression instanceof ast.Operation) {
      const type = this.types.get(expression)
      const { expression: a, statements: aStmts } = this.expressionToJS(expression.a)
      const { expression: b, statements: bStmts } = this.expressionToJS(expression.b)
      if (expression.type === ast.Operator.AND || expression.type === ast.Operator.OR) {
        if (type && types.isBool(type)) {
          const varName = this.uid('bool')
          let statements
          if (expression.type === ast.Operator.AND) {
            statements = [
              `var ${varName} = ${a};`,
              `if (${varName}) `+ statementsToBlock([
                ...bStmts,
                `${varName} = ${b};`
              ])
            ]
          } else {
            statements = [
              `var ${varName} = ${a};`,
              `if (!${varName}) `+ statementsToBlock([
                ...bStmts,
                `${varName} = ${b};`
              ])
            ]
          }
          return {
            expression: varName,
            statements: [
              ...aStmts,
              ...statements
            ]
          }
        }
      }
      const statements = [...aStmts, ...bStmts]
      if (type && types.isInt(type)) {
        if (expression.type === ast.Operator.EXPONENT) {
          return { expression: `__intPow(${a}, ${b})`, statements }
        } else if (expression.type === ast.Operator.DIVIDE) {
          if (this.options.useBigInt) {
            return { expression: `${b} !== 0n ? ${a} / ${b} : 0n`, statements }
          } else {
            return { expression: `${b} !== 0 ? Math.trunc(${a} / ${b}) : 0`, statements }
          }
        }
      } else if (type && types.isString(type) && expression.type === ast.Operator.MULTIPLY) {
        const aType = this.types.get(expression.a)
        return {
          expression: aType && types.isString(aType)
            ? `${a}.repeat(${b})`
            : `${b}.repeat(${a})`,
          statements
        }
      }
      const operator = jsOperations[expression.type]
      if (operator.startsWith('@')) {
        return { expression: `${operator.slice(1)}(${a}, ${b})`, statements }
      } else {
        return { expression: `(${a} ${operator} ${b})`, statements }
      }
    } else if (expression instanceof ast.UnaryOperation) {
      const type = this.types.get(expression)
      const { expression: compiled, statements } = this.expressionToJS(expression.value)
      return {
        expression: expression.type === ast.UnaryOperator.NEGATE
          ? `(${jsUnaryOperators[expression.type]}${compiled})`
          : type && types.isBool(type)
          ? `(!${compiled})`
          : `(~${compiled})`,
        statements,
      }
    } else if (expression instanceof ast.Comparisons) {
      // Only evaluate each expression once, and short circuit if one fails.
      const varName = this.uid('comparison')
      const statements = [`var ${varName} = false;`]
      const variables: Map<ast.Expression, string> = new Map()
      statements.push(...this.comparisonToJS(varName, variables, expression.comparisons))
      return {
        expression: varName,
        statements,
      }
    } else if (expression instanceof ast.Tuple) {
      const statements = []
      const expressions = []
      for (const value of expression.values) {
        const { statements: stmts, expression } = this.expressionToJS(value)
        statements.push(...stmts)
        expressions.push(expression)
      }
      return {
        expression: `[${expressions.join(', ')}]`,
        statements
      }
    } else if (expression instanceof ast.CallFunc) {
      const { expression: fnValue, statements: stmts } = this.expressionToJS(expression.func)
      const statements = [...stmts]
      const params = []
      for (const param of expression.params) {
        const { expression: value, statements: stmts } = this.expressionToJS(param)
        params.push(`(${value})`)
        statements.push(...stmts)
      }
      return {
        expression: `${fnValue}${params.join('')}`,
        statements,
      }
    } else if (expression instanceof ast.Print) {
      const { expression: value, statements } = this.expressionToJS(expression.value)
      const varName = this.uid('print')
      return {
        expression: varName,
        statements: [
          ...statements,
          `var ${varName} = ${value};`,
          `${this.options.print || 'console.log'}(${varName});`,
        ],
      }
    } else if (expression instanceof ast.Return) {
      const { expression: value, statements } = this.expressionToJS(expression.value)
      return {
        expression: '__never()',
        statements: [...statements, `return ${value}`],
      }
    } else if (expression instanceof ast.If) {
      const { expression: condition, statements: stmts } = this.expressionToJS(expression.condition)
      const varName = this.uid('if_output')
      const statements = [...stmts, `var ${varName} = __unset;`]
      const cond = `if (${condition}) `
      if (expression.else) {
        const { expression: ifTrue, statements: stmtsTrue } = this.expressionToJS(expression.then)
        const { expression: ifFalse, statements: stmtsFalse } = this.expressionToJS(expression.else)
        statements.push(cond + statementsToBlock([
          ...stmtsTrue,
          `${varName} = ${ifTrue};`
        ]) + ' else ' + statementsToBlock([
          ...stmtsFalse,
          `${varName} = ${ifFalse};`
        ]))
      } else {
        const { expression: value, statements: stmts } = this.expressionToJS(expression.then)
        // TODO: This is not the proper return value
        statements.push(cond + statementsToBlock([
          ...stmts,
          `${varName} = ${value};`
        ]))
      }
      return {
        expression: varName,
        statements,
      }
    } else if (expression instanceof ast.Identifier) {
      return {
        expression: expression.toString(),
        statements: [],
      }
    } else if (expression instanceof ast.Function) {
      return {
        expression: this.functionToJS(expression.body, expression.params),
        statements: [],
      }
    } else if (expression instanceof ast.For) {
      // TODO: This only works with iterating over ints (ranges and lists to come?).
      const varName = expression.var.name || '__unused'
      const endName = this.uid('end_' + varName)
      const outputName = this.uid('arr_' + varName)
      const { expression: value, statements } = this.expressionToJS(expression.value)
      const { expression: body, statements: bodyStmts } = this.expressionToJS(expression.body)
      return {
        expression: outputName,
        statements: [
          ...statements,
          `var ${outputName} = [];`,
          `for (var ${varName} = 0, ${endName} = ${value}; ${varName} < ${endName}; ${varName}++) ` + statementsToBlock([
            ...bodyStmts,
            `if (${body} !== __unset) ${outputName}.push(${body});`
          ]),
        ]
      }
    } else if (expression instanceof ast.Block) {
      return this.blockToJS(expression)
    } else {
      throw new TypeError(`Expression is... not an expression?? (type ${displayType(expression)}) ${expression}`)
    }
  }

  statementToJS (statement: ast.Statement): CompiledStatement {
    if (statement instanceof ast.ImportStmt) {
      this.modules.add(statement.name)
      return {
        expression: null,
        statements: [`var ${statement.name} = __require(${JSON.stringify(statement.name)});`],
      }
    } else if (statement instanceof ast.VarStmt) {
      // Using the return value of `var` might be useful for recursion.
      const { expression, statements } = this.expressionToJS(statement.value)
      return {
        expression: null,
        statements: [
          ...statements,
          statement.declaration.name
            ? `var ${statement.declaration.name} = ${expression};`
            : expression + ';',
        ],
      }
    } else {
      return this.expressionToJS(statement)
    }
  }

  blockToJS (block: ast.Block): CompiledExpression {
    const statements = []
    let lastExpression = 'null'
    for (const statement of block.statements) {
      const { expression, statements: stmts } = this.statementToJS(statement)
      statements.push(...stmts)
      if (expression !== null) lastExpression = expression
    }
    return {
      expression: lastExpression,
      statements,
    }
  }

  compile (script: ast.Block): string {
    // Must be run first in order to populate this.modules
    const { statements, expression } = this.blockToJS(script)
    return `(function () ${statementsToBlock([
      '"use strict";',
      ...Array.from(this.modules, module => modules[module] || ''),
      ...statements,
      expression + ';',
    ])})();`
  }
}

export function compileToJS (script: ast.Block, types: Map<ast.Base, NType>, options: CompilerOptions = {}): string {
  return new JSCompiler(types, options).compile(script)
}
