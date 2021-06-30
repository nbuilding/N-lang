import { expect } from 'chai'
import { fromEntries } from '../../../src/utils/from-entries'

describe('fromEntries', () => {
  it('should create an object with given entries', () => {
    expect(
      fromEntries([
        ['hello', 'hi'],
        ['wee', 'lol'],
      ]),
    ).to.deep.equal({
      hello: 'hi',
      wee: 'lol',
    })
  })

  it('should create an empty object with no entries', () => {
    expect(fromEntries([])).to.deep.equal({})
  })

  it('should support iterables', () => {
    const map: Map<string, number> = new Map()
    map.set('a', 1)
    map.set('b', 2)
    expect(fromEntries(map)).to.deep.equal({
      a: 1,
      b: 2,
    })
  })

  it('should support iterables with a mapping function', () => {
    const map: Map<Date, string> = new Map()
    map.set(new Date(2020, 0), 'twenty twenty')
    map.set(new Date(2021, 0), 'two thousand twenty-one')
    expect(
      fromEntries(map, (key, value) => [value, key.getFullYear()]),
    ).to.deep.equal({
      'twenty twenty': 2020,
      'two thousand twenty-one': 2021,
    })
  })
})
