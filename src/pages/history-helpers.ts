import type { KickSession, ContractionSession, FeedingRecord } from '../lib/db.ts'
import { isSameDay } from '../lib/time.ts'

export interface TimelineEvent {
  time: number
  type: 'kick' | 'window'
  label: string
}

export function getTimeline(session: KickSession): TimelineEvent[] {
  const events: TimelineEvent[] = []
  let lastWindowId = -1
  let kickNum = 0

  for (const tap of session.taps) {
    if (tap.windowId !== lastWindowId) {
      kickNum++
      lastWindowId = tap.windowId
      events.push({
        time: tap.timestamp,
        type: 'kick',
        label: `第 ${kickNum} 次有效胎动`,
      })
    } else {
      events.push({
        time: tap.timestamp,
        type: 'window',
        label: '窗口内追加点击',
      })
    }
  }

  return events
}

export function getChartPoints(sessions: KickSession[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const kicks = sessions
      .filter((session) => isSameDay(session.startedAt, dayStart))
      .reduce((sum, session) => sum + session.kickCount, 0)

    points.push({ time: Math.floor(dayStart / 1000), value: kicks })
  }

  return points
}

/** Daily total feeding volume (ml) over the given range */
export function getFeedingVolumeChartPoints(records: FeedingRecord[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const dayRecords = records.filter((r) => isSameDay(r.startedAt, dayStart))
    const totalMl = dayRecords.reduce((sum, r) => sum + (r.volumeMl ?? 0), 0)

    points.push({ time: Math.floor(dayStart / 1000), value: totalMl })
  }

  return points
}

/** Daily total feeding duration (minutes) over the given range */
export function getFeedingDurationChartPoints(records: FeedingRecord[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const dayRecords = records.filter((r) => isSameDay(r.startedAt, dayStart))
    const totalMin = dayRecords.reduce((sum, r) => sum + (r.duration ?? 0), 0) / 60000

    points.push({ time: Math.floor(dayStart / 1000), value: Math.round(totalMin * 10) / 10 })
  }

  return points
}

/** Daily average contraction interval (in minutes) over the given range */
export function getContractionChartPoints(sessions: ContractionSession[], days: number): { time: number; value: number }[] {
  const points: { time: number; value: number }[] = []
  const now = Date.now()
  const dayMs = 86400000

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const daySessions = sessions.filter((s) => isSameDay(s.startedAt, dayStart))
    const withInterval = daySessions.filter((s) => s.avgInterval !== null && s.avgInterval > 0)

    const avgMin = withInterval.length > 0
      ? withInterval.reduce((sum, s) => sum + s.avgInterval!, 0) / withInterval.length / 60000
      : 0

    points.push({ time: Math.floor(dayStart / 1000), value: Math.round(avgMin * 10) / 10 })
  }

  return points
}
