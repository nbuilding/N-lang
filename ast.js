class Block {
  constructor (init = []) {
    this.statements = init
  }

  withStatement (statement) {
    return new Block([...this.statements, statement])
  }
}

class Statement {}

class ImportStmt extends Statement {
  constructor (id) {
    super()
    this.name = id
  }
}

class PrintStmt extends Statement {
  constructor (expr) {
    super()
    this.value = expr
  }
}

class ReturnStmt extends Statement {
  constructor (expr) {
    super()
    this.value = expr
  }
}

class VarStmt extends Statement {
  constructor (decl, expr) {
    super()
    this.declare = decl
    this.value = expr
  }
}

class FuncDeclaration extends Statement {
  constructor ({ name, params }, returnType, body, returnExpr) {
    super()
    this.name = name
    this.params = params
    this.returnType = returnType
    this.body = body
    this.returnExpr = returnExpr
  }
}

class LoopStmt extends Statement {
  constructor (value, decl, body) {
    super()
    this.value = value
    this.binding = decl
    this.body = body
  }
}

class IfStmt extends Statement {
  constructor (condition, statement, maybeElse) {
    super()
    this.condition = condition
    this.then = statement
    this.else = maybeElse ? maybeElse[3] : null
  }
}

class Declaration {
  constructor (name, type) {
    this.name = name
    this.type = type
  }
}

class Operator {
  constructor (operatorName, expr, val) {
    this.type = operatorName
    this.a = expr
    this.b = val
  }
}

class CallFunc {
  constructor (id, params = []) {
    this.funcName = id
    this.params = params
  }
}

module.exports = {
  Block,

  ImportStmt,
  PrintStmt,
  ReturnStmt,
  VarStmt,
  FuncDeclaration,
  LoopStmt,
  IfStmt,

  Declaration,

  Operator,
  CallFunc
}
