import { isEnum } from "../utils/type-guards"

enum NBaseType {
  Never,
  Infer,
  Number,
  Int,
  Float,
  String,
  Boolean,
}

export function never (): NType {
  return NBaseType.Never
}
export function isNever (type: NType): boolean {
  return type === NBaseType.Never
}

export function infer (): NType {
  return NBaseType.Infer
}
export function isInfer (type: NType): boolean {
  return type === NBaseType.Infer
}

export function number (): NType {
  return NBaseType.Number
}
export function isNumber (type: NType): boolean {
  return type === NBaseType.Number
}

export function int (): NType {
  return NBaseType.Int
}
export function isInt (type: NType): boolean {
  return type === NBaseType.Int
}

export function float (): NType {
  return NBaseType.Float
}
export function isFloat (type: NType): boolean {
  return type === NBaseType.Float
}

export function string (): NType {
  return NBaseType.String
}
export function isString (type: NType): boolean {
  return type === NBaseType.String
}

export function bool (): NType {
  return NBaseType.Boolean
}
export function isBool (type: NType): boolean {
  return type === NBaseType.Boolean
}

const isBaseType = isEnum(NBaseType)

interface NFunction {
  takes: NType
  returns: NType
}
export function func (takes: NType, returns: NType): NFunction {
  return { takes, returns }
}
export function isFunc (type: NType): type is NFunction {
  if (type && !isBaseType(type) && !isCustom(type)) {
    return true
  } else {
    return false
  }
}

// TODO
interface NCustomType {
  generics: string[]
}
export function custom (generics: string[]): NCustomType {
  return { generics }
}
export function isCustom (type: NType): type is NCustomType {
  if (type && !isBaseType(type) && !isFunc(type)) {
    return true
  } else {
    return false
  }
}

// null means error, which is used to avoid spouting a flood of errors when
// something goes wrong.
type NType = null | NBaseType | NFunction | NCustomType

export function is (a: NType, b: NType): boolean {
  if (a === null || isBaseType(a)) {
    return a === b
  } else if (isFunc(a)) {
    return isFunc(b) && is(a.takes, b.takes) && is(a.returns, b.returns)
  } else {
    return isCustom(b) && a.generics.length === b.generics.length &&
      a.generics.every((generic, i) => generic === b.generics[i])
  }
}

export function display (_type: NType): string {
  return 'todo'
}

export default NType
