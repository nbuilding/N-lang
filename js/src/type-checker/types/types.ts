import { AliasSpec, TypeSpec } from './type-specs'

type ExpectEqualError = {
  errorType: 'should-be'
  type: TypeSpec | 'tuple' | 'record' | 'function'
} | {
  errorType: 'typevar' | 'tuple'
  index: number
  errors: ExpectEqualError[]
} | {
  errorType: 'record'
  key: string
  errors: ExpectEqualError[]
} | {
  errorType: 'function-argument' | 'function-return'
  errors: ExpectEqualError[]
} | {
  errorType: 'tuple-missing' | 'tuple-extra'
  fields: number
} | {
  errorType: 'record-missing' | 'record-extra'
  key: string
}

/** `null` if no issues, or an object with issues */
type ExpectEqualResult = ExpectEqualError[]

interface DisplayOptions {
  tempNames: Generator<string, never>

  replacements: Map<FuncTypeVar, string>
}

/**
 * A type that represents a possible type of a variable.
 */
export interface NType {
  /**
   * IMPURE! This is called when two types are EXPECTED to be equal, so Unknown
   * types will be resolved (mutated).
   *
   * This operation isn't symmetrical! `this` is the type annotation of the
   * function or `let`, and `other` is the type of the value being passed in.
   */
  expectEqual(other: NType | null): ExpectEqualResult

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
  spec: TypeSpec | null
  typeVars: (NType | null)[]

