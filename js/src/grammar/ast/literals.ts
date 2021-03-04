import schema, * as schem from '../../utils/schema'
import { isToken } from '../../utils/type-guards'
import { Base, BasePosition } from './base'

export class Literal extends Base {
  value: string

  constructor (pos: BasePosition, [str]: schem.infer<typeof Literal.schema>) {
    super(pos)
    this.value = str.value
  }

  toString () {
    return this.value
  }

  static schema = schema.tuple([
    schema.guard(isToken),
  ])
}

export class String extends Literal {
  toString () {
    return JSON.stringify(this.value)
  }
}

export class Char extends Literal {
  toString () {
    return `\\{${this.value}}`
  }
}

// A number can represent either an int or a float
export class Number extends Literal {}

export class Float extends Literal {}

export class Unit extends Base {
  constructor (pos: BasePosition, _: schem.infer<typeof Unit.schema>) {
    super(pos)
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.any,
  ])
}

export class Identifier extends Literal {}
