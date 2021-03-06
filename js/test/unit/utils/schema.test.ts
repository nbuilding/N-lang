import { expect } from 'chai'

import s, * as schem from '../../../src/utils/schema'

describe('schema', () => {
  interface Sheep {
    name: string
  }

  function isSheep (value: any): value is Sheep {
    return typeof value === 'object'
      && value !== null
      && typeof value.name === 'string'
  }

  it('should assert null', () => {
    const schema = s.null
    // Really dumb hack to get around the "Assertions require every name in the
    // call target to be declared with an explicit type annotation" error.
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check(null)
    }).to.not.throw()

    expect(() => {
      check([])
    }).to.throw(schem.GuardError)

    expect(() => {
      check(new Date())
    }).to.throw(schem.GuardError)

    expect(() => {
      check(undefined)
    }).to.throw(schem.GuardError)
  })

  it('should assert any', () => {
    const schema = s.any
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check(null)
      check([])
      check(new Date())
      check(undefined)
    }).to.not.throw()
  })

  it('should assert an instance of Date', () => {
    const schema = s.instance(Date)
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check(new Date())
    }).to.not.throw()

    expect(() => {
      check(Date.now())
    }).to.throw(schem.GuardError)

    expect(() => {
      check(Date)
    }).to.throw(schem.GuardError)

    expect(() => {
      check(null)
    }).to.throw(schem.GuardError)
  })

  it('should assert an array of Dates', () => {
    const schema = s.array(s.instance(Date))
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check([new Date()])
      check([])
    }).to.not.throw()

    expect(() => {
      check(new Date())
    }).to.throw(schem.GuardError)

    expect(() => {
      check([new Date(), null])
    }).to.throw(schem.GuardError)
  })

  it('should assert a tuple', () => {
    const schema = s.tuple([s.instance(Date), s.null])
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check([new Date(), null])
    }).to.not.throw()

    expect(() => {
      check(null)
    }).to.throw(schem.GuardError)

    expect(() => {
      check([new Date(), null, null])
    }).to.throw(schem.GuardError)

    expect(() => {
      check([new Date()])
    }).to.throw(schem.GuardError)

    expect(() => {
      check([new Date(), undefined])
    }).to.throw(schem.GuardError)
  })

  it('should assert a type union', () => {
    const schema = s.union([s.instance(Date), s.null])
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check(new Date())
      check(null)
    }).to.not.throw()

    expect(() => {
      check(Date.now())
    }).to.throw(schem.GuardError)
  })

  it('should assert a type guard', () => {
    const schema = s.guard(isSheep)
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check({ name: 'Billy' })
      check({ name: 'Dolly', colour: 'white' })
    }).to.not.throw()

    expect(() => {
      check({ name: 3 })
    }).to.throw(schem.GuardError)
  })

  it('should assert a nullable empty tuple', () => {
    const emptyTuple: [] = []
    const schema = s.nullable(s.tuple(emptyTuple))
    const check: typeof schema.check = schema.check.bind(schema)

    expect(() => {
      check([])
      check(null)
    }).to.not.throw()

    expect(() => {
      check([3])
    }).to.throw(schem.GuardError)

    expect(() => {
      check(undefined)
    }).to.throw(schem.GuardError)
  })
})
