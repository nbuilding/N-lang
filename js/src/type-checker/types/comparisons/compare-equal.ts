import {
  ComparisonIssue,
  ComparisonResult,
  typeToResultType,
} from '../comparisons'
import { AliasSpec, FuncTypeVarSpec, NType, NTypeKnown } from '../types'

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
        ? { type: 'unknown' }
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
      const newTypeVar = new FuncTypeVarSpec(typeA.typeSpec.name).instance([])
      context.substitutions.set(typeA.typeSpec, newTypeVar)
      context.substitutions.set(typeB.typeSpec, newTypeVar)
    } else if (FuncTypeVarSpec.isTypeVar(typeA)) {
      context.substitutions.set(typeA.typeSpec, typeB)
    } else if (FuncTypeVarSpec.isTypeVar(typeB)) {
      context.substitutions.set(typeB.typeSpec, typeA)
    } else {
      throw new Error(
        "This should never happen, but TypeScript doesn't see it that way.",
      )
    }
  } else if (typeA.type === 'tuple') {
    if (typeB.type !== 'tuple') {
      return {
        type: { type: 'unknown' },
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
          type: { type: 'unknown' },
          result: typeToResultType(type),
        })
      }
    })
    return {
      type: issue
        ? { type: 'unknown' }
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
  }
  throw new Error('todo')
}
