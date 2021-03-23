import { Literal } from './Literal'

export class String extends Literal {
  toString () {
    return JSON.stringify(this.value)
  }
}
