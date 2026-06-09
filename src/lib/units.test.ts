import { describe, it, expect } from 'vitest'
import { kgToGrams, gramsToKg, lbOzToGrams, gramsToLbOz } from './units'

describe('kgToGrams', () => {
  it.each([
    [4.2, 4200],
    [3.456, 3456],
    [0, 0],
    [4.2005, 4201], // rounds to nearest gram
  ])('converts %s kg to %s g', (kg, grams) => {
    expect(kgToGrams(kg)).toBe(grams)
  })
})

describe('gramsToKg', () => {
  it('converts grams to kg as a number', () => {
    expect(gramsToKg(4200)).toBeCloseTo(4.2, 5)
  })
})

describe('lbOzToGrams', () => {
  it.each([
    [9, 4, 4196], // 9lb 4oz = 4195.8g -> 4196
    [0, 0, 0],
    [1, 0, 454], // 453.592 -> 454
  ])('converts %s lb %s oz to %s g', (lb, oz, grams) => {
    expect(lbOzToGrams(lb, oz)).toBe(grams)
  })
})

describe('gramsToLbOz', () => {
  it('converts grams to lb + oz, rounding oz to nearest whole', () => {
    expect(gramsToLbOz(4196)).toEqual({ lb: 9, oz: 4 })
  })
  it('carries 16 oz into a pound', () => {
    expect(gramsToLbOz(453)).toEqual({ lb: 1, oz: 0 })
  })
})
