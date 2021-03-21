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

export type TypeSpecVar = TypeSpec
  | TupleSpec
  | RecordSpec
  | FunctionSpec

export class TupleSpec {
  types: TypeSpecVar[]

  constructor (types: TypeSpecVar[]) {
    this.types = types
  }
}

export class RecordSpec {
  types: Map<string, TypeSpecVar>

  constructor (types: Map<string, TypeSpecVar>) {
    this.types = types
  }
}

export class FunctionSpec {
  generics: TypeSpec[]
  takes: TypeSpecVar
  returns: TypeSpecVar

  constructor (takes: TypeSpecVar, returns: TypeSpecVar, generics: TypeSpec[] = []) {
    this.takes = takes
    this.returns = returns
    this.generics = generics
  }
}
