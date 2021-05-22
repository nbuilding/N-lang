import { expect } from 'chai'

import { haveSameItems } from '../../../src/utils/have-same-items'

describe('haveSameItems', () => {
  it('should return true for arrays with the same items, diff. order', () => {
    expect(haveSameItems([1, 2, 3], [3, 2, 1])).to.be.true
  })

  it('should ignore duplicates', () => {
    expect(haveSameItems([1, 1, 1, 1, 2, 1, 1], [1, 2, 2])).to.be.true
  })

  it('should compare by reference', () => {
    expect(haveSameItems([{}], [{}])).to.be.false
  })

  it('empty arrays have the same items', () => {
    expect(haveSameItems([], [])).to.be.true
  })

  it('should not tolerate extra items', () => {
    expect(haveSameItems([1, 2, 3], [2, 3])).to.be.true
    expect(haveSameItems([1, 2, 3], [1, 2, 3, 4])).to.be.true
  })
})
