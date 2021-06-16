import { Scope } from './Scope'
import { TypeCheckerResult } from './TypeChecker'
import {
  boolSpec,
  char,
  cmd,
  float,
  int,
  list,
  map,
  maybe,
  result,
  str,
} from './types/builtins'
import { makeFunction } from './types/types'

export class GlobalScope extends Scope {
  constructor (checker: TypeCheckerResult) {
    super(checker)

    this.types.set('str', str.typeSpec)
    this.types.set('int', int.typeSpec)
    this.types.set('float', float.typeSpec)
    this.types.set('char', char.typeSpec)

    this.types.set('list', list)
    this.types.set('map', map)
    this.types.set('cmd', cmd)

    this.types.set('bool', boolSpec)
    this.variables.set('true', boolSpec.getConstructorType('true'))
    this.variables.set('false', boolSpec.getConstructorType('false'))

    this.types.set('maybe', maybe)
    this.variables.set('yes', maybe.getConstructorType('yes'))
    this.variables.set('none', maybe.getConstructorType('none'))

    this.types.set('result', result)
    this.variables.set('ok', result.getConstructorType('ok'))
    this.variables.set('err', result.getConstructorType('err'))

    this.variables.set(
      'intInBase10',
      makeFunction(() => [int, str]),
    )
    this.variables.set(
      'round',
      makeFunction(() => [float, int]),
    )
    this.variables.set(
      'floor',
      makeFunction(() => [float, int]),
    )
    this.variables.set(
      'ceil',
      makeFunction(() => [float, int]),
    )
    this.variables.set(
      'charCode',
      makeFunction(() => [char, int]),
    )
    this.variables.set(
      'intCode',
      makeFunction(() => [int, char]),
    )
    this.variables.set(
      'charAt',
      makeFunction(() => [int, str, maybe.instance([char])]),
    )
    this.variables.set(
      'substring',
      makeFunction(() => [int, int, str, str]),
    )
    this.variables.set(
      'len',
      makeFunction(t => [t, int], 't'),
    )
    this.variables.set(
      'split',
      makeFunction(() => [char, str, list.instance([char])]),
    )
    this.variables.set(
      'strip',
      makeFunction(() => [str, str]),
    )
    this.variables.set(
      'range',
      makeFunction(() => [int, int, int, list.instance([int])]),
    )
    // TODO: The `type` function?
    this.variables.set(
      'print',
      makeFunction(t => [t, t], 't'),
    )
    this.variables.set(
      'itemAt',
      makeFunction(t => [int, list.instance([t]), maybe.instance([t])], 't'),
    )
    this.variables.set(
      'append',
      makeFunction(t => [t, list.instance([t]), list.instance([t])]),
    )
    this.variables.set(
      'filterMap',
      makeFunction(
        (a, b) => [
          makeFunction(() => [a, maybe.instance([b])]),
          list.instance([a]),
          list.instance([b]),
        ],
        'a',
        'b',
      ),
    )
    this.variables.set(
      'default',
      makeFunction(t => [t, maybe.instance([t]), t], 't'),
    )
    this.variables.set(
      'then',
      makeFunction(
        (a, b) => [
          makeFunction(() => [a, cmd.instance([b])]),
          cmd.instance([a]),
          cmd.instance([b]),
        ],
        'k',
        'v',
      ),
    )
    this.variables.set(
      'mapFrom',
      makeFunction(
        (k, v) => [
          list.instance([{ type: 'tuple', types: [k, v] }]),
          map.instance([k, v]),
        ],
        'k',
        'v',
      ),
    )
    this.variables.set(
      'getValue',
      makeFunction(
        (k, v) => [k, map.instance([k, v]), maybe.instance([v])],
        'k',
        'v',
      ),
    )
    this.variables.set(
      'entries',
      makeFunction(
        (k, v) => [
          map.instance([k, v]),
          list.instance([{ type: 'tuple', types: [k, v] }]),
        ],
        'k',
        'v',
      ),
    )
  }
}
