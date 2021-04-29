import { AliasSpec, TypeSpec } from './type-specs'

export type ExpectEqualError =
  | {
      errorType: 'should-be'
      type: TypeSpec | FuncTypeVar | 'tuple' | 'record' | 'function' | 'unit'
    }
  | {
      errorType: 'typevar' | 'tuple'
      index: number
      errors: ExpectEqualError[]
    }
  | {
      errorType: 'record'
      key: string
      errors: ExpectEqualError[]
    }
  | {
      errorType: 'function-argument' | 'function-return' | 'alias'
      errors: ExpectEqualError[]
    }
  | {
      errorType: 'tuple-missing' | 'tuple-extra'
      fields: number
    }
  | {
      errorType: 'record-missing' | 'record-extra'
      key: string
    }
  | {
      errorType: 'diff-typevar'
    }

interface InnerTypesOptions {
  excludeFunctions?: boolean
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
   * IMPURE! This is called when two types are EXPECTED to be equal, so Unknown
   * types will be resolved (mutated).
   *
   * This operation isn't symmetrical! `this` is the type annotation of the
   * function or `let`, and `other` is the type of the value being passed in.
   */
  expectEqual(other: NType): ExpectEqualError[]

  /**
   * Substitute a TypeVar (matching by pointer in memory) with an NType.
   */
  substitute(substitutions: Map<TypeVar, NType | null>): NType | null

  /**
   * Yields all contained types. Will not yield null, Unknown, or Module.
   */
  innerTypes(options?: InnerTypesOptions): Generator<NType, void>

  display(options: DisplayOptions): string
}

/**
 * The first argument should be the target type, such as from a type annotation
 * or function argument type, while the second argument is the type of the value
 * being passed in.
 *
 * To figure out which should be the annotaton or value type, think about
 * when it would NOT make sense to allow str -> str where [a] a -> a is
 * expected.
 *
 * Also, in error messages, it'll say [value type] should be [annotation type],
 * so, for example, if you expect an expression to be a bool, the bool should be
 * the annotaton.
 */
export function expectEqual (
  annotation: NType | null,
  other: NType | null,
): ExpectEqualError[] {
  // Don't resolve(other) because aliases are needed for less messy errors
  if (other instanceof Unknown) {
    if (other.resolved !== undefined) {
      return expectEqual(annotation, other.resolved)
    } else {
      if (annotation instanceof FuncTypeVar) {
        return annotation.expectEqual(other)
      } else {
        other.resolved = annotation
        return []
      }
    }
  } else if (other instanceof AliasType) {
    const errors = expectEqual(annotation, other.type)
    return errors.length > 0
      ? [
          {
            errorType: 'alias',
            errors: errors,
          },
        ]
      : []
  } else if (other instanceof FuncTypeVar) {
    if (!other.func.substitutions) {
      throw new Error('For some reason other.func.substitutions is undefined')
    }
    // Note: substitution may contain a FuncTypeVar from the annotation side
    const substitution = other.func.substitutions.get(other)
    if (substitution === undefined) {
      other.func.substitutions.set(other, annotation)
      return []
    } else if (substitution instanceof FuncTypeVar) {
      if (annotation instanceof FuncTypeVar) {
        if (annotation === substitution) {
          return []
        } else {
          for (const [typeVar, typeVarSubstitution] of other.func
            .substitutions) {
            if (annotation === typeVarSubstitution) {
              return [
                {
                  errorType: 'should-be',
                  // Note: This FuncTypeVar is from the value side
                  type: typeVar,
                },
              ]
            }
          }
          return [
            {
              errorType: 'diff-typevar',
            },
          ]
        }
      } else if (annotation) {
        return annotation.expectEqual(substitution)
      } else {
        return []
      }
    } else {
      return expectEqual(annotation, substitution)
    }
  } else if (annotation === null || other === null) {
    return []
  } else {
    return annotation.expectEqual(other)
  }
}

export class Type implements NType {
  spec: TypeSpec | null
  typeVars: (NType | null)[]

