import { ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export interface GetTypeContext extends ScopeBaseContext {}

export interface GetTypeResult {
  type: NType | null
}

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
