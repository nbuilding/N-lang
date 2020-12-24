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

class NFunction {
  takes: NType
  returns: NType

  constructor (takes: NType, returns: NType) {
    this.takes = takes
    this.returns = returns
  }
}
export function func (takes: NType, returns: NType): NFunction {
  return new NFunction(takes, returns)
}
export function isFunc (type: NType): type is NFunction {
  return type instanceof NFunction
}
export function toFunc ([param, ...rest]: NType[]): NType {
  if (rest.length === 0) {
    return param
  } else {
    return func(param, toFunc(rest))
  }
}

class NCustomType {
  generics: (string | NType)[]

  constructor (generics: (string | NType)[]) {
    this.generics = generics
  }
}
export function custom (generics: string[]): NCustomType {
  return new NCustomType(generics)
}
export function isCustom (type: NType): type is NCustomType {
  return type instanceof NCustomType
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
