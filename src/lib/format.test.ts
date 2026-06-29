import { describe, test, expect } from 'vitest'
import { formatDate, formatDay, formatMoney, isThisMonth, isToday, daysAgo } from './format'

describe('formatMoney', () => {
  test('小于 1 万不加单位', () => {
    expect(formatMoney(0)).toBe('¥0')
    expect(formatMoney(9999)).toBe('¥9,999')
  })

  test('>= 1 万转 \"X.X万\"', () => {
    expect(formatMoney(10000)).toBe('¥1.0万')
    expect(formatMoney(12345)).toBe('¥1.2万')
    expect(formatMoney(100000)).toBe('¥10.0万')
  })

  test('withSymbol=false 去掉 ¥', () => {
    expect(formatMoney(100, false)).toBe('100')
    expect(formatMoney(50000, false)).toBe('5.0万')
  })
})

describe('formatDate / formatDay', () => {
  test('空值返回 \"-\"', () => {
    expect(formatDate()).toBe('-')
    expect(formatDate(undefined)).toBe('-')
    expect(formatDate('')).toBe('-')
    expect(formatDay()).toBe('-')
  })

  test('默认 pattern 完整', () => {
    const d = '2026-06-15T10:30:00.000Z'
    const out = formatDate(d)
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  test('formatDay 只到日期', () => {
    const d = '2026-06-15T10:30:00.000Z'
    const out = formatDay(d)
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('自定义 pattern', () => {
    expect(formatDate('2026-01-01T00:00:00.000Z', 'YYYY/MM/DD')).toBe('2026/01/01')
  })
})

describe('isThisMonth / isToday', () => {
  test('空值返回 false', () => {
    expect(isThisMonth()).toBe(false)
    expect(isToday()).toBe(false)
  })

  test('今天日期返回 true', () => {
    const now = new Date().toISOString()
    expect(isThisMonth(now)).toBe(true)
    expect(isToday(now)).toBe(true)
  })

  test('上个月日期 isThisMonth=false, isToday=false', () => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    expect(isThisMonth(lastMonth.toISOString())).toBe(false)
    expect(isToday(lastMonth.toISOString())).toBe(false)
  })
})

describe('daysAgo', () => {
  test('返回 ISO 字符串', () => {
    const out = daysAgo(7)
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('daysAgo(0) 跟现在接近', () => {
    const before = Date.now()
    const out = daysAgo(0)
    const after = Date.now()
    const ts = new Date(out).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})
