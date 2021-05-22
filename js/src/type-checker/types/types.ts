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

  constructor (name: string, typeVarCount: number) {
    super(name, typeVarCount)
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
