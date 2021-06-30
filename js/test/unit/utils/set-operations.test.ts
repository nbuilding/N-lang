import { expect } from 'chai'

import {
  difference,
  intersection,
  isSubset,
} from '../../../src/utils/set-operations'

describe('intersection', () => {
  it('should get the items that two sets have', () => {
    const a = [1, 2, 3, 4]
    const b = [6, 5, 4, 3]
    expect(intersection(a, b)).to.have.all.keys([3, 4])
  })
})

describe('isSubset', () => {
  it('should determine if a set is a subset of another', () => {
    expect(isSubset([1, 2, 3], [4, 3, 2, 1])).to.be.true
  })

  it('should not be commutative', () => {
    expect(isSubset([4, 3, 2, 1], [1, 2, 3])).to.be.false
  })

  it('should treat a set as the subset of itself', () => {
    expect(isSubset([1, 2, 3], [3, 2, 1])).to.be.true
  })

  it('should treat an empty set as a subset of other sets', () => {
    expect(isSubset([], [1, 2])).to.be.true
  })
})

describe('difference', () => {
  it('should get unique items from each set', () => {
    const a = [1, 2, 3, 4]
    const b = [6, 5, 4, 3]
    const [onlyInA, onlyInB] = difference(a, b)
    expect(onlyInA).to.have.all.keys([1, 2])
    expect(onlyInB).to.have.all.keys([5, 6])
  })

  it('should deal with Map keys properly', () => {
    const a = new Map(Object.entries({ a: 1, b: 1, d: 1 }))
    const b = new Map(Object.entries({ a: 1, b: 1, c: 1 }))
    const [onlyInA, onlyInB] = difference(a.keys(), b.keys())
    expect(onlyInA).to.have.all.keys(['d'])
    expect(onlyInB).to.have.all.keys(['c'])
  })
})
