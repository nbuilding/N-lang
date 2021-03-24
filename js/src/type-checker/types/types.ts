import { TypeSpec } from './type-specs'

/**
 * A type that represents a possible type of a variable.
 */
export interface NType {
  /**
   * IMPURE! Whether two types are expected to be equal. Only call this if you
   * expect the two types to be equal since this is impure and will try to
   * resolve Unknown types. If this returns true, then by Unknown resolution,
   * both types should be equivalent.
   *
   * For example, this may be used in assignment, returning, and function
   * calling.
   */
  expectEqual(other: NType): boolean

  /**
   * Substitute a TypeVar (matching by pointer in memory) with an NType.
   */
  substitute(substitutions: Map<TypeVar, NType>): NType
}

export class Type implements NType {
  spec: TypeSpec
  typeVars: NType[]

  constructor (spec: TypeSpec, typeVars: NType[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  expectEqual (other: NType): boolean {
    if (other instanceof Type && this.spec === other.spec) {
      for (let i = 0; i < this.typeVars.length; i++) {
        if (!this.typeVars[i].expectEqual(other.typeVars[i])) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Type {
    return this.spec.instance(
      this.typeVars.map(typeVar => {
        const substitution =
          typeVar instanceof TypeVar && substitutions.get(typeVar)
        if (substitution) {
          return substitution
        } else {
          return typeVar.substitute(substitutions)
        }
      }),
    )
  }
}

export class TypeVar implements NType {
  name: string

  constructor (name: string) {
    this.name = name
  }

  expectEqual (other: NType): boolean {
    return this === other
  }

  substitute (substitutions: Map<TypeVar, NType>): NType {
    return substitutions.get(this) || this
  }

  clone (): TypeVar {
    return new TypeVar(this.name)
  }
}

export function makeVar (name: string): TypeVar {
  return new TypeVar(name)
}

export class Unknown implements NType {
  resolved?: NType

  /**
   * Returns either an NType or an Unknown that has no resolved type. Thus, if
   * this returns an Unknown, you know it does not have a resolved type. If you
   * want to then resolve the Unknown's type, you can set `resolved` for the
   * Unknown returned by this method, and all the other Unknowns chained onto it
   * will also be resolved.
   */
  resolvedType (): NType {
    if (this.resolved) {
      if (this.resolved instanceof Unknown) {
        return this.resolved.resolvedType()
      } else {
        return this.resolved
      }
    } else {
      return this
    }
  }

  expectEqual (other: NType): boolean {
    const thisType = this.resolvedType()
    const otherType = Unknown.resolve(other)
    if (thisType instanceof Unknown) {
      // Does not matter whether `otherType` is also an Unknown since they
      // can be chained.
      this.resolved = otherType
      return true
    } else if (otherType instanceof Unknown) {
      otherType.resolved = thisType
      return true
    } else {
      return thisType.expectEqual(otherType)
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): NType {
    const resolvedType = this.resolvedType()
    if (resolvedType) {
      return resolvedType.substitute(substitutions)
    } else {
      return this
    }
  }

  static resolve (type: NType): NType {
    if (type instanceof Unknown) {
      return type.resolvedType()
    } else {
      return type
    }
  }
}

export class Number {
  resolved?: Type
}

export class Tuple implements NType {
  types: NType[]

  constructor (types: NType[]) {
    this.types = types
  }

  expectEqual (other: NType): boolean {
    if (other instanceof Tuple && this.types.length === other.types.length) {
      for (let i = 0; i < this.types.length; i++) {
        if (!this.types[i].expectEqual(other.types[i])) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Tuple {
    return new Tuple(
      this.types.map(type => {
        const substitution = type instanceof TypeVar && substitutions.get(type)
        if (substitution) {
          return substitution
        } else {
          return type.substitute(substitutions)
        }
      }),
    )
  }
}

export class Record implements NType {
  types: Map<string, NType>

  constructor (types: Map<string, NType>) {
    this.types = types
  }

  expectEqual (other: NType): boolean {
    if (other instanceof Record) {
      for (const [key, type] of this.types) {
        const otherType = other.types.get(key)
        if (!otherType || !type.expectEqual(otherType)) return false
      }
      for (const key of other.types.keys()) {
        if (!this.types.has(key)) return false
      }
      return true
    } else {
      return false
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Record {
    return new Record(
      new Map(
        Array.from(this.types.entries(), ([key, type]) => {
          const substitution =
            type instanceof TypeVar && substitutions.get(type)
          if (substitution) {
            return [key, substitution]
          } else {
            return [key, type.substitute(substitutions)]
          }
        }),
      ),
    )
  }
}

export class Function implements NType {
  generics: TypeVar[]
  takes: NType
  returns: NType

  constructor (takes: NType, returns: NType, generics: TypeVar[] = []) {
    this.takes = takes
    this.returns = returns
    this.generics = generics
  }

  expectEqual (other: NType): boolean {
    return (
      other instanceof Function &&
      this.takes.expectEqual(other.takes) &&
      this.returns.expectEqual(other.returns)
    )
  }

  substitute (substitutions: Map<TypeVar, NType>): Function {
    const takesSubstitution =
      this.takes instanceof TypeVar && substitutions.get(this.takes)
    const returnsSubstitution =
      this.returns instanceof TypeVar && substitutions.get(this.returns)
    return new Function(
      takesSubstitution || this.takes.substitute(substitutions),
      returnsSubstitution || this.returns.substitute(substitutions),
      this.generics.filter(typeVar => !substitutions.has(typeVar)),
    )
  }

  static make (
    maker: (...typeVars: TypeVar[]) => [NType, NType],
    ...typeVarNames: string[]
  ): Function {
    const generics = typeVarNames.map(makeVar)
    const [takes, returns] = maker(...generics)
    return new Function(takes, returns, generics)
  }

  static fromTypes (
    [type, type2, ...types]: NType[],
    generics: TypeVar[] = [],
  ): Function {
    return new Function(
      type,
      types.length > 0 ? Function.fromTypes([type2, ...types]) : type2,
      generics,
    )
  }
}

export class Unit implements NType {
  expectEqual (other: NType): boolean {
    return other instanceof Unit
  }

  substitute (_substitutions: Map<TypeVar, NType>): NType {
    return this
  }
}
