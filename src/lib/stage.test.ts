import { describe, test, expect } from 'vitest'
import { STAGES, STAGE_MAP, stageLabel, stageColor, stageBg, FUNNEL_STAGES } from './stage'
import type { CustomerStage } from '@/types'

describe('STAGES', () => {
  test('包含 6 个标准阶段', () => {
    expect(STAGES).toHaveLength(6)
  })

  test('每个阶段都有 value/label/color/bg', () => {
    for (const s of STAGES) {
      expect(s.value).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(s.bg).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  test('STAGE_MAP 跟 STAGES 一一对应', () => {
    for (const s of STAGES) {
      expect(STAGE_MAP[s.value]).toEqual(s)
    }
  })

  test('value 都不重复', () => {
    const values = STAGES.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('stageLabel / stageColor / stageBg', () => {
  test('已知阶段返回正确值', () => {
    expect(stageLabel('new')).toBe('新客户')
    expect(stageLabel('won')).toBe('已成交')
    expect(stageColor('new')).toBe('#0ea5e9')
    expect(stageColor('won')).toBe('#10b981')
    expect(stageBg('new')).toBe('#e0f2fe')
  })

  test('未知阶段返回 fallback（不抛错）', () => {
    // cast 是为了测边界, TS 实际不允许任意 string
    const fake = 'unknown' as CustomerStage
    expect(stageLabel(fake)).toBe('unknown') // 降级用 stage 字符串
    expect(stageColor(fake)).toBe('#64748b') // slate-500
    expect(stageBg(fake)).toBe('#f1f5f9') // slate-100
  })
})

describe('FUNNEL_STAGES', () => {
  test('5 个阶段, 不含 lost', () => {
    expect(FUNNEL_STAGES).toHaveLength(5)
    expect(FUNNEL_STAGES).not.toContain('lost')
  })

  test('顺序: new → contacted → intent → negotiating → won', () => {
    expect(FUNNEL_STAGES).toEqual(['new', 'contacted', 'intent', 'negotiating', 'won'])
  })
})
