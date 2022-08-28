export enum Operator {
  AND = 'and',
  OR = 'or',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  MODULO = 'modulo',
  EXPONENT = 'exponent',
  PIPE = 'pipe',
  XOR = 'xor',
}

export function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND:
      return '&'
    case Operator.OR:
      return '|'
    case Operator.ADD:
      return '+'
    case Operator.MINUS:
      return '-'
    case Operator.MULTIPLY:
      return '*'
    case Operator.DIVIDE:
      return '/'
    case Operator.MODULO:
      return '%'
    case Operator.EXPONENT:
      return '^'
    case Operator.PIPE:
      return '|>'
    case Operator.XOR:
      return '^^'
  }
}
