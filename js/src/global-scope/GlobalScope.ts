import { Scope } from '../type-checker/Scope';
import { TypeCheckerResultsForFile } from '../type-checker/TypeChecker';
import {
  str,
  int,
  float,
  char,
  list,
  map,
  cmd,
  boolSpec,
  maybe,
  result,
} from '../type-checker/types/builtins';
import { NType, makeFunction, NFunction } from '../type-checker/types/types';
import { TypeSpec } from '../type-checker/types/TypeSpec';

const variables: Map<string, NType> = new Map();
const types: Map<string, TypeSpec> = new Map();
const traits: Map<string, Map<string, NFunction>> = new Map();

const setTrait = (name: string, traitName: string, type: NFunction) => {
  if (!traits.has(name)) {
    traits.set(name, new Map());
  }

  if (!type.trait) {
    throw new Error(
      `INTERNAL ERROR: Cannot accept ${name}.${traitName} because it is not marked as a trait`,
    );
  }

  traits.get(name)?.set(traitName, type);
};

// Types
types.set('str', str.typeSpec);
types.set('int', int.typeSpec);
types.set('float', float.typeSpec);
types.set('char', char.typeSpec);

types.set('list', list);
types.set('map', map);
types.set('cmd', cmd);

types.set('bool', boolSpec);
variables.set('true', boolSpec.getConstructorType('true'));
variables.set('false', boolSpec.getConstructorType('false'));

types.set('maybe', maybe);
variables.set('yes', maybe.getConstructorType('yes'));
variables.set('none', maybe.getConstructorType('none'));

types.set('result', result);
variables.set('ok', result.getConstructorType('ok'));
variables.set('err', result.getConstructorType('err'));

// Default functions
variables.set(
  'range',
  makeFunction(() => [int, int, int, list.instance([int])]),
);
variables.set(
  'print',
  makeFunction(t => [t, t], false, 't'),
);
variables.set(
  'mapFrom',
  makeFunction(
    (k, v) => [
      list.instance([{ type: 'tuple', types: [k, v] }]),
      map.instance([k, v]),
    ],
    false,
    'k',
    'v',
  ),
);

// Default Traits
setTrait(
  'int',
  'intInBase10',
  makeFunction(() => [int, str], true),
);
setTrait(
  'int',
  'intCode',
  makeFunction(() => [int, char], true),
);

setTrait(
  'float',
  'round',
  makeFunction(() => [float, int], true),
);
setTrait(
  'float',
  'floor',
  makeFunction(() => [float, int], true),
);
setTrait(
  'float',
  'ceil',
  makeFunction(() => [float, int], true),
);

setTrait(
  'char',
  'charCode',
  makeFunction(() => [char, int], true),
);

setTrait(
  'str',
  'charAt',
  makeFunction(() => [str, int, maybe.instance([char])], true),
);
setTrait(
  'str',
  'substring',
  makeFunction(() => [str, int, int, str], true),
);
setTrait(
  'str',
  'len',
  makeFunction(() => [str, int], true),
);
setTrait(
  'str',
  'split',
  makeFunction(() => [str, char, list.instance([char])], true),
);
setTrait(
  'str',
  'strip',
  makeFunction(() => [str, str], true),
);

setTrait(
  'list',
  'len',
  makeFunction(t => [list.instance([t]), int], true, 't'),
);
setTrait(
  'list',
  'itemAt',
  makeFunction(t => [list.instance([t]), int, maybe.instance([t])], true, 't'),
);
setTrait(
  'list',
  'append',
  makeFunction(t => [list.instance([t]), t, list.instance([t])], true, 't'),
);
setTrait(
  'list',
  'filterMap',
  makeFunction(
    (a, b) => [
      list.instance([a]),
      makeFunction(() => [a, maybe.instance([b])]),
      list.instance([b]),
    ],
    true,
    'a',
    'b',
  ),
);

setTrait(
  'maybe',
  'default',
  makeFunction(t => [maybe.instance([t]), t, t], true, 't'),
);

setTrait(
  'cmd',
  'then',
  makeFunction(
    (a, b) => [
      cmd.instance([a]),
      makeFunction(() => [a, cmd.instance([b])]),
      cmd.instance([b]),
    ],
    true,
    'k',
    'v',
  ),
);

setTrait(
  'map',
  'getValue',
  makeFunction(
    (k, v) => [map.instance([k, v]), k, maybe.instance([v])],
    true,
    'k',
    'v',
  ),
);
setTrait(
  'map',
  'entries',
  makeFunction(
    (k, v) => [
      map.instance([k, v]),
      list.instance([{ type: 'tuple', types: [k, v] }]),
    ],
    true,
    'k',
    'v',
  ),
);

export class GlobalScope extends Scope {
  constructor(results: TypeCheckerResultsForFile) {
    super(results);

    this.variables = variables;
    this.types = types;
    this.traits = traits;
  }
}
