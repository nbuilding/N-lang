import { Function as Func, makeVar, NType, Type, TypeVar } from './types'

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
  typeVars: TypeVar[]

  constructor (name: string, typeVars: TypeVar[] = []) {
    this.name = name
    this.typeVars = typeVars
  }

  instance (typeVars: NType[] = []): Type {
    if (this.typeVars.length !== typeVars.length) {
      throw new TypeError(
        `Spec has ${this.typeVars.length} type vars, but was instantiated with ${typeVars.length}.`,
      )
    }
    return new Type(this, typeVars)
  }
}

export class EnumTypeSpec extends TypeSpec {
  variants: Map<string, NType[]>

  constructor (
    name: string,
    typeVars: TypeVar[],
    variants: Map<string, NType[]>,
  ) {
    super(name, typeVars)
    this.variants = variants
  }

  /** Not safe! Throws an error if the variant does not exist. */
  constructorType (variantName: string): Func | Type {
    const variant = this.variants.get(variantName)
    const typeVars = this.typeVars.map(typeVar => typeVar.clone())
    if (variant) {
      const product = this.instance(typeVars)
      if (variant.length > 0) {
        return Func.fromTypes([...variant, product], typeVars)
      } else {
        return product
      }
    } else {
      throw new TypeError(
        `Variant ${variantName} does not exist for ${this.name}.`,
      )
    }
  }

  static make (
    name: string,
    maker: (...typeVars: TypeVar[]) => [string, NType[]][],
    ...typeVarNames: string[]
  ): EnumTypeSpec {
    const generics = typeVarNames.map(makeVar)
    const variants = new Map(maker(...generics))
    return new EnumTypeSpec(name, generics, variants)
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