  constructor (spec: TypeSpec | null, typeVars: (NType | null)[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  expectEqual (other: NType | null): ExpectEqualResult {
    if (other instanceof Type && this.spec === other.spec && this.spec !== null) {
      const errors: ExpectEqualResult = []
      this.typeVars.forEach((thisTypeVar, i) => {
        const otherTypeVar = other.typeVars[i]
        if (thisTypeVar === null) {
          return
        }
        const typeVarErrors = thisTypeVar.expectEqual(otherTypeVar)
        if (typeVarErrors.length > 0) {
          errors.push({
            errorType: 'typevar',
            index: i,
            errors: typeVarErrors
          })
        }
      })
      return errors
    } else {
      return other && this.spec ? [
        {
          errorType: 'should-be',
          type: this.spec
        }
      ] : []
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Type {
    const typeVars = this.typeVars.map(typeVar => {
      const substitution =
        typeVar instanceof TypeVar && substitutions.get(typeVar)
      if (substitution) {
        return substitution
      } else {
        return typeVar && typeVar.substitute(substitutions)
      }
    })
    return this.spec ? this.spec.instance(typeVars) : new Type(null, typeVars)
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
      ? `${this.spec?.name || ''}[${this.typeVars
          .map(typeVar => (typeVar ? typeVar.display(options) : '...'))
          .join(', ')}]`
      : this.spec?.name || ''
  }
}

export class TypeVar implements NType {
  name: string

  constructor (name: string) {
    this.name = name
  }

  expectEqual (_other: NType): ExpectEqualResult {
    throw new Error('Type vars should never be compared in nature')
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
    const mySubstitution = this.func.substitutions.get(this)
    if (other instanceof FuncTypeVar) {
      const otherSubstitution = other.func.substitutions.get(other)
      if (otherSubstitution === undefined) {
        other.func.substitutions.set(other, this)
        return []
      } else {
        // TODO: Case where ([a, c] (a -> c) -> a)([b] b -> b)?
      }
    } else {
      if (mySubstitution === undefined) {
        this.func.substitutions.set(this, other)
        return []
      } else {
        return mySubstitution ? mySubstitution.expectEqual(other) : []
      }
    }
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

export function resolve (type: NType | null): NType | null {
  if (type instanceof Unknown) {
    return type.resolvedType()
  } else if (type instanceof AliasType) {
    return resolve(type.type)
  } else {
    return type
  }
}

export class Unknown implements NType {
  resolved?: NType | null

  /**
   * Returns either an NType or an Unknown that has no resolved type. Thus, if
   * this returns an Unknown, you know it does not have a resolved type. If you
   * want to then resolve the Unknown's type, you can set `resolved` for the
   * Unknown returned by this method, and all the other Unknowns chained onto it
   * will also be resolved.
   */
  resolvedType (): NType | null {
    if (this.resolved !== undefined) {
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
      return []
    } else if (otherType instanceof Unknown) {
      otherType.resolved = thisType
      return []
    } else {
      return thisType ? thisType.expectEqual(otherType) : []
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
    const aliasedType = resolve(this)
    return aliasedType ? aliasedType.expectEqual(resolve(other)) : []
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
    if (other instanceof Tuple) {
      const errors: ExpectEqualResult = []
      if (this.types.length < other.types.length) {
        errors.push({
          errorType: 'tuple-extra',
          fields: this.types.length
        })
      } else if (this.types.length > other.types.length) {
        errors.push({
          errorType: 'tuple-missing',
          fields: this.types.length
        })
      }
      this.types.forEach((thisType, i) => {
        const otherType = other.types[i]
        if (thisType === null || i >= other.types.length) {
          return
        }
        const typeErrors = thisType.expectEqual(otherType)
        if (typeErrors.length > 0) {
          errors.push({
            errorType: 'tuple',
            index: i,
            errors: typeErrors
          })
        }
      })
      return errors
    } else {
      return other ? [
        {
          errorType: 'should-be',
          type: 'tuple'
        }
      ] : []
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
      const errors: ExpectEqualResult = []
      for (const [key, type] of this.types) {
        const otherType = other.types.get(key)
        if (type === null) {
          continue
        }
        if (otherType === undefined) {
          errors.push({
            errorType: 'record-missing',
            key
          })
          continue
        }
        const fieldErrors = type.expectEqual(otherType)
        if (fieldErrors.length > 0) {
          errors.push({
            errorType: 'record',
            key,
            errors: fieldErrors
          })
        }
      }
      for (const key of other.types.keys()) {
        if (!this.types.has(key)) {
          errors.push({
            errorType: 'record-extra',
            key
          })
        }
      }
      return errors
    } else {
      return other ? [
        {
          errorType: 'should-be',
          type: 'record'
        }
      ] : []
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

  expectEqual (_other: NType): ExpectEqualResult {
    throw new Error('Modules shouldn\'t be expected equal I think')
  }

  * innerTypes () {
    yield this
  }

  display (_options: DisplayOptions): string {
    return `module ${JSON.stringify(this.path)}`
  }
}

export class Function implements NType {
  generics: FuncTypeVar[]
  takes: NType | null
  returns: NType | null
  substitutions!: Map<FuncTypeVar, NType | null>

  constructor (
    takes: NType | null,
    returns: NType | null,
    generics: FuncTypeVar[] = [],
  ) {
    this.takes = takes
    this.returns = returns
    this.generics = generics
    for (const generic of generics) {
      generic.func = this
    }
  }

  given (paramType: NType | null): [ExpectEqualResult, NType | null] {
    // TODO: If `paramType` is the typeVar it can't substitute itself. Basically
    // this entire expectEqual is scuffed and impure and ugly, please fix.
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
      this.substitutions = new Map()
      const errors: ExpectEqualResult = []
      const argErrors = this.takes ? this.takes.expectEqual(other.takes) : []
      if (argErrors.length > 0) {
        errors.push({
          errorType: 'function-argument',
          errors: argErrors
        })
      }
      const returnErrors = this.returns ? this.returns.expectEqual(other.returns) : []
      if (argErrors.length > 0) {
        errors.push({
          errorType: 'function-return',
          errors: returnErrors
        })
      }
      return errors
    } else {
      return other ? [
        {
          errorType: 'should-be',
          type: 'function'
        }
      ] : []
    }
  }

  substitute (substitutions: Map<TypeVar, NType>): Function {
    const takesSubstitution =
      this.takes instanceof TypeVar && substitutions.get(this.takes)
    const returnsSubstitution =
      this.returns instanceof TypeVar && substitutions.get(this.returns)
    return new Function(
      takesSubstitution || this.takes && this.takes.substitute(substitutions),
      returnsSubstitution || this.returns && this.returns.substitute(substitutions),
      this.generics.filter(typeVar => !substitutions.has(typeVar)),
    )
  }

  * innerTypes () {
    yield this
    for (const generic of this.generics) {
      yield * generic.innerTypes()
    }
    if (this.takes) yield * this.takes.innerTypes()
    if (this.returns) yield * this.returns.innerTypes()
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
        : this.takes ? this.takes.display(options) : '...'
    } -> ${
      this.returns instanceof Tuple
        ? `(${this.returns.display(options)})`
        : this.returns ? this.returns.display(options) : '...'
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
export { Function as FuncType }

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
      if (innerType.spec) {
        names.add(innerType.spec.name)
      }
    }
  }
  return type.display({
    replacements: new Map(),
    tempNames: availableNames(names),
  })
}
