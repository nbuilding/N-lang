import { NType, Type } from './types'

/**
 * A type spec represents a declared type. For example, making an enum will make
 * a type spec.
 *
 * The distinction between a type spec and a normal type is important to
 * distinguish between generic types from a declaration and generic types of a
 * function body, for example.
 *
 * The types available in a scope are type specs.
 */
export class TypeSpec {
  name: string
  // In the future, this could hold the traits
  typeVars: string[]

  constructor (name: string, typeVars: string[] = []) {
    this.name = name
    this.typeVars = typeVars
  }

  instance (typeVars: NType[]): Type {
    return new Type(this, typeVars)
  }
}

export class EnumTypeSpec extends TypeSpec {
  variants: EnumVariant[]

  constructor (name: string, typeVars: string[] = [], variants: EnumVariant[]) {
    super(name, typeVars)
    this.variants = variants
  }
}

export class EnumVariant {
  name: string
  types: NType[]

  constructor (name: string, types: NType[] = []) {
    this.name = name
    this.types = types
  }
}

export class AliasSpec {
  name: string
  type: NType

  constructor (name: string, type: NType) {
    this.name = name
    this.type = type
  }
}
