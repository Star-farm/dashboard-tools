import { describe, expect, it } from 'vitest'
import { yearTicks } from '../src/utils/yearTicks'

describe('responsive year labels', () => {
  it.each([240, 280, 320, 375, 620, 800, 1200])('keeps the first year and equal intervals at %ipx', (width) => {
    const ticks = yearTicks(2027, 2050, width, 88)
    expect(ticks[0]).toBe(2027)
    expect(ticks.at(-1)).toBeLessThanOrEqual(2050)
    const gaps = ticks.slice(1).map((year, index) => year - ticks[index])
    expect(new Set(gaps).size).toBe(1)
    expect(gaps[0] / 23 * (width - 88)).toBeGreaterThanOrEqual(56)
  })

  it('uses fewer equally spaced labels on a phone without discarding annual data', () => {
    expect(yearTicks(2027, 2050, 620, 88)).toEqual([2027, 2030, 2033, 2036, 2039, 2042, 2045, 2048])
    expect(yearTicks(2027, 2050, 320, 88)).toEqual([2027, 2033, 2039, 2045])
    expect(yearTicks(2027, 2027, 320, 88)).toEqual([2027])
  })
})
