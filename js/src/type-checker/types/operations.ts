import {
  bool,
  char,
  cmd,
  float,
  int,
  list,
  map,
  maybe,
  number,
  result,
  str,
  unit,
} from './builtins'
import { Operator } from './operations/Operator'
import { UnaryOperator } from './operations/UnaryOperator'
import { makeFunction, NFunction } from './types'
import { TypeSpec } from './TypeSpec'

export const operations: Record<Operator, NFunction[]> = {
  [Operator.ADD]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
    makeFunction(() => [float, float, float]),
    makeFunction(() => [str, str, str]),
    makeFunction(() => [str, char, str]),
    makeFunction(() => [char, str, str]),
    makeFunction(() => [char, char, str]),
    makeFunction(
      a => [list.instance([a]), list.instance([a]), list.instance([a])],
      'a',
    ),
  ],
  [Operator.MINUS]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
    makeFunction(() => [float, float, float]),
  ],
  [Operator.MULTIPLY]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
    makeFunction(() => [float, float, float]),
  ],
  [Operator.DIVIDE]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
    makeFunction(() => [float, float, float]),
  ],
  [Operator.MODULO]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
    makeFunction(() => [float, float, float]),
  ],
  [Operator.EXPONENT]: [
    makeFunction(() => [number, number, float]),
    // NOTE: int ^ int returns float because of negative powers
    makeFunction(() => [int, int, float]),
    makeFunction(() => [float, float, float]),
  ],
  [Operator.XOR]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
  ],
  [Operator.SHIFTL]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
  ],
  [Operator.SHIFTR]: [
    makeFunction(() => [number, number, number]),
    makeFunction(() => [int, int, int]),
  ],

  [Operator.AND]: [
    makeFunction(() => [int, int, int]),
    makeFunction(() => [bool, bool, bool]),
  ],
  [Operator.OR]: [
    makeFunction(() => [int, int, int]),
    makeFunction(() => [bool, bool, bool]),
    makeFunction(t => [maybe.instance([t]), t, t], 't'),
  ],

  [Operator.PIPE]: [
    makeFunction((a, b) => [a, makeFunction(() => [a, b]), b], 'a', 'b'),
  ],
}

export const unaryOperations: Record<UnaryOperator, NFunction[]> = {
  [UnaryOperator.NEGATE]: [
    makeFunction(() => [number, number]),
    makeFunction(() => [int, int]),
    makeFunction(() => [float, float]),
  ],
  [UnaryOperator.NOT]: [
    makeFunction(() => [int, int]),
    makeFunction(() => [bool, bool]),
    makeFunction(t => [maybe.instance([t]), bool], 't'),
  ],
  [UnaryOperator.AWAIT]: [makeFunction(a => [cmd.instance([a]), a], 'a')],
}

export const iterableTypes: NFunction[] = [
  makeFunction(a => [list.instance([a]), a], 'a'),
]
export const legacyIterableTypes: NFunction[] = [makeFunction(() => [int, int])]
