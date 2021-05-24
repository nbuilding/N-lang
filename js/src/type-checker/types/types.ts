export class TypeSpec {
  name: string
  typeVarCount: number

  constructor (name: string, typeVarCount: number = 0) {
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

export class EnumTypeSpec extends TypeSpec {
  variants: Map<string, NType[]>
  typeVars: TypeSpec[]

  constructor (
    name: string,
    variants: Map<string, NType[]>,
    typeVars: TypeSpec[],
  ) {
    super(name, typeVars.length)

    this.variants = variants
    this.typeVars = typeVars
  }

  getConstructorType (variantName: string): NType {
    const variant = this.variants.get(variantName)
    if (variant) {
      const funcTypeVars = []
      const substitutions: Map<TypeSpec, NType> = new Map()
      for (const typeVar of this.typeVars) {
        const funcTypeVar = new FuncTypeVarSpec(typeVar.name)
        funcTypeVars.push(funcTypeVar)
        substitutions.set(typeVar, funcTypeVar.instance([]))
      }
      return functionFromTypes(
        variant.map(field => substitute(field, substitutions)),
        funcTypeVars,
      )
    } else {
      throw new ReferenceError(`Variant ${variantName} doesn't exist.`)
    }
  }

  static make (
    name: string,
    variantMaker: (...typeVars: NamedType[]) => [string, NType[]][],
    ...typeVarNames: string[]
  ) {
    const typeVars = typeVarNames.map(name => new TypeSpec(name))
    return new EnumTypeSpec(
      name,
      new Map(
        variantMaker(
          ...typeVars.map((typeSpec): NamedType => typeSpec.instance([])),
        ),
      ),
      typeVars,
    )
  }
}

type AliasType = {
  type: 'named'
  typeSpec: AliasSpec
  typeVars: NType[]
}

export class AliasSpec extends TypeSpec {
  type: NType
  typeVars: TypeSpec[]

  constructor (name: string, type: NType, typeVars: TypeSpec[]) {
    super(name, typeVars.length)

    this.type = type
    this.typeVars = typeVars
  }

  /** Expands the alias and returns the type the alias is an alias for. */
  substitute (typeVars: NType[]): NType {
    const substitutions: Map<TypeSpec, NType> = new Map()
    typeVars.forEach((typeVar, i) => {
      substitutions.set(this.typeVars[i], typeVar)
    })
    return substitute(this.type, substitutions)
  }

  static isAlias (type: NType): type is AliasType {
    return type.type === 'named' && type.typeSpec instanceof AliasSpec
  }
}

type FuncTypeVar = {
  type: 'named'
  typeSpec: FuncTypeVarSpec
  typeVars: NType[]
}

export class FuncTypeVarSpec extends TypeSpec {
  constructor (name: string) {
    super(name, 0)
  }

  clone () {
    return new FuncTypeVarSpec(this.name)
  }

  static isTypeVar (type: NType): type is FuncTypeVar {
    return type.type === 'named' && type.typeSpec instanceof FuncTypeVarSpec
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
export function functionFromTypes (
  types: NType[],
  typeVars: FuncTypeVarSpec[] = [],
): NFunction {
  if (types.length > 2) {
    return {
      type: 'function',
      argument: types[0],
      return: functionFromTypes(types.slice(1)),
      typeVars,
    }
  } else if (types.length === 2) {
    return { type: 'function', argument: types[0], return: types[1], typeVars }
  } else {
    throw new RangeError('Can only make a function from 2+ types.')
  }
}
export function makeFunction (
  typesMaker: (...typeVars: NamedType[]) => NType[],
  ...typeVarNames: string[]
) {
  const typeVars = typeVarNames.map(name => new FuncTypeVarSpec(name))
  return functionFromTypes(
    typesMaker(...typeVars.map((typeSpec): NamedType => typeSpec.instance([]))),
    typeVars,
  )
}

export interface NUnion {
  type: 'union'
  types: TypeSpec[]
}

export interface Unknown {
  type: 'unknown'
}
export const unknown: Unknown = { type: 'unknown' }

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
 */
function mapType (
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
  substitutions: Map<TypeSpec, NType>,
  trackSubstitutions?: Set<TypeSpec>,
): NType {
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
