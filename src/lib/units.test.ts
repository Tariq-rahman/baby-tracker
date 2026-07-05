import { describe, it, expect } from 'vitest'
import {
  kgToGrams,
  gramsToKg,
  lbOzToGrams,
  gramsToLbOz,
  cmToMm,
  mmToCm,
  inchesToMm,
  mmToInches,
} from './units'

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

describe('cmToMm', () => {
  it.each([
    [52.5, 525],
    [38, 380],
    [0, 0],
    [50.34, 503], // rounds to nearest mm
  ])('converts %s cm to %s mm', (cm, mm) => {
    expect(cmToMm(cm)).toBe(mm)
  })
})

describe('mmToCm', () => {
  it('converts mm to cm as a number', () => {
    expect(mmToCm(525)).toBeCloseTo(52.5, 5)
  })
})

describe('inchesToMm', () => {
  it.each([
    [20, 508], // 20in = 508mm exactly
    [0, 0],
    [15, 381], // 381.0 -> 381
    [14.96, 380], // 379.98 -> 380 (rounds to nearest mm)
  ])('converts %s in to %s mm', (inches, mm) => {
    expect(inchesToMm(inches)).toBe(mm)
  })
})

describe('mmToInches', () => {
  it('converts mm to inches as a number', () => {
    expect(mmToInches(508)).toBeCloseTo(20, 5)
  })
})
