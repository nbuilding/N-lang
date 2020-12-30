import * as ast from '../grammar/ast'
import { displayType } from '../utils/display-type'
import { isEnum } from "../utils/type-guards"

enum NBaseType {
  Never,
  Int,
  Float,
  String,
  Char,
  Boolean,
}

export function never (): NType {
  return NBaseType.Never
}
export function isNever (type: NType): boolean {
  return type === NBaseType.Never
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

export function char (): NType {
  return NBaseType.Char
}
export function isChar (type: NType): boolean {
  return type === NBaseType.Char
}

const isBaseType = isEnum(NBaseType)

// The number type is unusual in that it contains state.
export class NNumber {
  toResolve: Set<ast.Base>

  constructor () {
    this.toResolve = new Set()
  }

  addToResolve (base: ast.Base): NNumber {
    this.toResolve.add(base)
    return this
  }

  merge (numType: NNumber): NNumber {
    for (const base of numType.toResolve) {
      this.toResolve.add(base)
    }
    for (const base of this.toResolve) {
      numType.toResolve.add(base)
    }
    return this
  }
}
export function number (): NNumber {
  return new NNumber()
}
export function isNumber (type: NType): type is NNumber {
  return type instanceof NNumber
}
export function isNumberResolvable (type: NType): boolean {
  return isInt(type) || isFloat(type)
}

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
  // TODO
  name: string
  generics: string[]

  constructor (name: string, generics: string[]) {
    this.name = name
    this.generics = generics
  }
}
export function custom (name: string, generics: string[] = []): NCustomType {
  return new NCustomType(name, generics)
}
export function isCustom (type: NType): type is NCustomType {
  return type instanceof NCustomType
}

// null means error, which is used to avoid spouting a flood of errors when
// something goes wrong.
type NType = null | NBaseType | NNumber | NFunction | NCustomType

export function is (a: NType, b: NType): boolean {
  if (a === null || isBaseType(a)) {
    return a === b
  } else if (isNumber(a)) {
    return isNumber(b)
  } else if (isFunc(a)) {
    return isFunc(b) && is(a.takes, b.takes) && is(a.returns, b.returns)
  } else if (isCustom(a)) {
    return isCustom(b) && a.generics.length === b.generics.length &&
      a.generics.every((generic, i) => generic === b.generics[i])
  } else {
    console.warn(new Error('Stack trace for discovered never type.'), a, b)
    return false
  }
}

export function display (type: NType): string {
  if (isBaseType(type)) {
    switch (type) {
      case NBaseType.Never: return 'never'
      case NBaseType.Int: return 'int'
      case NBaseType.Float: return 'float'
      case NBaseType.String: return 'str'
      case NBaseType.Char: return 'char'
      case NBaseType.Boolean: return 'bool'
    }
  } else if (isNumber(type)) {
    // console.warn(new Error('Stack trace for discovered number type.'), type)
    return 'number'
  } else if (isFunc(type)) {
    return (isFunc(type.takes) ? `(${display(type.takes)})` : display(type.takes))
      + ' -> '
      + display(type.returns)
  } else if (isCustom(type)) {
    return type.name
      + (type.generics.length ? `<${
        type.generics
          .map(type => typeof type === 'string' ? type : display(type))
          .join(', ')
      }>` : '')
  } else if (type === null) {
    // console.warn(new Error('Stack trace for discovered null type.'), type)
    return '??? (this means that the type is unknown due to an error elsewhere, but this should never show in errors--type checker bug)'
  } else {
    // console.warn(new Error('Stack trace for discovered "never" type.'), type)
    return `??? (this should never show a ${displayType(type)}--type checker bug)`
  }
}

export default NType
