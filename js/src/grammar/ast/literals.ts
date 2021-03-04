import schema, * as schem from '../../utils/schema'
import { isToken } from '../../utils/type-guards'
import { Base, BasePosition } from './base'

export class Literal extends Base {
  value: string

  constructor (pos: BasePosition, value: string) {
    super(pos)
    this.value = value
  }

  toString () {
    return this.value
  }

  static schema = schema.tuple([
    schema.guard(isToken),
  ])

  static fromSchema<T extends typeof Literal> (pos: BasePosition, [str]: schem.infer<typeof Literal.schema>): InstanceType<T> {
    return new this(pos, str.value) as InstanceType<T>
  }
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

export class Unit extends Literal {}

export class Identifier extends Literal {}
