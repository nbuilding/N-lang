export class TypeSpec {
  name: string
  typeVarCount: number

  constructor (name: string, typeVarCount: number) {
    this.name = name
    this.typeVarCount = typeVarCount
  }

  instance (typeVars: NType[]): NamedType {
    return {
      type: 'named',
      typeSpec: this,
      typeVars,
    }
  }
}

export class AliasSpec extends TypeSpec {
  type: NType

  constructor (name: string, typeVarCount: number, type: NType) {
    super(name, typeVarCount)

    this.type = type
  }

  /** Expands the alias and returns the type the alias is an alias for. */
  substitute (_typeVars: NType[]): NType {
    throw new Error('todo')
  }
}

export class FuncTypeVarSpec extends TypeSpec {
  function!: NFunction

  constructor (name: string) {
    super(name, 0)
  }

  clone () {
    return new FuncTypeVarSpec(this.name)
  }
}

export type NamedType = {
  type: 'named'
  typeSpec: TypeSpec
  typeVars: NType[]
}

export interface NTuple {
  type: 'tuple'
  types: NType[]
}

export interface NRecord {
  type: 'record'
  types: Map<string, NType>
}

export interface NFunction {
  type: 'function'
  argument: NType
  return: NType
  typeVars: FuncTypeVarSpec[]
}

export interface NUnion {
  type: 'union'
  types: TypeSpec[]
}

export interface Unknown {
  type: 'unknown'
}

export type NTypeKnown = NamedType | NTuple | NRecord | NFunction | NUnion
export type NType = NTypeKnown | Unknown

/**
 * Returns an iterator over all the types and their contained types.
 */
function * iterateType (type: NType): Generator<NType> {
  yield type
  switch (type.type) {
    case 'named': {
      for (const typeVar of type.typeVars) {
        yield * iterateType(typeVar)
      }
      break
    }
    case 'tuple': {
      for (const item of type.types) {
        yield * iterateType(item)
      }
      break
    }
    case 'record': {
      for (const item of type.types.values()) {
        yield * iterateType(item)
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
 *
 * `mapType` will avoid creating new instances if no changes were made from
 * mapping. If there were no changes, it returns null.
 *
 * Functions will create new type variables and substitute them if their
 * argument/return type changed.
 */
function mapType (
  type: NType,
  mapFn: (type: NType) => NType | undefined,
): NType | null {
  const result = mapFn(type)
  if (result) {
    return result
  }
  switch (type.type) {
    case 'named': {
      const typeVars = type.typeVars.map(type => mapType(type, mapFn))
      if (typeVars.every(item => item === null)) {
        return null
      }
      return {
        type: 'named',
        typeSpec: type.typeSpec,
        typeVars: typeVars.map((typeVar, i) => typeVar || type.typeVars[i]),
      }
    }
    case 'tuple': {
      const types = type.types.map(type => mapType(type, mapFn))
      if (types.every(item => item === null)) {
        return null
      }
      return {
        type: 'tuple',
        types: types.map((item, i) => item || type.types[i]),
      }
    }
    case 'record': {
      const types: [string, NType, NType | null][] = Array.from(
        type.types,
        ([key, type]) => [key, type, mapType(type, mapFn)],
      )
      if (types.every(tuple => tuple[2] === null)) {
        return null
      }
      return {
        type: 'record',
        types: new Map(
          types.map(([key, type, newType]) => [key, newType || type]),
        ),
      }
    }
    case 'function': {
      const argumentType = mapType(type.argument, mapFn)
      const returnType = mapType(type.return, mapFn)
      if (argumentType === null && returnType === null) {
        return null
      }
      const newType: NFunction = {
        type: 'function',
        argument: argumentType || type.argument,
        return: returnType || type.return,
        typeVars: [],
      }
      if (type.typeVars.length > 0) {
        const substitutions = new Map()
        for (const typeVar of type.typeVars) {
          const newTypeVar = typeVar.clone()
          newTypeVar.function = newType
          substitutions.set(typeVar, newTypeVar)
        }
        const tracker: Set<FuncTypeVarSpec> = new Set()
        // Since `substitute` uses `mapType`, hopefully this doesn't cause too
        // much recursion, especially in the case of nested functions
        newType.argument = substitute(newType.argument, substitutions, tracker)
        newType.return = substitute(newType.return, substitutions, tracker)
        for (const typeVar of substitutions.keys()) {
          if (!tracker.has(typeVar)) {
            substitutions.delete(typeVar)
          }
        }
        newType.typeVars = [...substitutions.values()]
      }
      return newType
    }
    default: {
      return null
    }
  }
}

// NOTE: Unused; may remove
/** Get all the function type variable specs in a type */
export function getFuncTypeVars (type: NType): Set<FuncTypeVarSpec> {
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
export function substitute (
  type: NType,
  substitutions: Map<FuncTypeVarSpec, NType>,
  trackSubstitutions?: Set<FuncTypeVarSpec>,
): NType {
  return (
    mapType(type, type => {
      if (type.type === 'named' && type.typeSpec instanceof FuncTypeVarSpec) {
        const substitution = substitutions.get(type.typeSpec)
        if (trackSubstitutions && substitution) {
          trackSubstitutions.add(type.typeSpec)
        }
        return substitution
      }
    }) || type
  )
}
