import { Base } from '../base'

export interface GetTypeContext {}

export interface GetTypeResult {}

export interface Type extends Base {
  getType(context: GetTypeContext): GetTypeResult
}

export function isType (value: unknown): value is Type {
  return (
    value instanceof Base &&
    'getType' in value &&
    typeof value['getType'] === 'function'
  )
}
