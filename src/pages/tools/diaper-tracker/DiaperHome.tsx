import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StickyHeader from '../../../components/StickyHeader.tsx'
import { db, type DiaperRecord, type PoopColor, type PoopConsistency } from '../../../lib/db.ts'
import { formatTime, isSameDay } from '../../../lib/time.ts'
import { poopColors, poopConsistencies, getColorOption, getConsistencyLabel } from '../../../lib/diaper-helpers.ts'
import { sileo } from 'sileo'

export default function DiaperHome() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<DiaperRecord[]>([])
  const [selectedColor, setSelectedColor] = useState<PoopColor | null>(null)
  const [selectedConsistency, setSelectedConsistency] = useState<PoopConsistency>('soft')

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    const all = await db.diaperRecords.orderBy('createdAt').reverse().toArray()
    setRecords(all)
  }

  async function handleSave() {
    if (!selectedColor) return

    const colorOpt = getColorOption(selectedColor)
    const record: DiaperRecord = {
      id: crypto.randomUUID(),
      color: selectedColor,
      consistency: selectedConsistency,
      notes: null,
      createdAt: Date.now(),
    }
    await db.diaperRecords.put(record)
    setRecords(prev => [record, ...prev])
    setSelectedColor(null)
    setSelectedConsistency('soft')

    if (colorOpt.alert) {
      sileo.info({ title: `${colorOpt.emoji} ${colorOpt.label}便便已记录`, description: '建议咨询医生' })
    } else {
      sileo.success({ title: '💩 已记录' })
    }
  }

  const todayRecords = records.filter(r => isSameDay(r.createdAt, Date.now()))
  const recentRecords = records.slice(0, 15)

  return (
    <div className="max-w-lg mx-auto pb-4">
      <StickyHeader>
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 pr-2"
          >
            ← 返回
          </button>
          <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">
            换尿布
          </h1>
        </div>
      </StickyHeader>
      <div className="px-4">

      {/* Today summary */}
      <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60 mb-4">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          今日统计
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-duo-orange">{todayRecords.length}</p>
            <p className="text-xs text-gray-400 mt-1">次换尿布</p>
          </div>
          {todayRecords.length > 0 && (
            <div className="text-center">
              <div className="flex gap-1 justify-center">
                {[...new Set(todayRecords.map(r => r.color))].map(c => (
                  <span key={c} className="text-lg">{getColorOption(c).emoji}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">颜色分布</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick log card */}
      <div className="bg-white dark:bg-[#16213e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60 mb-6">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          快速记录
        </p>

        {/* Color picker */}
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">便便颜色</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {poopColors.map(color => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all active:scale-95 ${
                selectedColor === color.value
                  ? 'bg-duo-orange/15 ring-2 ring-duo-orange'
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <span className="text-lg">{color.emoji}</span>
              <span className={`text-sm font-bold ${
                selectedColor === color.value ? 'text-duo-orange' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {color.label}
              </span>
              {color.alert && (
                <span className="text-[9px] font-bold text-duo-red bg-duo-red/10 px-1 py-0.5 rounded">⚠️</span>
              )}
            </button>
          ))}
        </div>

        {/* Consistency picker */}
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">性状</p>
        <div className="flex gap-2 mb-5">
          {poopConsistencies.map(c => (
            <button
              key={c.value}
              onClick={() => setSelectedConsistency(c.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                selectedConsistency === c.value
                  ? 'bg-duo-orange text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!selectedColor}
          className={`w-full py-3.5 rounded-2xl text-lg font-extrabold transition-all active:scale-95 ${
            selectedColor
              ? 'bg-duo-orange text-white border-b-4 border-amber-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
          }`}
        >
          💩 记录
        </button>
      </div>

      {/* Recent records */}
      {recentRecords.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            最近记录
          </p>
          <div className="bg-white dark:bg-[#16213e] rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            {recentRecords.map((record, idx) => {
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
                          {isSameDay(record.createdAt, Date.now()) && ' · 今天'}
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
        </>
      )}

      {records.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">👶</div>
          <p className="text-gray-400 dark:text-gray-500 font-bold">还没有换尿布记录</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">选择便便颜色和性状后点击记录</p>
        </div>
      )}
      </div>
    </div>
  )
}
