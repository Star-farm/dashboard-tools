import { describe, expect, it } from 'vitest'
import { annualSeasonalValue, seasonalComposition } from '../src/features/economics/seasonalComposition'

describe('seasonal annual composition', () => {
  it('normalizes all cultivated crops including zero values', () => {
    expect(seasonalComposition([30, 70]).shares).toEqual([30, 70])
    expect(seasonalComposition([20, 30, 50]).shares).toEqual([20, 30, 50])
    expect(seasonalComposition([0, 50]).shares).toEqual([0, 100])
  })
  it('does not imply a valid composition for incomplete, negative or empty totals', () => {
    for (const values of [[null, 10], [-10, 30], [0, 0], [], [NaN, 10]]) {
      expect(seasonalComposition(values).shares).toBeNull()
    }
    expect(annualSeasonalValue([null, 10], 'income')).toBeNull()
  })
  it('sums additive metrics but averages rates and yields', () => {
    expect(annualSeasonalValue([20, 30, -10], 'income')).toBe(40)
    expect(annualSeasonalValue([30, 60], 'margin')).toBe(45)
    expect(annualSeasonalValue([6, 8], 'yield')).toBe(7)
  })
})
