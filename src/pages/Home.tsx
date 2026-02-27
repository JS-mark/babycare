import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChildHeadOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconBabyClothesOutlineDuo18 } from 'nucleo-ui-outline-duo-18'
import { IconGlassFillDuo18 } from 'nucleo-ui-fill-duo-18'
import { Liveline } from 'liveline'
import { db, type KickSession, type FeedingRecord } from '../lib/db.ts'
import { getDaysUntilDue, getWeeksPregnant, getSettings } from '../lib/settings.ts'
import { isSameDay } from '../lib/time.ts'
import { formatTimeSinceLastFeed } from '../lib/feeding-helpers.ts'
import { getOrderedTools } from '../lib/tools.tsx'
import { getChartPoints } from './history-helpers.ts'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息哦'
  if (hour < 9) return '早上好！新的一天开始啦'
  if (hour < 12) return '上午好！今天感觉怎么样？'
  if (hour < 14) return '中午好！记得吃饭哦'
  if (hour < 18) return '下午好！宝宝活跃吗？'
  return '晚上好！今天辛苦了'
}

function formatDueDate(days: number): string {
  if (days > 0) return `${days}天`
  if (days === 0) return '今天！'
  return `+${Math.abs(days)}天`
}

export default function Home() {
  const navigate = useNavigate()
  const [kickSessions, setKickSessions] = useState<KickSession[]>([])
  const [todayKicks, setTodayKicks] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lastFeedAt, setLastFeedAt] = useState<number | null>(null)
  const [todayDiapers, setTodayDiapers] = useState(0)
  const [activeKickSession, setActiveKickSession] = useState<KickSession | null>(null)
  const daysUntilDue = getDaysUntilDue()
  const weeksPregnant = getWeeksPregnant()
  const greeting = getGreeting()
  const tools = getOrderedTools()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const sessions: KickSession[] = await db.sessions.orderBy('startedAt').reverse().toArray()
    setKickSessions(sessions)
    const today = sessions.filter(s => isSameDay(s.startedAt, Date.now()))
    setTodayKicks(today.reduce((sum, s) => sum + s.kickCount, 0))
    setActiveKickSession(sessions.find(s => s.endedAt === null) ?? null)

    let currentStreak = 0
    const now = Date.now()
    const dayMs = 86400000
    for (let i = 0; i < 365; i++) {
      const dayStart = now - i * dayMs
      const hasSession = sessions.some(s => isSameDay(s.startedAt, dayStart))
      if (hasSession) {
        currentStreak++
      } else if (i > 0) {
        break
      }
    }
    setStreak(currentStreak)

    // Load last feeding
    const feeds: FeedingRecord[] = await db.feedingRecords.orderBy('startedAt').reverse().limit(1).toArray()
    if (feeds.length > 0) {
      setLastFeedAt(feeds[0].startedAt)
    }

    // Load today's diaper count
    const allDiapers = await db.diaperRecords.orderBy('createdAt').reverse().toArray()
    setTodayDiapers(allDiapers.filter(r => isSameDay(r.createdAt, Date.now())).length)
  }

  const settings = getSettings()
  const isDark = document.documentElement.classList.contains('dark')
  const weeklyChartPoints = useMemo(() => getChartPoints(kickSessions, 7), [kickSessions])

  return (
    <div className="pb-4">
      {/* Hero Banner — full bleed */}
      <div className="bg-gradient-to-b from-duo-green/15 to-transparent dark:from-duo-green/10 dark:to-transparent pb-10" style={{ paddingTop: 'calc(var(--safe-area-top) + 2rem)' }}>
        <div className="flex flex-col items-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 mb-3 rounded-full overflow-hidden ring-4 ring-duo-green/20 dark:ring-duo-green/15 animate-float">
            <img
              src={`${import.meta.env.BASE_URL}mascot.png`}
              alt="宝宝助手"
              className="w-full h-full object-cover scale-135"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white">
            宝宝助手
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {greeting}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Overview Stats — single panel with 3 columns */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            概览
          </p>
          {/* Due date — featured pill */}
          {daysUntilDue !== null && (
            <div className={`flex items-center justify-between rounded-2xl px-5 py-3.5 mb-3 ${daysUntilDue <= 0
              ? 'bg-duo-orange/10 dark:bg-duo-orange/15'
              : 'bg-duo-purple/10 dark:bg-duo-purple/15'
              }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">预产期倒计时</p>
                  {weeksPregnant !== null && (
                    <p className="text-[10px] font-bold mt-0.5 text-gray-400 dark:text-gray-500">
                      孕 {weeksPregnant} 周
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-2xl font-extrabold ${daysUntilDue <= 0 ? 'text-duo-orange' : 'text-duo-purple'}`}>
                {formatDueDate(daysUntilDue)}
              </span>
            </div>
          )}

          {/* Small stat pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-duo-orange/10 dark:bg-duo-orange/15 rounded-full px-3.5 py-2">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-extrabold text-duo-orange">{streak}</span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">连续</span>
            </div>
            <div className="flex items-center gap-1.5 bg-duo-green/10 dark:bg-duo-green/15 rounded-full px-3.5 py-2">
              <IconChildHeadOutlineDuo18 size={15} className="text-duo-green" />
              <span className="text-sm font-extrabold text-duo-green">{todayKicks}</span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">今日胎动</span>
            </div>
            {lastFeedAt && (
              <div className="flex items-center gap-1.5 bg-duo-purple/10 dark:bg-duo-purple/15 rounded-full px-3.5 py-2">
                <IconGlassFillDuo18 size={15} className="text-duo-purple" />
                <span className="text-sm font-extrabold text-duo-purple">{formatTimeSinceLastFeed(lastFeedAt)}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">距上次喂奶</span>
              </div>
            )}
            {todayDiapers > 0 && (
              <div className="flex items-center gap-1.5 bg-duo-orange/10 dark:bg-duo-orange/15 rounded-full px-3.5 py-2">
                <IconBabyClothesOutlineDuo18 size={15} className="text-duo-orange" />
                <span className="text-sm font-extrabold text-duo-orange">{todayDiapers}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">今日换尿布</span>
              </div>
            )}
          </div>

          {/* Mini Weekly Kick Sparkline */}
          {kickSessions.length > 0 && (
            <div className="mt-3 bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">本周胎动</p>
                <button
                  onClick={() => navigate('/history')}
                  className="text-[10px] font-bold text-duo-green"
                >
                  查看详情 →
                </button>
              </div>
              <div className="h-16">
                <Liveline
                  data={weeklyChartPoints}
                  value={todayKicks}
                  color="#58CC02"
                  theme={isDark ? 'dark' : 'light'}
                  referenceLine={{ value: settings.goalCount, label: '目标' }}
                  formatValue={(v) => Math.round(v) + ' 次'}
                  formatTime={(t) => {
                    const d = new Date(t * 1000)
                    return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
                  }}
                  window={7 * 86400}
                  grid={false}
                  fill
                  scrub={false}
                  exaggerate
                  momentum={false}
                  badge={false}
                  pulse={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active Kick Session Banner */}
        {activeKickSession && (
          <button
            onClick={() => navigate('/tools/kick-counter/session/' + activeKickSession.id)}
            className="w-full flex items-center gap-3 bg-duo-green/10 dark:bg-duo-green/15 rounded-2xl px-5 py-4 mb-6 active:scale-[0.98] transition-transform"
          >
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-duo-green opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-duo-green" />
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                胎动记录中 · 点击继续
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                已记录 {activeKickSession.kickCount} 次胎动
              </p>
            </div>
            <span className="text-xl font-extrabold text-duo-green">
              {activeKickSession.kickCount}
            </span>
            <span className="text-gray-400 text-sm">→</span>
          </button>
        )}

        {/* Tool Cards Grid */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            工具
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => tool.available && navigate(tool.path)}
                className={`rounded-2xl py-5 px-4 min-h-[7.5rem] flex flex-col items-center justify-center text-center transition-all duration-150 ${tool.available
                  ? 'bg-white dark:bg-[#16213e] border border-gray-200 dark:border-gray-700/60 active:scale-[0.96]'
                  : 'bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700 opacity-40'
                  }`}
              >
                {!tool.available && (
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full mb-1">
                    即将推出
                  </span>
                )}
                <div className="mb-2">{tool.icon}</div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">
                  {tool.title}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6 mb-4 px-6">
          本应用仅为记录工具，不提供医学建议。如有异常请咨询医生。
        </p>
      </div>
    </div>
  )
}
