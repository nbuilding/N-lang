import { AliasSpec, TypeSpec } from './type-specs'

export enum ExpectEqualResult {
  Equal,
  NotEqual,
  HasNull,
}

interface DisplayOptions {
  tempNames: Generator<string, never>

  replacements: Map<FuncTypeVar, string>
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

  /**
   * Yields all contained types. Will not yield null, Unknown, or Module.
   */
  innerTypes(): Generator<NType, void>

  display(options: DisplayOptions): string
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

  * innerTypes () {
    yield this
    for (const typeVar of this.typeVars) {
      if (typeVar) {
        yield * typeVar.innerTypes()
      }
    }
  }

  display (options: DisplayOptions): string {
    return this.typeVars.length > 0
      ? `${this.spec.name}[${this.typeVars
          .map(typeVar => (typeVar ? typeVar.display(options) : '...'))
          .join(', ')}]`
      : this.spec.name
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

  * innerTypes () {
    yield this
  }

  display (_options: DisplayOptions): string {
    throw new Error('Type vars cannot be displayed')
  }
}

export class FuncTypeVar extends TypeVar {
  func!: Function
  resolvedType?: NType

  constructor (name: string) {
    super(name)
  }

  expectEqual (other: NType): ExpectEqualResult {
    // I think it's possible for two FuncTypeVars
    return this === other ? ExpectEqualResult.Equal : ExpectEqualResult.NotEqual
  }

  substitute (substitutions: Map<TypeVar, NType>): NType {
    return substitutions.get(this) || this
  }

  display (options: DisplayOptions): string {
    const name = options.replacements.get(this)
    if (name) {
      return name
    } else {
      throw new ReferenceError('FuncTypeVar not defined I think')
    }
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

  * innerTypes () {
    if (this.resolved) {
      yield * this.resolved.innerTypes()
    }
  }

  display (options: DisplayOptions): string {
    return this.resolved ? this.resolved.display(options) : '...'
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

  * innerTypes () {
    yield this
    yield * this.type.innerTypes()
  }

  display (_options: DisplayOptions): string {
    return this.spec.name
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

  * innerTypes () {
    yield this
    for (const type of this.types) {
      if (type) {
        yield * type.innerTypes()
      }
    }
  }

  display (options: DisplayOptions): string {
    return this.types
      .map(type =>
        type instanceof Tuple
          ? `(${type.display(options)})`
          : type
          ? type.display(options)
          : '...',
      )
      .join(', ')
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

  * innerTypes () {
    yield this
    for (const [, type] of this.types) {
      if (type) {
        yield * type.innerTypes()
      }
    }
  }

  display (options: DisplayOptions): string {
    return `{${Array.from(
      this.types,
      ([key, type]) => `${key}: ${type ? type.display(options) : '...'}`,
    ).join('; ')}}`
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

  * innerTypes () {
    yield this
  }

  display (_options: DisplayOptions): string {
    return `module ${JSON.stringify(this.path)}`
  }
}

export interface ReturnTypeResult {
  type: NType | 'unresolved-generic'
  paramTypeIncompatible: boolean
}

export class Function implements NType {
  generics: FuncTypeVar[]
  takes: NType
  returns: NType

  constructor (takes: NType, returns: NType, generics: FuncTypeVar[] = []) {
    this.takes = takes
    this.returns = returns
    this.generics = generics
    for (const generic of generics) {
      generic.func = this
    }
  }

  /**
   * IMPURE! Will irreversibly resolve its FuncTypeVars.
   * Returns
   * - The return type, with resolved type vars replaced. For example, ([a, b] a ->
   *   b -> (a, b))(str) will produce [b] b -> (str, b) (note now that ownership
   *   of `b` has been passed down to the return value)
   * - null if the types contain an error type (for example, [b]
   *   undefinedTypeUsingB -> b)
   * - 'param-not-compatible' if the function takes type is not compatible
   * - 'unresolved-generic' for functions like `[t] str -> t`
   *
   * ([t] list[t] -> int)(str) is pretty clearly `int` even if the param type
   * doesn't match.
   */
  returnTypeFromParam (paramType: NType): ReturnTypeResult {
    const result = this.takes.expectEqual(paramType)
    const substitutions = new Map()
    const unresolvedGenerics = []
    for (const generic of this.generics) {
      if (generic.resolvedType) {
        substitutions.set(generic, generic.resolvedType)
      } else {
        unresolvedGenerics.push(generic)
      }
    }
    const returnType = resolve(this.returns.substitute(substitutions))
    if (returnType instanceof Function) {
      returnType.generics.push(...unresolvedGenerics)
    } else if (unresolvedGenerics.length > 0) {
      // `unresolvedGenerics` will get discarded for a function like `[t] str ->
      // t`
      return {
        type: 'unresolved-generic',
        paramTypeIncompatible: result === ExpectEqualResult.NotEqual,
      }
    }
    return {
      type: returnType,
      paramTypeIncompatible: result === ExpectEqualResult.NotEqual,
    }
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

  * innerTypes () {
    yield this
    for (const generic of this.generics) {
      yield * generic.innerTypes()
    }
    yield * this.takes.innerTypes()
    yield * this.returns.innerTypes()
  }

  display (options: DisplayOptions): string {
    for (const generic of this.generics) {
      options.replacements.set(generic, options.tempNames.next().value)
    }
    return `${
      this.generics.length > 0
        ? `[${this.generics
            .map(generic => generic.display(options))
            .join(', ')}] `
        : ''
    }${
      this.takes instanceof Function || this.takes instanceof Tuple
        ? `(${this.takes.display(options)})`
        : this.takes.display(options)
    } -> ${
      this.takes instanceof Tuple
        ? `(${this.takes.display(options)})`
        : this.takes.display(options)
    }`
  }

  static make (
    maker: (...typeVars: FuncTypeVar[]) => [NType, NType],
    ...typeVarNames: string[]
  ): Function {
    const generics = typeVarNames.map(name => new FuncTypeVar(name))
    const [takes, returns] = maker(...generics)
    return new Function(takes, returns, generics)
  }

  static fromTypes (
    [type, type2, ...types]: NType[],
    generics: FuncTypeVar[] = [],
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

  * innerTypes () {
    yield this
  }

  display (_options: DisplayOptions): string {
    return '()'
  }
}

function * generateNames (): Generator<string, never> {
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    yield letter
  }
  for (const base of generateNames()) {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      yield base + letter
    }
  }
  // This should never be reached (TypeScript is a bit dumb)
  throw new Error('names() ended!')
}
function * availableNames (takenNames: Set<string>): Generator<string, never> {
  for (const name of generateNames()) {
    if (!takenNames.has(name)) {
      yield name
    }
  }
  // This should never be reached (TypeScript is a bit dumb)
  throw new Error('availableNames() ended!')
}

export function displayType (type: NType) {
  const names: Set<string> = new Set()
  for (const innerType of type.innerTypes()) {
    if (innerType instanceof Type) {
      names.add(innerType.spec.name)
    }
  }
  return type.display({
    replacements: new Map(),
    tempNames: availableNames(names),
  })
}
