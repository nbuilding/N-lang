import { TypeSpec, EnumSpec, AliasSpec, FuncTypeVarSpec } from './TypeSpec'

export type NamedType = {
  type: 'named'
  typeSpec: TypeSpec
  typeVars: NType[]
}

export type EnumType = {
  type: 'named'
  typeSpec: EnumSpec
  typeVars: NType[]
}

export type EnumVariant = {
  types: NType[] | null
  public: boolean
}

export type AliasType = {
  type: 'named'
  typeSpec: AliasSpec
  typeVars: NType[]
}

export type FuncTypeVar = {
  type: 'named'
  typeSpec: FuncTypeVarSpec
  typeVars: NType[]
}

export type NTuple = {
  type: 'tuple'
  types: NType[]
}

export type NRecord = {
  type: 'record'
  types: Map<string, NType>
}
export function makeRecord(types: Record<string, NType>): NRecord {
  return {
    type: 'record',
    types: new Map(Object.entries(types)),
  }
}

export type NModule = {
  type: 'module'
  path: string
  /** Exported variables */
  types: Map<string, NType>
  exportedTypes: Map<string, TypeSpec | 'error'>
}

export type NFunction = {
  type: 'function'
  argument: NType
  return: NType
  typeVars: FuncTypeVarSpec[]
  trait: boolean
}
export function functionFromTypes(
  types: NType[],
  typeVars: FuncTypeVarSpec[] = [],
  trait: boolean = false,
): NFunction {
  if (types.length > 2) {
    return {
      type: 'function',
      argument: types[0],
      return: functionFromTypes(types.slice(1)),
      typeVars,
      trait
    }
  } else if (types.length === 2) {
    return { type: 'function', argument: types[0], return: types[1], typeVars, trait }
  } else {
    throw new RangeError('Can only make a function from 2+ types.')
  }
}
export function makeFunction(
  typesMaker: (...typeVars: NamedType[]) => NType[],
  trait = false,
  ...typeVarNames: string[]
): NFunction {
  const typeVars = typeVarNames.map(name => new FuncTypeVarSpec(name))
  return functionFromTypes(
    typesMaker(...typeVars.map((typeSpec): NamedType => typeSpec.instance())),
    typeVars,
    trait,
  )
}

export type NUnion = {
  type: 'union'
  types: TypeSpec[]
}

export type Unknown = {
  type: 'unknown'
}
export const unknown: Unknown = { type: 'unknown' }

export type NTypeKnown =
  | NamedType
  | NTuple
  | NRecord
  | NModule
  | NFunction
  | NUnion
export type NType = NTypeKnown | Unknown

/**
 * Returns an iterator over all the types and their contained types.
 */
export function* iterateType(type: NType): Generator<NType> {
  yield type
  switch (type.type) {
    case 'named': {
      for (const typeVar of type.typeVars) {
        yield* iterateType(typeVar)
      }
      break
    }
    case 'tuple': {
      for (const item of type.types) {
        yield* iterateType(item)
      }
      break
    }
    case 'record': {
      for (const item of type.types.values()) {
        yield* iterateType(item)
      }
      break
    }
    case 'function': {
      yield type.argument
      yield type.return
      break
    }
  }
}

/**
 * Calls `mapFn` on every contained type. If `mapFn` returns a type, then the
 * function will return the type. Otherwise, it'll map over all the contained
 * types in the type.
 */
function mapType(
  type: NType,
  mapFn: (type: NType) => NType | undefined,
): NType {
  const result = mapFn(type)
  if (result) {
    return result
  }
  switch (type.type) {
    case 'named': {
      return {
        type: 'named',
        typeSpec: type.typeSpec,
        typeVars: type.typeVars.map(type => mapType(type, mapFn)),
      }
    }
    case 'tuple': {
      return {
        type: 'tuple',
        types: type.types.map(type => mapType(type, mapFn)),
      }
    }
    case 'record': {
      return {
        type: 'record',
        types: new Map(
          Array.from(type.types, ([key, type]) => [key, mapType(type, mapFn)]),
        ),
      }
    }
    case 'function': {
      const newType: NFunction = {
        type: 'function',
        argument: mapType(type.argument, mapFn),
        return: mapType(type.return, mapFn),
        typeVars: type.typeVars,
        trait: false,
      }
      return newType
    }
    default: {
      return type
    }
  }
}

// NOTE: Unused; may remove
/** Get all the function type variable specs in a type */
export function getFuncTypeVars(type: NType): Set<FuncTypeVarSpec> {
  const typeVarSpecs: Set<FuncTypeVarSpec> = new Set()
  for (const innerType of iterateType(type)) {
    if (
      innerType.type === 'named' &&
      innerType.typeSpec instanceof FuncTypeVarSpec
    ) {
      typeVarSpecs.add(innerType.typeSpec)
    }
  }
  return typeVarSpecs
}

/**
 * Substitute function type variables by their type specs in a type.
 *
 * `trackSubstitutions` is useful for determining which type specs were never
 * substituted, which can happen if they aren't used in the function (in which
 * case they can be removed).
 */
export function substitute(
  type: NType,
  substitutions: Map<TypeSpec, NType>,
  trackSubstitutions?: Set<TypeSpec>,
): NType {
  if (substitutions.size === 0) {
    return type
  }
  return (
    mapType(type, type => {
      if (type.type === 'named') {
        const substitution = substitutions.get(type.typeSpec)
        if (trackSubstitutions && substitution) {
          trackSubstitutions.add(type.typeSpec)
        }
        return substitution
      }
    }) || type
  )
}
