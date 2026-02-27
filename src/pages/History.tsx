import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs } from '@base-ui/react/tabs'
import { Collapsible } from '@base-ui/react/collapsible'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconTimer2OutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { IconBabyClothesOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { Liveline } from 'liveline'
import StickyHeader from '../components/StickyHeader.tsx'
import { db, type KickSession, type ContractionSession, type Contraction, type FeedingRecord, type DiaperRecord } from '../lib/db.ts'
import { getSettings } from '../lib/settings.ts'
import { formatDate, formatTime, formatDuration, isSameDay } from '../lib/time.ts'
import { getFeedingLabel, getFeedingEmoji, getFeedingColor, getFeedingBgColor, formatFeedingDuration } from '../lib/feeding-helpers.ts'
import { getColorOption, getConsistencyLabel } from '../lib/diaper-helpers.ts'
import { getChartPoints, getContractionChartPoints, getFeedingVolumeChartPoints, getFeedingDurationChartPoints, getTimeline } from './history-helpers.ts'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}秒`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}分${sec}秒` : `${m}分`
}

export default function History() {
  const navigate = useNavigate()
  const [kickSessions, setKickSessions] = useState<KickSession[]>([])
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([])
  const [contractions, setContractions] = useState<Record<string, Contraction[]>>({})
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [diaperRecords, setDiaperRecords] = useState<DiaperRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chartRange, setChartRange] = useState<7 | 30>(7)
  const [contractionChartRange, setContractionChartRange] = useState<7 | 30>(7)
  const [feedingChartRange, setFeedingChartRange] = useState<7 | 30>(7)
  const [feedingChartMode, setFeedingChartMode] = useState<'volume' | 'duration'>('volume')
  const [activeTab, setActiveTab] = useState<string | null>('kicks')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  useEffect(() => {
    db.sessions.orderBy('startedAt').reverse().toArray().then(setKickSessions)
    db.contractionSessions.orderBy('startedAt').reverse().toArray().then(setContractionSessions)
    db.feedingRecords.orderBy('startedAt').reverse().toArray().then(setFeedingRecords)
    db.diaperRecords.orderBy('createdAt').reverse().toArray().then(setDiaperRecords)
  }, [])

  async function loadContractions(sessionId: string) {
    if (contractions[sessionId]) return
    const list = await db.contractions.where('sessionId').equals(sessionId).sortBy('startedAt')
    setContractions(prev => ({ ...prev, [sessionId]: list }))
  }

  async function handleDeleteSession() {
    if (!deletingSessionId) return
    await db.sessions.delete(deletingSessionId)
    setKickSessions(prev => prev.filter(s => s.id !== deletingSessionId))
    setExpandedId(null)
    setDeletingSessionId(null)
  }

  // Kick sessions grouped by date
  const kickGrouped = kickSessions.reduce<{ date: string; ts: number; sessions: KickSession[] }[]>(
    (acc, session) => {
      const dateStr = formatDate(session.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.sessions.push(session)
      } else {
        acc.push({ date: dateStr, ts: session.startedAt, sessions: [session] })
      }
      return acc
    },
    [],
  )

  // Contraction sessions grouped by date
  const contractionGrouped = contractionSessions.reduce<{ date: string; ts: number; sessions: ContractionSession[] }[]>(
    (acc, session) => {
      const dateStr = formatDate(session.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.sessions.push(session)
      } else {
        acc.push({ date: dateStr, ts: session.startedAt, sessions: [session] })
      }
      return acc
    },
    [],
  )

  // Feeding records grouped by date
  const feedingGrouped = feedingRecords.reduce<{ date: string; ts: number; records: FeedingRecord[] }[]>(
    (acc, record) => {
      const dateStr = formatDate(record.startedAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.records.push(record)
      } else {
        acc.push({ date: dateStr, ts: record.startedAt, records: [record] })
      }
      return acc
    },
    [],
  )

  // Diaper records grouped by date
  const diaperGrouped = diaperRecords.reduce<{ date: string; ts: number; records: DiaperRecord[] }[]>(
    (acc, record) => {
      const dateStr = formatDate(record.createdAt)
      const last = acc[acc.length - 1]
      if (last && last.date === dateStr) {
        last.records.push(record)
      } else {
        acc.push({ date: dateStr, ts: record.createdAt, records: [record] })
      }
      return acc
    },
    [],
  )

  // Chart data for kicks (Liveline)
  const settings = getSettings()
  const isDark = document.documentElement.classList.contains('dark')
  const chartPoints = useMemo(() => getChartPoints(kickSessions, chartRange), [kickSessions, chartRange])
  const todayKicks = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : 0

  const contractionChartPoints = useMemo(() => getContractionChartPoints(contractionSessions, contractionChartRange), [contractionSessions, contractionChartRange])
  const todayInterval = contractionChartPoints.length > 0 ? contractionChartPoints[contractionChartPoints.length - 1].value : 0

  const feedingChartPoints = useMemo(
    () => feedingChartMode === 'volume'
      ? getFeedingVolumeChartPoints(feedingRecords, feedingChartRange)
      : getFeedingDurationChartPoints(feedingRecords, feedingChartRange),
    [feedingRecords, feedingChartRange, feedingChartMode],
  )
  const todayFeedingValue = feedingChartPoints.length > 0 ? feedingChartPoints[feedingChartPoints.length - 1].value : 0

  const indicatorColor = activeTab === 'contractions' ? 'bg-duo-orange' : activeTab === 'feeding' ? 'bg-duo-purple' : activeTab === 'diaper' ? 'bg-duo-orange' : 'bg-duo-green'

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white text-center">
          记录
        </h1>
      </StickyHeader>
      <div className="px-4">
      <Tabs.Root defaultValue="kicks" onValueChange={setActiveTab}>
        {/* Tab Switcher — Duo style with bottom border accent */}
        <Tabs.List className="relative flex border-b-2 border-gray-200 dark:border-gray-700/60 mb-6">
          <Tabs.Tab
            value="kicks"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-green outline-none cursor-pointer"
          >
            <IconChildHeadOutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 胎动
          </Tabs.Tab>
          <Tabs.Tab
            value="contractions"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-orange outline-none cursor-pointer"
          >
            <IconTimer2OutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 宫缩
          </Tabs.Tab>
          <Tabs.Tab
            value="feeding"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-purple outline-none cursor-pointer"
          >
            <IconGlassFillDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 喂奶
          </Tabs.Tab>
          <Tabs.Tab
            value="diaper"
            className="flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors text-gray-400 data-[selected]:text-duo-orange outline-none cursor-pointer"
          >
            <IconBabyClothesOutlineDuo18 size={16} className="inline-block align-[-2px] mr-1" /> 尿布
          </Tabs.Tab>
          <Tabs.Indicator className={`absolute bottom-0 left-[var(--active-tab-left)] h-[3px] w-[var(--active-tab-width)] rounded-full -mb-[1px] transition-all duration-200 ease-out ${indicatorColor}`} />
        </Tabs.List>

        {/* Kicks Tab */}
        <Tabs.Panel value="kicks" className="outline-none">
          {kickSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有胎动记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次数胎动吧！</p>
            </div>
          ) : (
            <>
              {/* Trend Chart */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                胎动趋势
              </p>
              <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 mb-6 border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center justify-end mb-3">
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                    <button
                      onClick={() => setChartRange(7)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        chartRange === 7
                          ? 'bg-white dark:bg-gray-700 text-duo-green'
                          : 'text-gray-400'
                      }`}
                    >
                      7天
                    </button>
                    <button
                      onClick={() => setChartRange(30)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        chartRange === 30
                          ? 'bg-white dark:bg-gray-700 text-duo-green'
                          : 'text-gray-400'
                      }`}
                    >
                      30天
                    </button>
                  </div>
                </div>
                <div className="h-40">
                  <Liveline
                    data={chartPoints}
                    value={todayKicks}
                    color="#58CC02"
                    theme={isDark ? 'dark' : 'light'}
                    referenceLine={{ value: settings.goalCount, label: '目标 ' + settings.goalCount }}
                    formatValue={(v) => Math.round(v) + ' 次'}
                    formatTime={(t) => {
                      const d = new Date(t * 1000)
                      return chartRange <= 7
                        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
                        : `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                    window={chartRange * 86400}
                    grid
                    fill
                    scrub
                    exaggerate
                    momentum={false}
                    badge={false}
                    pulse={false}
                  />
                </div>
              </div>

              {/* Session List — grouped card per date */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {kickGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.sessions.reduce((s, ss) => s + ss.kickCount, 0)} 次
                      </span>
                    </div>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.sessions.map((session, idx) => (
                        <Collapsible.Root
                          key={session.id}
                          open={expandedId === session.id}
                          onOpenChange={(open) => setExpandedId(open ? session.id : null)}
                        >
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <Collapsible.Trigger className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer outline-none">
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">
                                {formatTime(session.startedAt)}
                                {session.endedAt && (
                                  <span className="text-gray-400 font-normal">
                                    {' → '}{formatTime(session.endedAt)}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {session.endedAt
                                  ? formatDuration(session.endedAt - session.startedAt)
                                  : '进行中'}
                                {' · '}{session.taps.length} 次点击
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-extrabold text-duo-green">
                                {session.kickCount}
                              </span>
                              {session.goalReached && <span>🎉</span>}
                              {session.endedAt === null ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate('/tools/kick-counter/session/' + session.id)
                                  }}
                                  className="text-xs font-bold text-duo-green"
                                >
                                  继续 →
                                </button>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200 group-data-[panel-open]:rotate-180">
                                  {expandedId === session.id ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </Collapsible.Trigger>

                          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                            <div className="px-4 pb-4">
                              <div className="bg-gray-50 dark:bg-[#0f1629] rounded-xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                  时间线
                                </p>
                                <div className="space-y-2">
                                  {getTimeline(session).map((event, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs">
                                      <span className="text-gray-400 font-mono w-14 shrink-0">
                                        {formatTime(event.time)}
                                      </span>
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                                        event.type === 'kick' ? 'bg-duo-green' : 'bg-duo-orange'
                                      }`} />
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {event.label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => setDeletingSessionId(session.id)}
                                className="w-full mt-3 py-2.5 text-sm font-bold text-duo-red bg-duo-red/10 rounded-xl active:scale-95 transition-transform cursor-pointer"
                              >
                                删除此记录
                              </button>
                            </div>
                          </Collapsible.Panel>
                        </Collapsible.Root>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Tabs.Panel>

        {/* Contractions Tab */}
        <Tabs.Panel value="contractions" className="outline-none">
          {contractionSessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有宫缩记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次宫缩计时吧！</p>
            </div>
          ) : (
            <>
              {/* Contraction Interval Trend Chart */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                宫缩间隔趋势
              </p>
              <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 mb-6 border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center justify-end mb-3">
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                    <button
                      onClick={() => setContractionChartRange(7)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        contractionChartRange === 7
                          ? 'bg-white dark:bg-gray-700 text-duo-orange'
                          : 'text-gray-400'
                      }`}
                    >
                      7天
                    </button>
                    <button
                      onClick={() => setContractionChartRange(30)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        contractionChartRange === 30
                          ? 'bg-white dark:bg-gray-700 text-duo-orange'
                          : 'text-gray-400'
                      }`}
                    >
                      30天
                    </button>
                  </div>
                </div>
                <div className="h-40">
                  <Liveline
                    data={contractionChartPoints}
                    value={todayInterval}
                    color="#FF9600"
                    theme={isDark ? 'dark' : 'light'}
                    referenceLine={{ value: 5, label: '5-1-1 警戒线' }}
                    formatValue={(v) => v > 0 ? v.toFixed(1) + ' 分钟' : '无数据'}
                    formatTime={(t) => {
                      const d = new Date(t * 1000)
                      return contractionChartRange <= 7
                        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
                        : `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                    window={contractionChartRange * 86400}
                    grid
                    fill
                    scrub
                    exaggerate
                    momentum={false}
                    badge={false}
                    pulse={false}
                  />
                </div>
              </div>

              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {contractionGrouped.map(group => (
                  <div key={group.date}>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2">
                      {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                    </h3>
                    {/* Single grouped card with dividers */}
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.sessions.map((session, idx) => (
                        <Collapsible.Root
                          key={session.id}
                          open={expandedId === session.id}
                          onOpenChange={(open) => {
                            setExpandedId(open ? session.id : null)
                            if (open) loadContractions(session.id)
                          }}
                        >
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <Collapsible.Trigger className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer outline-none">
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-white">
                                {formatTime(session.startedAt)}
                                {session.endedAt && (
                                  <span className="text-gray-400 font-normal">
                                    {' → '}{formatTime(session.endedAt)}
                                  </span>
                                )}
                              </p>
                              <div className="flex gap-3 mt-1">
                                {session.avgDuration !== null && (
                                  <span className="text-xs text-gray-400">
                                    时长 {formatMs(session.avgDuration)}
                                  </span>
                                )}
                                {session.avgInterval !== null && (
                                  <span className="text-xs text-gray-400">
                                    间隔 {formatMs(session.avgInterval)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-extrabold text-duo-orange">
                                {session.contractionCount}
                              </span>
                              <span className="text-xs text-gray-400">次</span>
                              {session.alertTriggered && <span>🏥</span>}
                              <span className="text-gray-300 dark:text-gray-600 text-xs">
                                {expandedId === session.id ? '▲' : '▼'}
                              </span>
                            </div>
                          </Collapsible.Trigger>

                          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-all duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
                            {contractions[session.id] && (
                              <div className="px-4 pb-4">
                                <div className="bg-gray-50 dark:bg-[#0f1629] rounded-xl p-4">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    宫缩详情
                                  </p>
                                  <div className="space-y-2">
                                    {contractions[session.id].map((c, i) => (
                                      <div key={c.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                          <span className="text-gray-400 font-mono w-14 shrink-0">
                                            {formatTime(c.startedAt)}
                                          </span>
                                          <span className="w-2 h-2 rounded-full bg-duo-orange shrink-0" />
                                          <span className="text-gray-600 dark:text-gray-400">
                                            第 {i + 1} 次
                                            {c.interval !== null && c.interval > 0 && (
                                              <span className="text-gray-400"> · 间隔 {formatMs(c.interval)}</span>
                                            )}
                                          </span>
                                        </div>
                                        <span className="font-bold text-duo-orange">
                                          {c.duration ? formatMs(c.duration) : '--'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Collapsible.Panel>
                        </Collapsible.Root>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Tabs.Panel>

        {/* Feeding Tab */}
        <Tabs.Panel value="feeding" className="outline-none">
          {feedingRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有喂奶记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">开始第一次喂奶记录吧！</p>
            </div>
          ) : (
            <>
              {/* Feeding Trend Chart */}
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                喂奶趋势
              </p>
              <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 mb-6 border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                    <button
                      onClick={() => setFeedingChartMode('volume')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        feedingChartMode === 'volume'
                          ? 'bg-white dark:bg-gray-700 text-duo-purple'
                          : 'text-gray-400'
                      }`}
                    >
                      奶量
                    </button>
                    <button
                      onClick={() => setFeedingChartMode('duration')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        feedingChartMode === 'duration'
                          ? 'bg-white dark:bg-gray-700 text-duo-purple'
                          : 'text-gray-400'
                      }`}
                    >
                      时长
                    </button>
                  </div>
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                    <button
                      onClick={() => setFeedingChartRange(7)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        feedingChartRange === 7
                          ? 'bg-white dark:bg-gray-700 text-duo-purple'
                          : 'text-gray-400'
                      }`}
                    >
                      7天
                    </button>
                    <button
                      onClick={() => setFeedingChartRange(30)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        feedingChartRange === 30
                          ? 'bg-white dark:bg-gray-700 text-duo-purple'
                          : 'text-gray-400'
                      }`}
                    >
                      30天
                    </button>
                  </div>
                </div>
                <div className="h-40">
                  <Liveline
                    data={feedingChartPoints}
                    value={todayFeedingValue}
                    color="#CE82FF"
                    theme={isDark ? 'dark' : 'light'}
                    formatValue={(v) => feedingChartMode === 'volume'
                      ? (v > 0 ? Math.round(v) + ' ml' : '无数据')
                      : (v > 0 ? v.toFixed(0) + ' 分钟' : '无数据')
                    }
                    formatTime={(t) => {
                      const d = new Date(t * 1000)
                      return feedingChartRange <= 7
                        ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
                        : `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                    window={feedingChartRange * 86400}
                    grid
                    fill
                    scrub
                    exaggerate
                    momentum={false}
                    badge={false}
                    pulse={false}
                  />
                </div>
              </div>

              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {feedingGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.records.length} 次
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.records.map((record, idx) => (
                        <div key={record.id}>
                          {idx > 0 && (
                            <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                          )}
                          <div className="px-4 py-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${getFeedingBgColor(record.type)}`} />
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                  {getFeedingEmoji(record.type)} {getFeedingLabel(record.type)}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {formatTime(record.startedAt)}
                                  {record.endedAt && record.startedAt !== record.endedAt && (
                                    <span className="text-gray-400 font-normal">
                                      {' → '}{formatTime(record.endedAt)}
                                    </span>
                                  )}
                                  {record.duration ? ` · ${formatFeedingDuration(record.duration)}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {record.volumeMl ? (
                                <span className={`text-sm font-extrabold ${getFeedingColor(record.type)}`}>
                                  {record.volumeMl}ml
                                </span>
                              ) : record.duration ? (
                                <span className={`text-sm font-extrabold ${getFeedingColor(record.type)}`}>
                                  {formatFeedingDuration(record.duration)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Tabs.Panel>

        {/* Diaper Tab */}
        <Tabs.Panel value="diaper" className="outline-none">
          {diaperRecords.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-400 dark:text-gray-500 font-bold">还没有换尿布记录</p>
              <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">去换尿布工具开始记录吧！</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                记录列表
              </p>
              <div className="space-y-6">
                {diaperGrouped.map(group => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                        {isSameDay(group.ts, Date.now()) ? '今天' : group.date}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        共 {group.records.length} 次
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
                      {group.records.map((record, idx) => {
                        const colorOpt = getColorOption(record.color)
                        return (
                          <div key={record.id}>
                            {idx > 0 && (
                              <div className="mx-4 border-t border-gray-100 dark:border-gray-700/40" />
                            )}
                            <div className="px-4 py-3.5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{colorOpt.emoji}</span>
                                <div>
                                  <p className="text-sm font-bold text-gray-800 dark:text-white">
                                    {colorOpt.label} · {getConsistencyLabel(record.consistency)}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {formatTime(record.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {colorOpt.alert && (
                                <span className="text-xs font-bold text-duo-red bg-duo-red/10 px-2 py-1 rounded-lg">
                                  建议就医
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Tabs.Panel>
      </Tabs.Root>
      </div>

      {/* Delete Session Confirmation */}
      <AlertDialog.Root open={deletingSessionId !== null} onOpenChange={(open) => { if (!open) setDeletingSessionId(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <AlertDialog.Popup className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#16213e] rounded-t-3xl px-6 pt-5 pb-8 transition-all duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full outline-none z-50">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5" />
            <AlertDialog.Title className="text-lg font-extrabold text-gray-800 dark:text-white text-center mb-2">
              删除这条胎动记录？
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-400 dark:text-gray-500 text-center mb-6">
              删除后无法恢复
            </AlertDialog.Description>
            <div className="flex gap-3">
              <AlertDialog.Close className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform cursor-pointer">
                取消
              </AlertDialog.Close>
              <button
                onClick={handleDeleteSession}
                className="flex-1 py-3.5 bg-duo-red text-white font-bold rounded-2xl border-b-4 border-red-700 active:scale-95 transition-all cursor-pointer"
              >
                删除
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
