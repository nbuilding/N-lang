import {
  EnumRepresentation,
  normaliseEnum,
} from '../../compiler/EnumRepresentation'
import { uniqueId } from '../../utils/uuid'
import {
  NType,
  NamedType,
  EnumVariant,
  unknown,
  functionFromTypes,
  substitute,
  EnumType,
  AliasType,
  FuncTypeVar,
} from './types'

export class TypeSpec {
  name: string
  typeVarCount: number
  isUnit: boolean = false

  constructor (name: string, typeVarCount = 0) {
    this.name = name
    this.typeVarCount = typeVarCount
  }

  instance (typeVars: NType[] = []): NamedType {
    return {
      type: 'named',
      typeSpec: this,
      typeVars,
    }
  }
}

export class EnumSpec extends TypeSpec {
  /** Invalid variants are null. */
  variants: Map<string, EnumVariant>
  typeVars: TypeSpec[]
  private _representation?: EnumRepresentation

  constructor (
    name: string,
    variants: Map<string, EnumVariant>,
    typeVars: TypeSpec[],
  ) {
    super(name, typeVars.length)

    this.variants = variants
    this.typeVars = typeVars
  }

  /** Throws an error if the variant does not exist */
  getConstructorType (variantName: string): NType {
    const variant = this.variants.get(variantName)
    if (variant) {
      if (variant.types === null) {
        return unknown
      }
      if (variant.types.length === 0) {
        const unknowns = []
        for (let i = 0; i < this.typeVarCount; i++) {
          unknowns.push(unknown)
        }
        return this.instance(unknowns)
      } else {
        const funcTypeVars = []
        const substitutions: Map<TypeSpec, NType> = new Map()
        for (const typeVar of this.typeVars) {
          const funcTypeVar = new FuncTypeVarSpec(typeVar.name)
          funcTypeVars.push(funcTypeVar)
          substitutions.set(typeVar, funcTypeVar.instance())
        }
        return functionFromTypes(
          [
            ...variant.types.map(field => substitute(field, substitutions)),
            this.instance(funcTypeVars.map(typeVar => typeVar.instance())),
          ],
          funcTypeVars,
        )
      }
    } else {
      throw new ReferenceError(`Variant ${variantName} doesn't exist.`)
    }
  }

  /** Get the types contained in each variant, excluding invalid ones. */
  getVariants (typeVars: NType[]): NType[][] {
    const substitutions: Map<TypeSpec, NType> = new Map()
    typeVars.forEach((typeVar, i) => {
      substitutions.set(this.typeVars[i], typeVar)
    })
    return [...this.variants.values()].map(({ types }) =>
      types ? types.map(type => substitute(type, substitutions)) : [],
    )
  }

  get representation (): EnumRepresentation {
    if (!this._representation) {
      this._representation = normaliseEnum(this)
    }
    return this._representation
  }

  /** Assumes that all variants are public */
  static make (
    name: string,
    variantMaker: (...typeVars: NamedType[]) => [string, NType[]][],
    ...typeVarNames: string[]
  ): EnumSpec {
    const typeVars = typeVarNames.map(name => new TypeSpec(name))
    return new EnumSpec(
      name,
      new Map(
        variantMaker(
          ...typeVars.map((typeSpec): NamedType => typeSpec.instance()),
        ).map(([name, types]) => [name, { public: true, types }]),
      ),
      typeVars,
    )
  }

  static isEnum (type: NType): type is EnumType {
    return type.type === 'named' && type.typeSpec instanceof EnumSpec
  }
}

export class AliasSpec extends TypeSpec {
  type: NType
  typeVars: TypeSpec[]

  constructor (name: string, type: NType, typeVars: TypeSpec[] = []) {
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

  /**
   * Recursively resolve an alias type until it is no longer an alias. Useful
   * for determining whether a type is a list/record/etc. Note that this is
   * shallow; the type can still contain other aliases.
   */
  static resolve (type: NType): NType {
    while (this.isAlias(type)) {
      type = type.typeSpec.substitute(type.typeVars)
    }
    return type
  }
}

export class FuncTypeVarSpec extends TypeSpec {
  id = uniqueId()

  constructor (name: string) {
    super(name, 0)
  }

  clone (): FuncTypeVarSpec {
    return new FuncTypeVarSpec(this.name)
  }

  static isTypeVar (type: NType): type is FuncTypeVar {
    return type.type === 'named' && type.typeSpec instanceof FuncTypeVarSpec
  }
}
