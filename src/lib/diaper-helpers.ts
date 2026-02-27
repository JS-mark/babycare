import type { PoopColor, PoopConsistency, DiaperRecord } from './db.ts'
import { isSameDay } from './time.ts'

export interface ColorOption {
  value: PoopColor
  label: string
  emoji: string
  hex: string
  alert: boolean
}

export const poopColors: ColorOption[] = [
  { value: 'yellow', label: '黄色', emoji: '🟡', hex: '#F59E0B', alert: false },
  { value: 'brown', label: '棕色', emoji: '🟤', hex: '#92400E', alert: false },
  { value: 'green', label: '绿色', emoji: '🟢', hex: '#10B981', alert: false },
  { value: 'black', label: '黑色', emoji: '⚫', hex: '#1F2937', alert: true },
  { value: 'red', label: '红色', emoji: '🔴', hex: '#EF4444', alert: true },
  { value: 'white', label: '白色', emoji: '⚪', hex: '#D1D5DB', alert: true },
]

export const poopConsistencies: { value: PoopConsistency; label: string }[] = [
  { value: 'watery', label: '稀' },
  { value: 'soft', label: '软' },
  { value: 'hard', label: '硬' },
]

export function getColorOption(color: PoopColor): ColorOption {
  return poopColors.find(c => c.value === color)!
}

export function getConsistencyLabel(consistency: PoopConsistency): string {
  return poopConsistencies.find(c => c.value === consistency)!.label
}

export function getTodayDiaperCount(records: DiaperRecord[]): number {
  return records.filter(r => isSameDay(r.createdAt, Date.now())).length
}
