import * as ast from '../grammar/ast'
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
function __intDivide(a, b) {
  return Math.floor(a / b);
}
function __modulo(a, b) {
  return (a % b + b) % b;
}
  `,
  fek: `
__nativeModules.fek = __module(function (exports) {
  exports.paer = function (message) {
    console.log(message);
  };
});
  `,
  future: `
__nativeModules.future = __module(function (exports) {
  exports.split = function (separator, string) {
    return string.split(separator);
  };
  exports.map = function (mapFn, array) {
    return array.map(mapFn)
  };
  exports.length = function (array) {
    return array.length
  };
  exports.get = function (array, index) {
    return array[index]
  };
  exports.strToInt = function (string) {
    return parseInt(string) || 0;
  };
  exports.intToStr = function (int) {
    return int.toString();
  };
});
  `
}

const jsOperations: { [operation in ast.Operator]: string } = {
  [ast.Operator.AND]: '&&',
  [ast.Operator.OR]: '||',
  [ast.Operator.ADD]: '+',
  [ast.Operator.MINUS]: '-',
  [ast.Operator.MULTIPLY]: '*',
  [ast.Operator.DIVIDE]: '/',
  [ast.Operator.INT_DIVIDE]: '@__intDivide',
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
}

interface CompiledExpression {
  expression: string
  statements: string[]
}

class JSCompiler {
  modules: Set<string>
  id: number
  options: CompilerOptions

  constructor (options: CompilerOptions) {
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
      statements.push(...evalStmts)
      statements.push(`var ${aName} = ${output};`)
      variables.set(a, aName)
    }
    if (!bName) {
      bName = this.uid('intermediate')
      const { expression: output, statements: evalStmts } = this.expressionToJS(b)
      statements.push(...evalStmts)
      statements.push(`var ${bName} = ${output};`)
      variables.set(b, bName)
    }
    const condition = `if (${aName} ${jsComparators[type]} ${bName}) `
    if (rest.length === 0) {
      statements.push(condition + `${varName} = true;`)
    } else {
      statements.push(condition + statementsToBlock(this.comparisonToJS(varName, variables, rest)))
    }
    return statements
  }

  expressionToJS (expression: ast.Expression): CompiledExpression {
    if (expression instanceof ast.Literal) {
      return {
        expression: expression.toString(),
        statements: [],
      }
    } else if (expression instanceof ast.Operation) {
      const { expression: a, statements: aStmts } = this.expressionToJS(expression.a)
      const { expression: b, statements: bStmts } = this.expressionToJS(expression.b)
      const statements = [...aStmts, ...bStmts]
      const operator = jsOperations[expression.type]
      if (operator.startsWith('@')) {
        return { expression: `${operator.slice(1)}(${a}, ${b})`, statements }
      } else {
        return { expression: `(${a} ${operator} ${b})`, statements }
      }
    } else if (expression instanceof ast.UnaryOperation) {
      const { expression: compiled, statements } = this.expressionToJS(expression.value)
      return {
        expression: `(${jsUnaryOperators[expression.type]}${compiled})`,
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
      const { expression: value, statements: stmts } = this.expressionToJS(expression.value)
      const varName = this.uid('print')
      const statements = [
        ...stmts,
        `var ${varName} = ${value};`,
        `console.log(${varName});`,
      ]
      return {
        expression: varName,
        statements,
      }
    } else if (expression instanceof ast.Return) {
      return `return ${this.expressionToJS(expression.value)}`
    } else if (expression instanceof ast.If) {
      if (expression.else) {
        return `${
          this.expressionToJS(expression.condition)
        } ? ${
          this.expressionToJS(expression.then)
        } : ${
          this.expressionToJS(expression.else)
        }`
      } else {
        return `${
          this.expressionToJS(expression.condition)
        } && ${
          this.expressionToJS(expression.then)
        }`
      }
    } else if (expression instanceof ast.Identifier) {
      return expression.toString()
    } else if (expression instanceof ast.Function) {
      return `function (${
        expression.params.map(param => param.name).join(', ')
      }) {${
        this.expressionToJS(expression.body)
      }}`
    } else if (expression instanceof ast.For) {
      const varName = expression.var.name
      const endName = this.uid('end_' + varName)
      return `for (var ${varName} = 0, ${endName} = ${
        this.expressionToJS(expression.value)
      }; ${varName} < ${endName}; ${varName}++) {${
        this.expressionToJS(expression.body)
      }}`
    } else if (expression instanceof ast.Block) {
      return this.blockToJS(expression, true)
    } else {
      throw new TypeError(`Expression is... not an expression?? (type ${displayType(expression)}) ${expression}`)
    }
  }

  statementToJS (statement: ast.Statement): string {
    if (statement instanceof ast.ImportStmt) {
      this.modules.add(statement.name)
      return `var ${statement.name} = __require(${JSON.stringify(statement.name)});`
    } else if (statement instanceof ast.VarStmt) {
      return `var ${statement.declaration.name} = ${this.expressionToJS(statement.value)};`
    } else {
      return this.expressionToJS(statement) + ';'
    }
  }

  blockToJS (block: ast.Block, inBlock: boolean): string {
    const output = block.statements.map(this.statementToJS).join('\n')
    if (inBlock) {
      return `\n  ${output.replace(/\n/g, '\n  ')}\n`
    } else {
      return output
    }
  }

  compile (script: ast.Block): string {
    const output = this.blockToJS(script, false)
    let moduleOutput = ''
    for (const module of this.modules) {
      moduleOutput += modules[module] || ''
    }
    return moduleOutput + '\n' + output
  }
}

export function compileToJS (script: ast.Block, options: CompilerOptions = {}): string {
  return new JSCompiler(options).compile(script)
}
