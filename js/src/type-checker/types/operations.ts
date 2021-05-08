import { Operator } from '../../ast/expressions/Operation'
import { UnaryOperator } from '../../ast/expressions/UnaryOperation'
import { bool, char, cmd, float, int, list, str } from './builtins'
import { FuncType as Func, NType } from './types'

export const operations: Record<Operator, Func[]> = {
  [Operator.ADD]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
    Func.make2(() => [str.instance(), str.instance(), str.instance()]),
    Func.make2(() => [str.instance(), char.instance(), str.instance()]),
    Func.make2(() => [char.instance(), str.instance(), str.instance()]),
    Func.make2(() => [char.instance(), char.instance(), str.instance()]),
    Func.make2(
      a => [list.instance([a]), list.instance([a]), list.instance([a])],
      'a',
    ),
  ],
  [Operator.MINUS]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
  ],
  [Operator.MULTIPLY]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
  ],
  [Operator.DIVIDE]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
  ],
  [Operator.MODULO]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
  ],
  [Operator.EXPONENT]: [
    // NOTE: int ^ int returns float because of negative powers
    Func.make2(() => [int.instance(), int.instance(), float.instance()]),
    Func.make2(() => [float.instance(), float.instance(), float.instance()]),
  ],

  [Operator.AND]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [bool.instance(), bool.instance(), bool.instance()]),
  ],
  [Operator.OR]: [
    Func.make2(() => [int.instance(), int.instance(), int.instance()]),
    Func.make2(() => [bool.instance(), bool.instance(), bool.instance()]),
  ],

  [Operator.PIPE]: [
    Func.make2((a, b) => [a, Func.make(() => [a, b]), b], 'a', 'b'),
  ],
}

export const unaryOperations: Record<UnaryOperator, Func[]> = {
  [UnaryOperator.NEGATE]: [
    Func.make(() => [int.instance(), int.instance()]),
    Func.make(() => [float.instance(), float.instance()]),
  ],
  [UnaryOperator.NOT]: [
    Func.make(() => [int.instance(), int.instance()]),
    Func.make(() => [bool.instance(), bool.instance()]),
  ],
  [UnaryOperator.AWAIT]: [Func.make(a => [cmd.instance([a]), a], 'a')],
}

export const iterableTypes: Func[] = [
  Func.make(a => [list.instance([a]), a], 'a'),
]
export const legacyIterableTypes: Func[] = [
  Func.make(() => [int.instance(), int.instance()]),
]
