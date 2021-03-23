import { Base } from '../base'

export interface TypeCheckContext {}

export interface TypeCheckResult {}

export interface Expression extends Base {
  typeCheck(context: TypeCheckContext): TypeCheckResult
}

export function isExpression (value: unknown): value is Expression {
  return (
    value instanceof Base &&
    'typeCheck' in value &&
    typeof value['typeCheck'] === 'function'
  )
}
