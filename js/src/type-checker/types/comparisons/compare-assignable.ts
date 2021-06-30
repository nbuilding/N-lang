import { difference, isSubset } from '../../../utils/set-operations'
import {
  ComparisonIssue,
  ComparisonResult,
  CONTAINED,
  typeToResultType,
} from '../comparisons'
import {
  AliasSpec,
  FuncTypeVarSpec,
  NFunction,
  NType,
  NTypeKnown,
  substitute,
  unknown,
} from '../types'

interface CompareAssignableContext {
  function?: NFunction
  substitutions: Map<FuncTypeVarSpec, NTypeKnown>
}

/**
 * The "assigning to variables" comparison is notably asymmetric when comparing
 * functions; a more generic function can be assigned to what should be a more
 * specific function, but not the other way around. This comparison is used in
 * function calls, assigning to variables, and operations.
 */
export function compareAssignable (
  context: CompareAssignableContext,
  annotation: NType,
  value: NType,
): ComparisonResult {
  // `return typeToResultType(value)` means that the types are assignable
  if (annotation.type === 'unknown') {
    return typeToResultType(value)
  } else if (value.type === 'unknown') {
    return typeToResultType(value)
  } else if (AliasSpec.isAlias(value)) {
    if (annotation.type === 'named' && annotation.typeSpec === value.typeSpec) {
      const vars: ComparisonResult[] = []
      let issue: ComparisonIssue | undefined
      value.typeVars.forEach((variable, i) => {
        const result = compareAssignable(
          context,
          annotation.typeVars[i],
          variable,
        )
        vars.push(result)
        if (result.issue && !issue) {
          issue = CONTAINED
        }
      })
      return {
        type: 'named',
        name: value.typeSpec.name,
        vars,
        issue,
      }
    } else {
      // Note: Type errors will implicitly unpack aliases
      return compareAssignable(
        context,
        annotation,
        value.typeSpec.substitute(value.typeVars || []),
      )
    }
  } else if (
    FuncTypeVarSpec.isTypeVar(value) &&
    !(context.function && context.function.typeVars.includes(value.typeSpec))
  ) {
    const substitution = context.substitutions.get(value.typeSpec)
    if (substitution) {
      throw new Error('TODO: comparing annotation type variables')
    } else {
      context.substitutions.set(value.typeSpec, annotation)
      return typeToResultType(value)
    }
  } else if (FuncTypeVarSpec.isTypeVar(annotation)) {
    if (
      context.function &&
      context.function.typeVars.includes(annotation.typeSpec)
    ) {
      const substitution = context.substitutions.get(annotation.typeSpec)
      if (substitution) {
        throw new Error('TODO: comparing value type variables')
      } else {
        context.substitutions.set(annotation.typeSpec, value)
        return typeToResultType(value)
      }
    } else {
      return typeToResultType(value)
    }
  } else if (annotation.type === 'union') {
    // This can only happen when doing
    // let wow = 3
    // var wow = 4.4
    // Ideally we'd change the type of `wow` to be float rather than number, but
    // `var` is currently undefined behaviour so it's not a big deal
    if (value.type === 'union') {
      // Maybe we should take the intersection of the union?
      if (isSubset(value.types, annotation.types)) {
        return typeToResultType(value)
      } else {
        return {
          ...typeToResultType(value),
          issue: {
            issue: 'too-general',
            canOnlyHandle: typeToResultType(annotation),
          },
        }
      }
    } else if (
      value.type === 'named' &&
      annotation.types.includes(value.typeSpec)
    ) {
      return typeToResultType(value)
    } else {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
  } else if (annotation.type === 'tuple') {
    if (value.type !== 'tuple') {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
    const results: ComparisonResult[] = []
    let issue: ComparisonIssue | undefined =
      value.types.length < annotation.types.length
        ? {
            issue: 'need-extra-items',
            types: annotation.types
              .slice(value.types.length)
              .map(typeToResultType),
          }
        : value.types.length > annotation.types.length
        ? {
            issue: 'too-many-items',
            extra: value.types.length - annotation.types.length,
          }
        : undefined
    value.types.forEach((type, i) => {
      if (i < annotation.types.length) {
        const result = compareAssignable(context, annotation.types[i], type)
        results.push(result)
        if (result.issue && !issue) {
          issue = CONTAINED
        }
      } else {
        results.push(typeToResultType(type))
      }
    })
    return {
      type: 'tuple',
      types: results,
      issue,
    }
  } else if (annotation.type === 'record') {
    if (value.type !== 'record') {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
    const [missing, extra] = difference(
      annotation.types.keys(),
      value.types.keys(),
    )
    const results: Record<string, ComparisonResult> = {}
    let issue: ComparisonIssue | undefined =
      missing.size > 0 || extra.size > 0
        ? {
            issue: 'record-key-mismatch',
            missing: [...missing],
            extra: [...extra],
          }
        : undefined
    for (const [key, type] of value.types) {
      const annotationType = annotation.types.get(key)
      if (annotationType) {
        const result = compareAssignable(context, annotationType, type)
        results[key] = result
        if (result.issue && !issue) {
          issue = CONTAINED
        }
      } else {
        results[key] = typeToResultType(type)
      }
    }
    return {
      type: 'record',
      types: results,
      issue,
    }
  } else if (annotation.type === 'module') {
    if (value.type === 'module' && value.path === annotation.path) {
      return typeToResultType(value)
    } else {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
  } else if (annotation.type === 'function') {
    if (value.type !== 'function') {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
    const argumentResult = compareAssignable(
      context,
      annotation.argument,
      value.argument,
    )
    const returnResult = compareAssignable(
      context,
      annotation.return,
      value.return,
    )
    return {
      type: 'function',
      argument: argumentResult,
      return: returnResult,
      typeVarIds: value.typeVars.map(typeVar => typeVar.id),
      issue: argumentResult.issue || returnResult.issue ? CONTAINED : undefined,
    }
  } else {
    if (annotation.typeSpec instanceof AliasSpec) {
      return compareAssignable(
        context,
        annotation.typeSpec.substitute(annotation.typeVars),
        value,
      )
    }
    if (value.type === 'union') {
      // Ignores type variables
      if (value.types.includes(annotation.typeSpec)) {
        return typeToResultType(value)
      }
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'too-general',
          canOnlyHandle: typeToResultType(annotation),
        },
      }
    } else if (
      value.type !== 'named' ||
      value.typeSpec !== annotation.typeSpec
    ) {
      return {
        ...typeToResultType(value),
        issue: {
          issue: 'should-be',
          type: typeToResultType(annotation),
        },
      }
    }
    const vars: ComparisonResult[] = []
    let issue: ComparisonIssue | undefined
    value.typeVars.forEach((variable, i) => {
      const result = compareAssignable(
        context,
        annotation.typeVars[i],
        variable,
      )
      vars.push(result)
      if (result.issue && !issue) {
        issue = CONTAINED
      }
    })
    return {
      type: 'named',
      name: value.typeSpec.name,
      vars,
      issue,
    }
  }
}

export function attemptAssign (
  annotation: NType,
  value: NType,
): ComparisonResult | null {
  const result = compareAssignable(
    { substitutions: new Map() },
    annotation,
    value,
  )
  return result.issue ? result : null
}

export function callFunction (
  func: NFunction,
  value: NType,
): { error: ComparisonResult | null; return: NType } {
  const context: CompareAssignableContext = {
    function: func,
    substitutions: new Map(),
  }
  const result = compareAssignable(context, func.argument, value)
  const substitutions: Map<FuncTypeVarSpec, NType> = new Map()
  const inheritedTypeVars = []
  for (const typeVar of func.typeVars) {
    const substitution = context.substitutions.get(typeVar)
    if (substitution) {
      substitutions.set(typeVar, substitution)
    } else {
      if (func.return.type === 'function') {
        inheritedTypeVars.push(typeVar)
      } else {
        substitutions.set(typeVar, unknown)
      }
    }
  }
  const substituted = substitute(func.return, substitutions)
  if (substituted.type === 'function') {
    substituted.typeVars.push(...inheritedTypeVars)
  }
  return {
    error: result.issue ? result : null,
    return: substituted,
  }
}

/**
 * Used for binary and unary operations. Given the possible operation types and
 * operand types, this returns the return value of the operation. `null` is
 * returned if none of the operations match; this should be converted into an
 * unknown type.
 */
export function tryFunctions (
  functions: NFunction[],
  operands: NType[],
): NType | null {
  if (operands.some(type => type.type === 'unknown')) {
    return unknown
  }
  const lastOperand = operands[operands.length - 1]
  functions: for (let func of functions) {
    for (const operand of operands.slice(0, -1)) {
      const result = callFunction(func, operand)
      if (result.error) {
        continue functions
      } else if (result.return.type === 'function') {
        func = result.return
      } else {
        throw new Error('Not enough arguments for operation function')
      }
    }
    const result = callFunction(func, lastOperand)
    if (result.error) {
      continue
    } else {
      return result.return
    }
  }
  return null
}
