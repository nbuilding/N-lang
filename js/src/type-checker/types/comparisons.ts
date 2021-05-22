import { FuncTypeVarSpec, NFunction, NType, NTypeKnown } from './types'

export type ComparisonResultType =
  | {
      type: 'named'
      name: string
      vars: ComparisonResult[]
    }
  | {
      type: 'unit'
    }
  | {
      type: 'tuple'
      types: ComparisonResult[]
    }
  | {
      type: 'record'
      types: Record<string, ComparisonResult>
    }
  | {
      type: 'function'
      argument: ComparisonResult
      return: ComparisonResult
      typeVarNames: string[]
    }
  | {
      type: 'union'
      typeNames: string[]
    }
  | {
      type: 'omitted'
    }

export function typeToResultType (type: NType): ComparisonResultType {
  switch (type.type) {
    case 'named': {
      return {
        type: 'named',
        name: type.typeSpec.name,
        vars: type.typeVars.map(typeToResultType),
      }
    }
    case 'tuple': {
      return {
        type: 'tuple',
        types: type.types.map(typeToResultType),
      }
    }
    case 'record': {
      return {
        type: 'record',
        types: fromEntries(type.types, (key, type) => [
          key,
          typeToResultType(type),
        ]),
      }
    }
    case 'function': {
      return {
        type: 'function',
        argument: typeToResultType(type.argument),
        return: typeToResultType(type.return),
        typeVarNames: type.typeVars.map(typeVar => typeVar.name),
      }
    }
    case 'union': {
      return {
        type: 'union',
        typeNames: type.types.map(type => type.name),
      }
    }
    case 'unknown': {
      return {
        type: 'omitted',
      }
    }
  }
}

export type ComparisonIssue =
  | 'contained'
  | {
      issue: 'should-be'
      type: ComparisonResultType | 'tuple' | 'record' | 'function'
    }
  | {
      issue: 'too-specific'
    }
  | {
      issue: 'need-extra-items'
      types: ComparisonResultType[]
    }
  | {
      issue: 'too-many-items'
      extra: number
    }

export type ComparisonResult = ComparisonResultType & {
  issue?: ComparisonIssue | null
}

export interface CompareAssignableContext {
  function?: NFunction
  substitutions: Map<FuncTypeVarSpec, NTypeKnown>
}
