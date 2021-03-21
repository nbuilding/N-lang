import { TypeSpec } from "./type-specs"

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
  expectEqual (other: NType): boolean
}

export class Type implements NType {
  spec: TypeSpec
  typeVars: (NType | Unknown)[]

  constructor (spec: TypeSpec, typeVars: (NType | Unknown)[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  expectEqual (other: NType): boolean {
    if (other instanceof Type && this.spec === other.spec) {
      for (let i = 0; i < this.typeVars.length; i++) {
        const thisVar = Unknown.resolve(this.typeVars[i])
        const otherVar = Unknown.resolve(other.typeVars[i])
        if (thisVar instanceof Unknown) {
          // Does not matter whether `otherVar` is also an Unknown since they
          // can be chained.
          thisVar.resolved = otherVar
        } else if (otherVar instanceof Unknown) {
          otherVar.resolved = thisVar
        } else if (!thisVar.expectEqual(otherVar)) {
          return false
        }
      }
      return true
    } else {
      return false
    }
  }
}

export class Unknown {
  resolved?: NType | Unknown

  /**
   * Returns either an NType or an Unknown that has no resolved type. Thus, if
   * this returns an Unknown, you know it does not have a resolved type. If you
   * want to then resolve the Unknown's type, you can set `resolved` for the
   * Unknown returned by this method, and all the other Unknowns chained onto it
   * will also be resolved.
   */
  resolvedType (): NType | Unknown {
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

  static resolve (type: NType | Unknown): NType | Unknown {
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
}

export class Function implements NType {
  generics: Type[]
  takes: NType
  returns: NType

  constructor (takes: NType, returns: NType, generics: Type[] = []) {
    this.takes = takes
    this.returns = returns
    this.generics = generics
  }

  expectEqual (other: NType): boolean {
    return other instanceof Function
      && this.takes.expectEqual(other.takes)
      && this.returns.expectEqual(other.returns)
  }
}
