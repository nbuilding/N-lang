export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
  AWAIT = 'await',
}

export function unaryOperatorToString(self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE:
      return 'negate';
    case UnaryOperator.NOT:
      return 'not';
    case UnaryOperator.AWAIT:
      return 'await';
  }
}
