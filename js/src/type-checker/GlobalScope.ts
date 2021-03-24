import { Scope } from './Scope'
import { TypeCheckerResult } from './TypeChecker'
import {
  bool,
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
import { Function as Func, Tuple } from './types/types'

export class GlobalScope extends Scope {
  constructor (checker: TypeCheckerResult) {
    super(checker)

    this.types.set('str', str)
    this.types.set('int', int)
    this.types.set('float', float)
    this.types.set('bool', bool)
    this.types.set('char', char)

    this.types.set('list', list)
    this.types.set('map', map)
    this.types.set('maybe', maybe)
    this.types.set('result', result)
    this.types.set('cmd', cmd)

    this.variables.set(
      'intInBase10',
      Func.make(() => [int.instance(), str.instance()]),
    )
    this.variables.set(
      'round',
      Func.make(() => [float.instance(), int.instance()]),
    )
    this.variables.set(
      'floor',
      Func.make(() => [float.instance(), int.instance()]),
    )
    this.variables.set(
      'ceil',
      Func.make(() => [float.instance(), int.instance()]),
    )
    this.variables.set(
      'charCode',
      Func.make(() => [char.instance(), int.instance()]),
    )
    this.variables.set(
      'intCode',
      Func.make(() => [int.instance(), char.instance()]),
    )
    this.variables.set(
      'charAt',
      Func.make(() => [
        int.instance(),
        Func.make(() => [str.instance(), maybe.instance([char.instance()])]),
      ]),
    )
    this.variables.set(
      'substring',
      Func.make(() => [
        int.instance(),
        Func.make(() => [
          int.instance(),
          Func.make(() => [str.instance(), str.instance()]),
        ]),
      ]),
    )
    this.variables.set(
      'len',
      Func.make(t => [t, int.instance()], 't'),
    )
    this.variables.set(
      'split',
      Func.make(() => [
        char.instance(),
        Func.make(() => [str.instance(), list.instance([char.instance()])]),
      ]),
    )
    this.variables.set(
      'strip',
      Func.make(() => [str.instance(), str.instance()]),
    )
    this.variables.set(
      'range',
      Func.make(() => [
        int.instance(),
        Func.make(() => [
          int.instance(),
          Func.make(() => [int.instance(), list.instance([int.instance()])]),
        ]),
      ]),
    )
    // TODO: type?
    this.variables.set(
      'print',
      Func.make(t => [t, t], 't'),
    )
    this.variables.set(
      'itemAt',
      Func.make(
        t => [
          int.instance(),
          Func.make(() => [list.instance([t]), maybe.instance([t])]),
        ],
        't',
      ),
    )
    this.variables.set(
      'append',
      Func.make(
        t => [t, Func.make(() => [list.instance([t]), list.instance([t])])],
        't',
      ),
    )
    this.variables.set(
      'filterMap',
      Func.make(
        (a, b) => [
          Func.make(() => [a, b]),
          Func.make(() => [list.instance([a]), list.instance([b])]),
        ],
        'a',
        'b',
      ),
    )
    this.variables.set('yes', maybe.constructorType('yes'))
    this.variables.set('none', maybe.constructorType('none'))
    this.variables.set(
      'default',
      Func.make(t => [t, Func.make(() => [maybe.instance([t]), t])], 't'),
    )
    this.variables.set('ok', maybe.constructorType('ok'))
    this.variables.set('err', maybe.constructorType('err'))
    this.variables.set(
      'then',
      Func.make(
        (a, b) => [
          Func.make(() => [a, cmd.instance([b])]),
          Func.make(() => [cmd.instance([a]), cmd.instance([b])]),
        ],
        'a',
        'b',
      ),
    )
    this.variables.set(
      'mapFrom',
      Func.make(
        (k, v) => [list.instance([new Tuple([k, v])]), map.instance([k, v])],
        'k',
        'v',
      ),
    )
    this.variables.set(
      'getValue',
      Func.make(
        (k, v) => [
          k,
          Func.make(() => [map.instance([k, v]), maybe.instance([v])]),
        ],
        'k',
        'v',
      ),
    )
    this.variables.set(
      'entries',
      Func.make(
        (k, v) => [map.instance([k, v]), list.instance([new Tuple([k, v])])],
        'k',
        'v',
      ),
    )
  }
}
