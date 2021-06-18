import { fromEntries } from '../../utils/from-entries'
import { FuncTypeVarSpec, NType } from './types'

export type ComparisonResultType =
  | {
      type: 'named'
      name: string
      vars: ComparisonResult[]
    }
  | {
      type: 'func-type-var'
      id: string
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
      type: 'module'
      path: string
    }
  | {
      type: 'function'
      argument: ComparisonResult
      return: ComparisonResult
      typeVarIds: string[]
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
      return type.typeSpec instanceof FuncTypeVarSpec
        ? {
            type: 'func-type-var',
            id: type.typeSpec.id,
          }
        : {
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
    case 'module': {
      return {
        type: 'module',
        path: type.path,
      }
    }
    case 'function': {
      return {
        type: 'function',
        argument: typeToResultType(type.argument),
        return: typeToResultType(type.return),
        typeVarIds: type.typeVars.map(typeVar => typeVar.id),
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
      // Function type vars, compareAssignable
      issue: 'too-specific'
    }
  | {
      // Union types, compareAssignable
      issue: 'too-general'
      canOnlyHandle: ComparisonResultType
    }
  | {
      // Union types, compareEqual
      issue: 'no-overlap'
      with: ComparisonResultType
    }
  | {
      // Tuples
      issue: 'need-extra-items'
      types: ComparisonResultType[]
    }
  | {
      // Tuples
      issue: 'too-many-items'
      extra: number
    }
  | {
      // Records
      issue: 'record-key-mismatch'
      missing: string[]
      extra: string[]
    }

export type ComparisonResult = ComparisonResultType & {
  issue?: ComparisonIssue
}
