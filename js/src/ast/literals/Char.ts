import { Literal } from './Literal'

export class Char extends Literal {
  toString () {
    return `\\{${this.value}}`
  }
}
