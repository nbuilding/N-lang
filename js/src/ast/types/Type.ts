import { Scope, ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export class GetTypeContext extends ScopeBaseContext {
  constructor (scope: Scope, base: Type) {
    super(scope, base)
  }
}

export interface GetTypeResult {
  type: NType
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
