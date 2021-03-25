import { EnumTypeSpec, TypeSpec } from './type-specs'
import { makeVar } from './types'

export const str = new TypeSpec('str')
export const int = new TypeSpec('int')
export const float = new TypeSpec('float')
export const bool = new TypeSpec('bool')
export const char = new TypeSpec('char')

export const list = new TypeSpec('list', ['i'].map(makeVar))
export const map = new TypeSpec('map', ['k', 'v'].map(makeVar))
export const cmd = new TypeSpec('cmd', ['r'].map(makeVar))

export const maybe = EnumTypeSpec.make(
  'maybe',
  t => [
    ['yes', [t]],
    ['none', []],
  ],
  't',
)
export const result = EnumTypeSpec.make(
  'result',
  (o, e) => [
    ['ok', [o]],
    ['err', [e]],
  ],
  'o',
  'e',
)
