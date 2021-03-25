import { AliasSpec, TypeSpec } from './type-specs'

export enum ExpectEqualResult {
  Equal,
  NotEqual,
  HasNull,
}

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
   *
   * Return `'has-null'` if the type contains null, but otherwise the shape
   * agrees. This should indicate that the types could be equal had the types
   * been correct elsewhere, and the type checker will not repeat-warn here.
   */
  expectEqual(other: NType): ExpectEqualResult

  /**
   * Substitute a TypeVar (matching by pointer in memory) with an NType.
   */
  substitute(substitutions: Map<TypeVar, NType>): NType
}

export class Type implements NType {
  spec: TypeSpec
  typeVars: (NType | null)[]

  constructor (spec: TypeSpec, typeVars: (NType | null)[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  expectEqual (other: NType): ExpectEqualResult {
    if (other instanceof Type && this.spec === other.spec) {
      const results = this.typeVars.map((thisTypeVar, i) => {
        const otherTypeVar = other.typeVars[i]
        if (thisTypeVar === null || otherTypeVar === null) {
          return ExpectEqualResult.HasNull
        }
        return thisTypeVar.expectEqual(otherTypeVar)
      })
      return results.includes(ExpectEqualResult.HasNull)
        ? ExpectEqualResult.HasNull
        : results.includes(ExpectEqualResult.NotEqual)
        ? ExpectEqualResult.NotEqual
        : ExpectEqualResult.Equal
    } else {
      return ExpectEqualResult.NotEqual
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
          return typeVar && typeVar.substitute(substitutions)
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

  expectEqual (other: NType): ExpectEqualResult {
    return this === other ? ExpectEqualResult.Equal : ExpectEqualResult.NotEqual
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

export function resolve (type: NType): NType {
  if (type instanceof Unknown) {
    return type.resolvedType()
  } else if (type instanceof AliasType) {
    return resolve(type.type)
  } else {
    return type
  }
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
      return resolve(this.resolved)
    } else {
      return this
    }
  }

  expectEqual (other: NType): ExpectEqualResult {
    const thisType = resolve(this)
    const otherType = resolve(other)
    if (thisType instanceof Unknown) {
      // Does not matter whether `otherType` is also an Unknown since they
      // can be chained.
      this.resolved = otherType
      return ExpectEqualResult.Equal
    } else if (otherType instanceof Unknown) {
      otherType.resolved = thisType
      return ExpectEqualResult.Equal
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
}

export class AliasType implements NType {
  spec: AliasSpec
  type: NType

  constructor (spec: AliasSpec, type: NType) {
    this.spec = spec
    this.type = type
  }

  expectEqual (other: NType): ExpectEqualResult {
    return resolve(this).expectEqual(resolve(other))
  }

  substitute (substitutions: Map<TypeVar, NType>): NType {
    return this.type.substitute(substitutions)
  }
}

export class Number {
  resolved?: Type
}

export class Tuple implements NType {
  types: (NType | null)[]

  constructor (types: (NType | null)[]) {
    this.types = types
  }

  expectEqual (other: NType): ExpectEqualResult {
    if (other instanceof Tuple && this.types.length === other.types.length) {
      const results = this.types.map((thisType, i) => {
        const otherType = other.types[i]
        if (thisType === null || otherType === null) {
          return ExpectEqualResult.HasNull
        }
        return thisType.expectEqual(otherType)
      })
      return results.includes(ExpectEqualResult.HasNull)
        ? ExpectEqualResult.HasNull
        : results.includes(ExpectEqualResult.NotEqual)
        ? ExpectEqualResult.NotEqual
        : ExpectEqualResult.Equal
    } else {
      return ExpectEqualResult.NotEqual
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Tuple {
    return new Tuple(
      this.types.map(type => {
        const substitution = type instanceof TypeVar && substitutions.get(type)
        if (substitution) {
          return substitution
        } else {
          return type && type.substitute(substitutions)
        }
      }),
    )
  }
}

export class Record implements NType {
  types: Map<string, NType | null>

  constructor (types: Map<string, NType | null>) {
    this.types = types
  }

  expectEqual (other: NType): ExpectEqualResult {
    if (other instanceof Record) {
      const results = Array.from(this.types, ([key, type]) => {
        const otherType = other.types.get(key)
        if (type === null || otherType === null) {
          return ExpectEqualResult.HasNull
        } else if (!otherType) {
          return ExpectEqualResult.NotEqual
        }
        return type.expectEqual(otherType)
      })
      if (results.includes(ExpectEqualResult.HasNull)) {
        return ExpectEqualResult.HasNull
      } else if (results.includes(ExpectEqualResult.NotEqual)) {
        return ExpectEqualResult.NotEqual
      }
      for (const key of other.types.keys()) {
        if (!this.types.has(key)) return ExpectEqualResult.NotEqual
      }
      return ExpectEqualResult.Equal
    } else {
      return ExpectEqualResult.NotEqual
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
            return [key, type && type.substitute(substitutions)]
          }
        }),
      ),
    )
  }
}

export class Module extends Record {
  path: string
  typeSpecs: Map<string, TypeSpec>

  constructor (
    path: string,
    types: Map<string, NType | null>,
    typeSpecs: Map<string, TypeSpec>,
  ) {
    super(types)
    this.path = path
    this.typeSpecs = typeSpecs
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

  expectEqual (other: NType): ExpectEqualResult {
    if (other instanceof Function) {
      const takesResult = this.takes.expectEqual(other.takes)
      const returnsResult = this.returns.expectEqual(other.returns)
      if (
        takesResult === ExpectEqualResult.HasNull ||
        returnsResult === ExpectEqualResult.HasNull
      ) {
        return ExpectEqualResult.HasNull
      } else {
        return takesResult === ExpectEqualResult.NotEqual ||
          returnsResult === ExpectEqualResult.NotEqual
          ? ExpectEqualResult.NotEqual
          : ExpectEqualResult.Equal
      }
    } else {
      return ExpectEqualResult.NotEqual
    }
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
  expectEqual (other: NType): ExpectEqualResult {
    return other instanceof Unit
      ? ExpectEqualResult.Equal
      : ExpectEqualResult.NotEqual
  }

  substitute (_substitutions: Map<TypeVar, NType>): NType {
    return this
  }
}
