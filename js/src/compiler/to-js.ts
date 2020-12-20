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

  constructor () {
    this.modules = new Set(['_prelude'])
    this.expressionToJS = this.expressionToJS.bind(this)
    this.statementToJS = this.statementToJS.bind(this)
  }

  expressionToJS (expression: ast.Expression): string {
    if (expression instanceof ast.Literal) {
      return expression.toString()
    } else if (expression instanceof ast.Operation) {
      return `(${this.expressionToJS(expression.a)} ${jsOperations[expression.type]} ${this.expressionToJS(expression.b)})`
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
      return `${
        this.expressionToJS(expression.condition)
      } ? ${
        this.expressionToJS(expression.then)
      } : ${
        expression.else ? this.expressionToJS(expression.else) : 'null'
      }`
    } else if (expression instanceof ast.Identifier) {
      return expression.toString()
    } else {
      throw new TypeError(`Expression is... not an expression?? ${expression}`)
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
      }) ${
        this.blockToJS(statement.body, true)
      }`
    } else if (statement instanceof ast.LoopStmt) {
      const varName = statement.var.name
      return `for (var ${varName} = 0, end = ${
        this.expressionToJS(statement.value)
      }; ${varName} < end; ${varName}++) ${
        this.blockToJS(statement.body, true)
      }`
    } else {
      return this.expressionToJS(statement) + ';'
    }
  }

  blockToJS (block: ast.Block, inBlock: boolean): string {
    const output = block.statements.map(this.statementToJS).join('\n')
    if (inBlock) {
      return `{\n  ${output.replace(/\n/g, '\n  ')}\n}`
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
