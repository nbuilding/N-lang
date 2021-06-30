import { expect } from 'chai'

import { uniqueId } from '../../../src/utils/uuid'

describe('uniqueId', () => {
  it('should return an ID of the form \\w+-\\w+-\\d+', () => {
    expect(uniqueId()).to.match(/^[a-z0-9]+-[a-z0-9]+-\d+$/)
  })

  it('should return unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 1000; i++) {
      ids.add(uniqueId())
    }
    expect(ids.size).to.equal(1000)
  })
})
