import { areArraysEqual } from '../../utils/arrays-equal'

class TypeSpec {
  name: string
  typeVarCount: number

  constructor (name: string, typeVarCount: number) {
    this.name = name
    this.typeVarCount = typeVarCount
  }

  instance (typeVars: NType[]): NamedType {
    return {
      type: 'named',
      typeSpec: this,
      typeVars
    }
  }
}

class AliasSpec extends TypeSpec {
  type: NType

  constructor (name: string, typeVarCount: number, type: NType) {
    super(name, typeVarCount)

    this.type = type
  }

  /** Expands the alias and returns the type the alias is an alias for. */
  substitute (typeVars: NType[]): NType {
    throw new Error('todo')
  }
}

class FuncTypeVarSpec extends TypeSpec {
  function!: NFunction

  constructor (name: string, typeVarCount: number) {
    super(name, typeVarCount)
  }
}

interface NamedType {
  type: 'named'
  typeSpec: TypeSpec | 'unit'
  typeVars: NType[]
}

interface NTuple {
  type: 'tuple'
  types: NType[]
}

interface NRecord {
  type: 'record'
  types: Map<string, NType>
}

interface NFunction {
  type: 'function'
  argument: NType
  return: NType
  typeVars: FuncTypeVarSpec[]
}

interface NUnion {
  type: 'union'
  types: TypeSpec[]
}

interface Unknown {
  type: 'unknown'
}

type NTypeKnown = NamedType | NTuple | NRecord | NFunction | NUnion
type NType = NTypeKnown | Unknown

type ComparisonResultType = {
  type: 'type'
  name: string
  vars: ComparisonResultType[]
}

interface CompareAssignableContext {
  function?: NFunction
  substitutions: Map<FuncTypeVarSpec, NTypeKnown>
}

type CompareAssignableResult = {
  hasIssue: boolean
}

/**
 * The "assigning to variables" comparison is notably assymmetric when comparing
 * functions; a more generic function can be assigned to what should be a more
 * specific function, but not the other way around. This comparison is used in
 * function calls, assigning to variables, and operations.
 */
function compareAssignable (context: CompareAssignableContext, annotation: NType, value: NType): void {
  if (annotation.type === 'unknown') {
    if (context.function && value.type !== 'unknown') {
      // TODO: map func type vars to unknown
    }
    return // assignable
  } else if (value.type === 'unknown') {
    return // assignable
  } else if (value.type === 'named' && value.typeSpec instanceof AliasSpec) {
    if (annotation.type === 'named' && annotation.typeSpec === value.typeSpec) {
      return // TODO: compare corresponding type variables
    } else {
      return compareAssignable(context, annotation, value.typeSpec.substitute(value.typeVars))
    }
  } else if (value.type === 'named' && value.typeSpec instanceof FuncTypeVarSpec && !(context.function && context.function.typeVars.includes(value.typeSpec))) {
    const substitution = context.substitutions.get(value.typeSpec)
    if (substitution) {
      throw new Error('TODO: comparing annotation type variables')
    } else {
      context.substitutions.set(value.typeSpec, annotation)
      return // assignable
    }
  } else if (annotation.type === 'named' && annotation.typeSpec instanceof FuncTypeVarSpec) {
    if (context.function && context.function.typeVars.includes(annotation.typeSpec)) {
      const substitution = context.substitutions.get(annotation.typeSpec)
      if (substitution) {
        throw new Error('TODO: comparing value type variables')
      } else {
        context.substitutions.set(annotation.typeSpec, value)
      }
    } else {
      return // NOT assignable
    }
  } else if (annotation.type === 'union') {
    if (value.type === 'union') {
      // I'm not sure what error we should return here if false
      const result = areArraysEqual(annotation.types, value.types)
      return // result
    } else if (value.type === 'named' && value.typeSpec !== 'unit') {
      const result = annotation.types.includes(value.typeSpec)
      return // result
    } else {
      return // NOT assignable
    }
  } else if (annotation.type === 'tuple') {
    // TODO
  }
}
