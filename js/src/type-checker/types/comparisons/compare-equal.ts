import {
  difference,
  intersection,
} from '../../../../test/unit/utils/set-operations'
import {
  ComparisonIssue,
  ComparisonResult,
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

interface CompareEqualContext {
  substitutions: Map<FuncTypeVarSpec, NTypeKnown>
}

type CompareEqualResult = {
  type: NType
  result: ComparisonResult
}

/**
 * Symmetrically compare two types. The comparison result will be in terms of
 * the second type.
 */
export function compareEqual (
  context: CompareEqualContext,
  typeA: NType,
  typeB: NType,
): CompareEqualResult {
  if (typeA.type === 'unknown') {
    return { type: typeB, result: typeToResultType(typeB) }
  } else if (typeB.type === 'unknown') {
    return { type: typeA, result: typeToResultType(typeB) }
  } else if (
    AliasSpec.isAlias(typeA) &&
    AliasSpec.isAlias(typeB) &&
    typeA.typeSpec === typeB.typeSpec
  ) {
    const vars: CompareEqualResult[] = []
    let issue: ComparisonIssue | null = null
    typeA.typeVars.forEach((variable, i) => {
      const result = compareEqual(context, variable, typeB.typeVars[i])
      vars.push(result)
      if (result.result.issue && !issue) {
        issue = 'contained'
      }
    })
    return {
      type: issue
        ? unknown
        : {
            type: 'named',
            typeSpec: typeA.typeSpec,
            typeVars: vars.map(result => result.type),
          },
      result: {
        type: 'named',
        name: typeA.typeSpec.name,
        vars: vars.map(result => result.result),
        issue,
      },
    }
  } else if (AliasSpec.isAlias(typeB)) {
    return compareEqual(
      context,
      typeA,
      typeB.typeSpec.substitute(typeB.typeVars),
    )
  } else if (AliasSpec.isAlias(typeA)) {
    return compareEqual(
      context,
      typeA.typeSpec.substitute(typeA.typeVars),
      typeB,
    )
  } else if (
    FuncTypeVarSpec.isTypeVar(typeA) ||
    FuncTypeVarSpec.isTypeVar(typeB)
  ) {
    const substitutionTypeVarA = FuncTypeVarSpec.isTypeVar(typeA)
      ? context.substitutions.get(typeA.typeSpec)
      : undefined
    const substitutionTypeVarB = FuncTypeVarSpec.isTypeVar(typeB)
      ? context.substitutions.get(typeB.typeSpec)
      : undefined
    if (substitutionTypeVarA || substitutionTypeVarB) {
      return compareEqual(
        context,
        substitutionTypeVarA || typeA,
        substitutionTypeVarB || typeB,
      )
    }
    if (FuncTypeVarSpec.isTypeVar(typeA) && FuncTypeVarSpec.isTypeVar(typeB)) {
      const newTypeVar = new FuncTypeVarSpec(typeA.typeSpec.name).instance()
      context.substitutions.set(typeA.typeSpec, newTypeVar)
      context.substitutions.set(typeB.typeSpec, newTypeVar)
      return {
        type: newTypeVar,
        result: typeToResultType(typeB),
      }
    } else if (FuncTypeVarSpec.isTypeVar(typeA)) {
      context.substitutions.set(typeA.typeSpec, typeB)
      return {
        type: typeB,
        result: typeToResultType(typeB),
      }
    } else if (FuncTypeVarSpec.isTypeVar(typeB)) {
      context.substitutions.set(typeB.typeSpec, typeA)
      return {
        type: typeA,
        result: typeToResultType(typeB),
      }
    } else {
      throw new Error(
        "This should never happen, but TypeScript doesn't see it that way.",
      )
    }
  } else if (typeA.type === 'union') {
    if (typeB.type === 'union') {
      const types = [...intersection(typeA.types, typeB.types)]
      if (types.length === 0) {
        return {
          type: unknown,
          result: {
            ...typeToResultType(typeB),
            issue: {
              issue: 'no-overlap',
              with: typeToResultType(typeA),
            },
          },
        }
      } else if (types.length === 1) {
        return {
          type: types[0].instance(),
          result: typeToResultType(typeB),
        }
      } else {
        return {
          type: { type: 'union', types },
          result: typeToResultType(typeB),
        }
      }
    } else if (typeB.type === 'named' && typeA.types.includes(typeB.typeSpec)) {
      return {
        type: typeB,
        result: typeToResultType(typeB),
      }
    } else {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: typeToResultType(typeA),
          },
        },
      }
    }
  } else if (typeB.type === 'union') {
    if (typeA.type === 'named' && typeB.types.includes(typeA.typeSpec)) {
      return {
        type: typeA,
        result: typeToResultType(typeB),
      }
    } else {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: typeToResultType(typeA),
          },
        },
      }
    }
  } else if (typeA.type === 'tuple') {
    if (typeB.type !== 'tuple') {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: 'tuple',
          },
        },
      }
    }
    const results: CompareEqualResult[] = []
    let issue: ComparisonIssue | null =
      typeB.types.length < typeA.types.length
        ? {
            issue: 'need-extra-items',
            types: typeA.types.slice(typeB.types.length).map(typeToResultType),
          }
        : typeB.types.length > typeA.types.length
        ? {
            issue: 'too-many-items',
            extra: typeB.types.length - typeA.types.length,
          }
        : null
    typeB.types.forEach((type, i) => {
      if (i < typeA.types.length) {
        const result = compareEqual(context, typeA.types[i], type)
        results.push(result)
        if (result.result.issue && !issue) {
          issue = 'contained'
        }
      } else {
        results.push({
          type: unknown,
          result: typeToResultType(type),
        })
      }
    })
    return {
      type: issue
        ? unknown
        : {
            type: 'tuple',
            types: results.map(result => result.type),
          },
      result: {
        type: 'tuple',
        types: results.map(result => result.result),
        issue,
      },
    }
  } else if (typeA.type === 'record') {
    if (typeB.type !== 'record') {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: 'record',
          },
        },
      }
    }
    const [missing, extra] = difference(typeA.types.keys(), typeB.types.keys())
    const results: Record<string, CompareEqualResult> = {}
    let issue: ComparisonIssue | null =
      missing.size > 0 || extra.size > 0
        ? {
            issue: 'record-key-mismatch',
            missing: [...missing],
            extra: [...extra],
          }
        : null
    for (const [key, type] of typeB.types) {
      const annotationType = typeA.types.get(key)
      if (annotationType) {
        const result = compareEqual(context, annotationType, type)
        results[key] = result
        if (result.result.issue && !issue) {
          issue = 'contained'
        }
      } else {
        results[key] = {
          type: unknown,
          result: typeToResultType(type),
        }
      }
    }
    return {
      type: issue
        ? unknown
        : {
            type: 'record',
            types: new Map(
              Object.entries(results).map(([key, result]) => [
                key,
                result.type,
              ]),
            ),
          },
      result: {
        type: 'record',
        types: fromEntries(Object.entries(results), (key, result) => [
          key,
          result.result,
        ]),
        issue,
      },
    }
  } else if (typeA.type === 'function') {
    if (typeB.type !== 'function') {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: 'function',
          },
        },
      }
    }
    const argumentResult = compareEqual(context, typeA.argument, typeB.argument)
    const returnResult = compareEqual(context, typeA.return, typeB.return)
    const hasIssue = argumentResult.result.issue || returnResult.result.issue
    const funcType: NFunction = {
      type: 'function',
      argument: argumentResult.type,
      return: returnResult.type,
      typeVars: [],
    }
    if (!hasIssue) {
      const substitutions: Map<FuncTypeVarSpec, NType> = new Map()
      for (const typeVar of [...typeA.typeVars, ...typeB.typeVars]) {
        // May have to recursively substitute
        const typeVarSubstitutionChain: FuncTypeVarSpec[] = []
        let typeSpec = typeVar
        while (true) {
          const substitution = context.substitutions.get(typeSpec)
          if (substitution) {
            typeVarSubstitutionChain.push(typeSpec)
            if (FuncTypeVarSpec.isTypeVar(substitution)) {
              typeSpec = substitution.typeSpec
            } else {
              // Function type variable maps to a non-function type variable
              for (const typeVar of typeVarSubstitutionChain) {
                substitutions.set(typeVar, substitution)
              }
              break
            }
          } else {
            funcType.typeVars.push(typeSpec)
            // The function type variable doesn't map to anything, so it's the
            // map target
            for (const typeVar of typeVarSubstitutionChain) {
              substitutions.set(typeVar, {
                type: 'named',
                typeSpec,
                typeVars: [],
              })
            }
            break
          }
        }
      }
      funcType.argument = substitute(funcType.argument, substitutions)
      funcType.return = substitute(funcType.return, substitutions)
    }
    return {
      type: hasIssue ? unknown : funcType,
      result: {
        type: 'function',
        argument: argumentResult.result,
        return: returnResult.result,
        typeVarNames: typeB.typeVars.map(typeVar => typeVar.name),
        issue: hasIssue ? 'contained' : null,
      },
    }
  } else {
    if (typeB.type !== 'named') {
      return {
        type: unknown,
        result: {
          ...typeToResultType(typeB),
          issue: {
            issue: 'should-be',
            type: typeToResultType(typeA),
          },
        },
      }
    }
    const vars: CompareEqualResult[] = []
    let issue: ComparisonIssue | null = null
    typeA.typeVars.forEach((variable, i) => {
      const result = compareEqual(context, variable, typeB.typeVars[i])
      vars.push(result)
      if (result.result.issue && !issue) {
        issue = 'contained'
      }
    })
    return {
      type: issue
        ? unknown
        : {
            type: 'named',
            typeSpec: typeA.typeSpec,
            typeVars: vars.map(result => result.type),
          },
      result: {
        type: 'named',
        name: typeA.typeSpec.name,
        vars: vars.map(result => result.result),
        issue,
      },
    }
  }
}

/**
 * Intended for list literals and match expressions. Will return the index (>=
 * 1) of the item that does not match. Accumulates the resolved type to resolve
 * unknowns. The number of types must be nonzero.
 */
export function compareEqualTypes (
  types: NType[],
):
  | { errorIndex: null; result: NType }
  | { errorIndex: number; result: ComparisonResult } {
  if (types.length === 0) {
    throw new RangeError('List of types is empty')
  }
  let accumulated = types[0]
  for (let i = 1; i < types.length; i++) {
    const { type, result } = compareEqual(
      { substitutions: new Map() },
      accumulated,
      types[i],
    )
    if (result.issue) {
      return {
        errorIndex: i,
        result,
      }
    } else {
      accumulated = type
    }
  }
  return {
    errorIndex: null,
    result: accumulated,
  }
}
