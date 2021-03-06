import { expect } from 'chai'

import { displayType } from '../../../src/utils/display-type'

describe('displayType', () => {
  it('should return null for null', () => {
    expect(displayType(null)).to.equal('null')
  })

  it('should return the prototype name for objects', () => {
    expect(displayType({})).to.equal('Object')

    expect(displayType(new Date())).to.equal('Date')
  })

  it('should return the typeof value of a primitive type', () => {
    expect(displayType(() => {})).to.equal('function')

    expect(displayType(3)).to.equal('number')
  })

  it('should include the length of an array', () => {
    expect(displayType([1, 2, 3])).to.equal('Array (length 3)')
  })
})
