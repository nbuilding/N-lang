import * as ast from '../grammar/ast'

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
}

class JSCompiler {
  modules: Set<string>
  id: number

  constructor () {
    this.modules = new Set(['_prelude'])
    this.expressionToJS = this.expressionToJS.bind(this)
    this.statementToJS = this.statementToJS.bind(this)
    this.id = 0
  }

  private uid (name = '') {
    return `_${name}_${this.id++}`
  }

  expressionToJS (expression: ast.Expression): string {
    if (expression instanceof ast.Literal) {
      return expression.toString()
    } else if (expression instanceof ast.Operation) {
      const a = this.expressionToJS(expression.a)
      const b = this.expressionToJS(expression.b)
      const operator = jsOperations[expression.type]
      if (operator.startsWith('@')) {
        return `${operator.slice(1)}(${a}, ${b})`
      } else {
        return `(${a} ${operator} ${b})`
      }
    } else if (expression instanceof ast.UnaryOperation) {
      return `${jsUnaryOperators[expression.type]}${this.expressionToJS(expression.value)}`
    } else if (expression instanceof ast.Comparisons) {
      return `(${
        expression.comparisons
          .map(({ type, a, b }) => `${this.expressionToJS(a)} ${jsComparators[type]} ${this.expressionToJS(b)}`)
          .join(' && ')
      })`
    } else if (expression instanceof ast.CallFunc) {
      return `${this.expressionToJS(expression.func)}(${
        expression.params.map(this.expressionToJS).join(', ')
      })`
    } else if (expression instanceof ast.Print) {
      return `console.log(${this.expressionToJS(expression.value)})`
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
    } else {
      let type = typeof expression
      if (expression && (expression as any).constructor) {
        type = (expression as any).constructor.name
      }
      throw new TypeError(`Expression is... not an expression?? (type ${type}) ${expression}`)
    }
  }

  statementToJS (statement: ast.Statement): string {
    if (statement instanceof ast.ImportStmt) {
      this.modules.add(statement.name)
      return `var ${statement.name} = __require(${JSON.stringify(statement.name)});`
    } else if (statement instanceof ast.VarStmt) {
      return `var ${statement.declaration.name} = ${this.expressionToJS(statement.value)};`
    } else if (statement instanceof ast.FuncDeclaration) {
      return `function ${statement.name}(${
        statement.params.map(param => param.name).join(', ')
      }) {${
        this.blockToJS(statement.body, true)
      }${
        statement.returnExpr
          ? `  return ${this.expressionToJS(statement.returnExpr)};\n`
          : ''
      }}`
    } else if (statement instanceof ast.LoopStmt) {
      const varName = statement.var.name
      const endName = this.uid('end_' + varName)
      return `for (var ${varName} = 0, ${endName} = ${
        this.expressionToJS(statement.value)
      }; ${varName} < ${endName}; ${varName}++) {${
        this.blockToJS(statement.body, true)
      }}`
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

export function compileToJS (script: ast.Block): string {
  return new JSCompiler().compile(script)
}