  constructor (spec: TypeSpec | null, typeVars: (NType | null)[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  expectEqual (other: NType): ExpectEqualError[] {
    if (
      other instanceof Type &&
      this.spec === other.spec &&
      this.spec !== null
    ) {
      const errors: ExpectEqualError[] = []
      this.typeVars.forEach((thisTypeVar, i) => {
        const typeVarErrors = expectEqual(thisTypeVar, other.typeVars[i])
        if (typeVarErrors.length > 0) {
          errors.push({
            errorType: 'typevar',
            index: i,
            errors: typeVarErrors,
          })
        }
      })
      return errors
    } else {
      return this.spec
        ? [
            {
              errorType: 'should-be',
              type: this.spec,
            },
          ]
        : []
    }
  }

  substitute (substitutions: Map<TypeVar, NType | null>): Type {
    const typeVars = this.typeVars.map(
      typeVar => typeVar && typeVar.substitute(substitutions),
    )
    return this.spec ? this.spec.instance(typeVars) : new Type(null, typeVars)
  }

  * innerTypes (options?: InnerTypesOptions) {
    yield this
    for (const typeVar of this.typeVars) {
      if (typeVar) {
        yield * typeVar.innerTypes(options)
      }
    }
  }

  display (options: DisplayOptions): string {
    return this.typeVars.length > 0
      ? `${this.spec?.name || '...'}[${this.typeVars
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

  expectEqual (_other: NType): ExpectEqualError[] {
    throw new Error('Type vars should never be compared in nature')
  }

  substitute (substitutions: Map<TypeVar, NType | null>): NType | null {
    const substitution = substitutions.get(this)
    return substitution === undefined ? this : substitution
  }

  * innerTypes (_options?: InnerTypesOptions) {
    yield this
  }

  display (_options: DisplayOptions): string {
    throw new Error('Type vars cannot be displayed')
  }
}

export class FuncTypeVar extends TypeVar {
  func!: Function

  constructor (name: string) {
    super(name)
  }

  expectEqual (other: NType): ExpectEqualError[] {
    if (other instanceof FuncTypeVar) {
      throw new Error(
        'FuncTypeVar.expectEqual should never encounter another FuncTypeVar because expectEqual handles it.',
      )
    } else {
      if (!this.func.substitutions) {
        // Function type variables shouldn't be resolved if they're not part of
        // a main function.
        // Give an error about how the other type should be less specific
        // (should be a type variable)
        return [
          {
            errorType: 'should-be',
            // Note: This FuncTypeVar is from the annotation side
            type: this,
          },
        ]
      }
      const mySubstitution = this.func.substitutions.get(this)
      if (mySubstitution === undefined) {
        this.func.substitutions.set(this, other)
        return []
      } else {
        return expectEqual(mySubstitution, other)
      }
    }
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

  expectEqual (other: NType): ExpectEqualError[] {
    const thisType = resolve(this)
    if (thisType instanceof Unknown) {
      // Does not matter whether `otherType` is also an Unknown since they
      // can be chained.
      this.resolved = other
      return []
    } else {
      return expectEqual(thisType, other)
    }
  }

  substitute (substitutions: Map<TypeVar, NType | null>): NType | null {
    const resolvedType = this.resolvedType()
    if (resolvedType instanceof Unknown) {
      return this
    } else {
      return resolvedType && resolvedType.substitute(substitutions)
    }
  }

  * innerTypes (options?: InnerTypesOptions) {
    if (this.resolved) {
      yield * this.resolved.innerTypes(options)
    }
  }

  display (options: DisplayOptions): string {
    return this.resolved ? this.resolved.display(options) : '...'
  }
}

export class AliasType implements NType {
  spec: AliasSpec | null
  typeVars: (NType | null)[]

  constructor (spec: AliasSpec | null, typeVars: (NType | null)[]) {
    this.spec = spec
    this.typeVars = typeVars
  }

  get type (): NType | null {
    if (!this.spec) return null
    const spec = this.spec
    const substitutions = new Map()
    this.typeVars.forEach((typeVar, i) => {
      substitutions.set(spec.typeVars[i], typeVar)
    })
    return spec.type.substitute(substitutions)
  }

  expectEqual (other: NType): ExpectEqualError[] {
    return expectEqual(resolve(this), other)
  }

  substitute (substitutions: Map<TypeVar, NType | null>): AliasType {
    const typeVars = this.typeVars.map(
      typeVar => typeVar && typeVar.substitute(substitutions),
    )
    return this.spec
      ? this.spec.instance(typeVars)
      : new AliasType(null, typeVars)
  }

  * innerTypes (options?: InnerTypesOptions) {
    yield this
    const type = this.type
    if (type) {
      yield * type.innerTypes(options)
    }
  }

  display (options: DisplayOptions): string {
    return this.typeVars.length > 0
      ? `${this.spec?.name || '...'}[${this.typeVars
          .map(typeVar => (typeVar ? typeVar.display(options) : '...'))
          .join(', ')}]`
      : this.spec?.name || ''
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

  expectEqual (other: NType): ExpectEqualError[] {
    if (other instanceof Tuple) {
      const errors: ExpectEqualError[] = []
      if (this.types.length < other.types.length) {
        errors.push({
          errorType: 'tuple-extra',
          fields: this.types.length,
        })
      } else if (this.types.length > other.types.length) {
        errors.push({
          errorType: 'tuple-missing',
          fields: this.types.length,
        })
      }
      this.types.forEach((thisType, i) => {
        const otherType = other.types[i]
        if (otherType === undefined) {
          return
        }
        const typeErrors = expectEqual(thisType, otherType)
        if (typeErrors.length > 0) {
          errors.push({
            errorType: 'tuple',
            index: i,
            errors: typeErrors,
          })
        }
      })
      return errors
    } else {
      return [
        {
          errorType: 'should-be',
          type: 'tuple',
        },
      ]
    }
  }

  substitute (substitutions: Map<TypeVar, NType | null>): Tuple {
    return new Tuple(
      this.types.map(type => type && type.substitute(substitutions)),
    )
  }

  * innerTypes (options?: InnerTypesOptions) {
    yield this
    for (const type of this.types) {
      if (type) {
        yield * type.innerTypes(options)
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

  expectEqual (other: NType): ExpectEqualError[] {
    if (other instanceof Record) {
      const errors: ExpectEqualError[] = []
      for (const [key, type] of this.types) {
        const otherType = other.types.get(key)
        if (otherType === undefined) {
          errors.push({
            errorType: 'record-missing',
            key,
          })
          continue
        }
        const fieldErrors = expectEqual(type, otherType)
        if (fieldErrors.length > 0) {
          errors.push({
            errorType: 'record',
            key,
            errors: fieldErrors,
          })
        }
      }
      for (const key of other.types.keys()) {
        if (!this.types.has(key)) {
          errors.push({
            errorType: 'record-extra',
            key,
          })
        }
      }
      return errors
    } else {
      return [
        {
          errorType: 'should-be',
          type: 'record',
        },
      ]
    }
  }

  substitute (substitutions: Map<TypeVar, NType | null>): Record {
    return new Record(
      new Map(
        Array.from(this.types.entries(), ([key, type]) => [
          key,
          type && type.substitute(substitutions),
        ]),
      ),
    )
  }

  * innerTypes (options?: InnerTypesOptions) {
    yield this
    for (const [, type] of this.types) {
      if (type) {
        yield * type.innerTypes(options)
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

  expectEqual (_other: NType): ExpectEqualError[] {
    throw new Error("Modules shouldn't be expected equal I think")
  }

  * innerTypes (_options?: InnerTypesOptions) {
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
  substitutions?: Map<FuncTypeVar, NType | null>

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

  private _takesUsesTypeVar (typeVar: FuncTypeVar): boolean {
    if (this.takes === null) {
      // QUESTION: Is it possible for ([a] null -> ...) to occur where `null` in
      // reality does use `a`?
      return false
    }
    for (const type of this.takes.innerTypes({ excludeFunctions: true })) {
      if (type === typeVar) {
        return true
      }
    }
    return false
  }

  given (paramType: NType | null): [ExpectEqualError[], NType | null] {
    // Keep track of resolved generics
    this.substitutions = new Map()
    const errors = expectEqual(this.takes, paramType)
    const returnType = this.returns && resolve(this.returns)
    if (returnType instanceof Function) {
      // Unresolved generics should either be
      // - null if `this.takes` uses it
      // - passed down to the Function otherwise
      const newGenerics = []
      for (const generic of this.generics) {
        const resolvedType = this.substitutions.get(generic)
        if (resolvedType === undefined) {
          if (this._takesUsesTypeVar(generic)) {
            this.substitutions.set(generic, null)
          } else {
            const newTypeVar = new FuncTypeVar(generic.name)
            this.substitutions.set(generic, newTypeVar)
            newGenerics.push(newTypeVar)
          }
        }
      }
      for (const generic of returnType.generics) {
        // Make a clone of the function type vars so that the same FuncTypeVar
        // doesn't get assigned to multiple functions
        const newGeneric = new FuncTypeVar(generic.name)
        newGenerics.push(newGeneric)
        this.substitutions.set(generic, newGeneric)
      }
      return [
        errors,
        new Function(
          returnType.takes && returnType.takes.substitute(this.substitutions),
          returnType.returns &&
            returnType.returns.substitute(this.substitutions),
          newGenerics,
        ),
      ]
    } else {
      // Any unresolved generics at this point should become Unknown
      // Unless they were used in `this.takes` but weren't resolved because of a
      // null error type
      for (const generic of this.generics) {
        const resolvedType = this.substitutions.get(generic)
        if (resolvedType === undefined) {
          if (this._takesUsesTypeVar(generic)) {
            this.substitutions.set(generic, null)
          } else {
            this.substitutions.set(generic, new Unknown())
          }
        }
      }
      return [errors, returnType && returnType.substitute(this.substitutions)]
    }
  }

  expectEqual (other: NType): ExpectEqualError[] {
    if (other instanceof Function) {
      other.substitutions = new Map()
      const errors: ExpectEqualError[] = []
      const argErrors = expectEqual(this.takes, other.takes)
      if (argErrors.length > 0) {
        errors.push({
          errorType: 'function-argument',
          errors: argErrors,
        })
      }
      const returnErrors = expectEqual(this.returns, other.returns)
      if (returnErrors.length > 0) {
        errors.push({
          errorType: 'function-return',
          errors: returnErrors,
        })
      }
      return errors
    } else {
      return [
        {
          errorType: 'should-be',
          type: 'function',
        },
      ]
    }
  }

  substitute (substitutions: Map<TypeVar, NType | null>): Function {
    const newSubstitutions = new Map(substitutions)
    const newGenerics = []
    for (const generic of this.generics) {
      if (!substitutions.has(generic)) {
        // Make a clone of the function type vars so that the same FuncTypeVar
        // doesn't get assigned to multiple functions
        const newGeneric = new FuncTypeVar(generic.name)
        newGenerics.push(newGeneric)
        newSubstitutions.set(generic, newGeneric)
      }
    }
    return new Function(
      this.takes && this.takes.substitute(newSubstitutions),
      this.returns && this.returns.substitute(newSubstitutions),
      newGenerics,
    )
  }

  * innerTypes (options?: InnerTypesOptions) {
    if (options?.excludeFunctions) return
    yield this
    for (const generic of this.generics) {
      yield * generic.innerTypes(options)
    }
    if (this.takes) yield * this.takes.innerTypes(options)
    if (this.returns) yield * this.returns.innerTypes(options)
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
        : this.takes
        ? this.takes.display(options)
        : '...'
    } -> ${
      this.returns instanceof Tuple
        ? `(${this.returns.display(options)})`
        : this.returns
        ? this.returns.display(options)
        : '...'
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

  /**
   * Even shorter hand for `FuncType.make` for functions with two arguments like
   * operations.
   */
  static make2 (
    maker: (...typeVars: FuncTypeVar[]) => [NType, NType, NType],
    ...typeVarNames: string[]
  ): Function {
    const generics = typeVarNames.map(name => new FuncTypeVar(name))
    const [arg1, arg2, returns] = maker(...generics)
    return new Function(arg1, new Function(arg2, returns), generics)
  }

  static fromTypes (
    [type, type2, ...types]: (NType | null)[],
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
  expectEqual (other: NType): ExpectEqualError[] {
    return other instanceof Unit
      ? []
      : [
          {
            errorType: 'should-be',
            type: 'unit',
          },
        ]
  }

  substitute (_substitutions: Map<TypeVar, NType | null>): NType {
    return this
  }

  * innerTypes (_options?: InnerTypesOptions) {
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