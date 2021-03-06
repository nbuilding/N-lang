import { expect } from 'chai'

import { isString, isNumber, isEnum, isToken, shouldBe, shouldSatisfy } from '../../../src/utils/type-guards'

describe('type guards', () => {
  enum SheepState {
    Happy,
    Disappointed,
  }

  it('isString should check for strings', () => {
    expect(isString('happy')).to.be.true
    expect(isString('')).to.be.true

    expect(isString(undefined)).to.be.false
    expect(isString([])).to.be.false
  })

  it('isNumber should check for numbers', () => {
    expect(isNumber(Math.PI)).to.be.true
    expect(isNumber(Infinity)).to.be.true
    expect(isNumber(NaN)).to.be.true // :eyes:

    expect(isNumber('3')).to.be.false
    expect(isNumber(true)).to.be.false
  })

  it('isEnum should check if a value is an enum', () => {
    const isSheepState = isEnum(SheepState)

    expect(isSheepState(SheepState.Happy)).to.be.true
    expect(isSheepState(SheepState.Disappointed)).to.be.true

    expect(isSheepState(SheepState)).to.be.false
    expect(isSheepState(2)).to.be.false
  })

  it('isToken should check for moo.Tokens', () => {
    expect(isToken({
      value: 'wow',
      offset: 3,
      text: 'wow',
      lineBreaks: 2,
      line: 3,
      col: 4,
    })).to.be.true

    expect(isToken({})).to.be.false
  })
})

describe('type assertions', () => {
  it('shouldBe should assert an instance of a class', () => {
    expect(() => {
      shouldBe(Date, new Date())
      shouldBe(Array, [])
      shouldBe(Object, {})
      shouldBe(Object, new Date())
    }).to.not.throw()

    expect(() => {
      shouldBe(Array, { length: 0 })
    }).to.throw(TypeError)

    expect(() => {
      shouldBe(Object, null)
    }).to.throw(TypeError)
  })

  it('shouldSatisfy should assert a type guard', () => {
    expect(() => {
      shouldSatisfy(isString, 'Nice')
      shouldSatisfy(isNumber, NaN)
    }).to.not.throw()

    expect(() => {
      shouldSatisfy(isNumber, '3')
    }).to.throw(TypeError)
  })
})
