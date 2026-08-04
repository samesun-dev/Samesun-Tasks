import { useState, useEffect, useCallback } from 'react'
import { Download, ChevronDown, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
}

const TEAM_DOT = {
  hr: '#0ea5e9',
  sales: '#10b981',
  marketing: '#ec4899',
  growth: '#14b8a6',
  finance: '#8b5cf6',
  ops: '#3b82f6',
}

const STAT_TILES = [
  { key: 'completed', label: 'Completed', text: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { key: 'inProgress', label: 'In progress', text: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { key: 'overdue', label: 'Overdue', text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'notStarted', label: 'Not started', text: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
]

const RANGE_PRESETS = [
  ['week', 'This week'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['all', 'All time'],
  ['custom', 'Custom'],
]

const RANGE_LABELS = { week: 'this week', month: 'this month', year: 'this year', all: 'all time' }

function startOfWeekISO() {
  const d = new Date()
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function startOfMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function startOfYearISO() {
  return `${new Date().getFullYear()}-01-01`
}

function getRangeBounds(preset, customFrom, customTo) {
  const today = todayISO()
  if (preset === 'week') return [startOfWeekISO(), today]
  if (preset === 'month') return [startOfMonthISO(), today]
  if (preset === 'year') return [startOfYearISO(), today]
  if (preset === 'all') return [null, today]
  if (preset === 'custom') return [customFrom || null, customTo || today]
  return [null, today]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dt) {
  return dt ? new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
}

function ReportSection({ title, tone = 'default', items, teams, users, today }) {
  const [open, setOpen] = useState(true)
  if (!items.length) return null

  const toneStyles = {
    default: 'text-[#475569]',
    danger: 'text-[#dc2626]',
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#f1f5f9]"
      >
        <ChevronDown
          size={14}
          className={`text-[#94a3b8] transition-transform ${open ? '' : '-rotate-90'}`}
        />
        {tone === 'danger' && <AlertTriangle size={14} className="text-[#dc2626]" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${toneStyles[tone]}`}>
          {title}
        </span>
        <span className="text-xs text-[#94a3b8] font-mono">· {items.length}</span>
      </button>

      {open && (
        <div>
          {items.map((inst, i) => {
            const task = inst._task
            const team = task ? teams[task.team_id] : null
            const assignedTo = users[task?.assigned_to]
            const completedBy = users[inst.completed_by]
            return (
              <div
                key={inst.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1e293b]">{task?.title ?? '—'}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {team && (
                      <span className="flex items-center gap-1.5 text-xs text-[#475569]">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: TEAM_DOT[team.slug] ?? '#94a3b8' }}
                        />
                        {team.name}
                      </span>
                    )}
                    {assignedTo && <span className="text-xs text-[#94a3b8]">{assignedTo.name.split(' ')[0]}</span>}
                    {task?.end_date && (
                      <span className={`text-xs font-medium ${task.end_date < today ? 'text-[#dc2626]' : 'text-[#94a3b8]'}`}>
                        Due {formatDate(task.end_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {inst.status === 'completed' ? (
                    <>
                      {completedBy && <p className="text-xs font-medium text-[#475569]">{completedBy.name.split(' ')[0]}</p>}
                      {inst.completed_at && <p className="text-[11px] text-[#94a3b8]">{formatTime(inst.completed_at)}</p>}
                    </>
                  ) : (
                    <p className="text-[11px] text-[#94a3b8]">{STATUS_LABELS[inst.status] ?? inst.status}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [teams, setTeams] = useState({})
  const [users, setUsers] = useState({})
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const today = todayISO()

  const [rangeFrom, rangeTo] = getRangeBounds(preset, customFrom, customTo)

  const loadData = useCallback(async (from, to) => {
    setLoading(true)
    const [{ data: teamData }, { data: userData }] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('users').select('id,name,email,team_id'),
    ])
    const teamMap = {}
    teamData?.forEach(t => { teamMap[t.id] = t })
    setTeams(teamMap)
    const userMap = {}
    userData?.forEach(u => { userMap[u.id] = u })
    setUsers(userMap)

    const { data: openData } = await supabase.from('task_instances').select('*').neq('status', 'completed').order('due_date', { ascending: true })
    let completedQuery = supabase.from('task_instances').select('*').eq('status', 'completed').order('completed_at', { ascending: false })
    if (from) completedQuery = completedQuery.gte('completed_at', from)
    if (to) completedQuery = completedQuery.lte('completed_at', to + 'T23:59:59')
    const { data: completedData } = await completedQuery
    const allInstances = [...(openData ?? []), ...(completedData ?? [])]
    if (!allInstances.length) { setInstances([]); setLoading(false); return }
    const taskIds = [...new Set(allInstances.map(i => i.task_id))]
    const { data: taskData } = await supabase.from('tasks').select('*').in('id', taskIds)
    const taskMap = {}
    taskData?.forEach(t => { taskMap[t.id] = t })
    setInstances(allInstances.map(i => ({ ...i, _task: taskMap[i.task_id] })))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (preset === 'custom' && !customFrom && !customTo) return
    loadData(rangeFrom, rangeTo)
  }, [loadData, rangeFrom, rangeTo, preset, customFrom, customTo])

  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().split('T')[0] })()

  const completed = instances.filter(i => i.status === 'completed')
  const inProgress = instances.filter(i => i.status === 'in_progress')
  const overdue = instances.filter(i => i.status !== 'completed' && i._task?.end_date && i._task.end_date < today)
  const dueToday = instances.filter(i => i.status !== 'completed' && i._task?.end_date === today)
  const dueThisWeek = instances.filter(i => i.status !== 'completed' && i._task?.end_date && i._task.end_date > today && i._task.end_date <= weekEnd)
  const notStarted = instances.filter(i => i.status === 'not_started' && (!i._task?.end_date || i._task.end_date >= today))

  const statValues = { completed: completed.length, inProgress: inProgress.length, overdue: overdue.length, notStarted: notStarted.length }

  const teamStats = {}
  Object.values(teams).forEach(t => { teamStats[t.id] = { name: t.name, slug: t.slug, done: 0, total: 0 } })
  instances.forEach(inst => {
    const teamId = inst._task?.team_id
    if (!teamId || !teamStats[teamId]) return
    teamStats[teamId].total++
    if (inst.status === 'completed') teamStats[teamId].done++
  })
  const activeTeamStats = Object.values(teamStats).filter(t => t.total > 0).sort((a, b) => a.name.localeCompare(b.name))

  const rangeLabel = preset === 'custom'
    ? `${rangeFrom ? formatDate(rangeFrom) : 'the beginning'} – ${rangeTo === today ? 'today' : formatDate(rangeTo)}`
    : RANGE_LABELS[preset]

  function exportCSV() {
    const header = 'Task,Team,Status,Assigned To,Completed By,Completed At,Due Date'
    const rows = instances.map(inst => {
      const task = inst._task
      const team = task ? teams[task.team_id] : null
      return `"${task?.title ?? '—'}","${team?.name ?? '—'}","${inst.status}","${users[task?.assigned_to]?.name ?? '—'}","${users[inst.completed_by]?.name ?? '—'}","${inst.completed_at ? new Date(inst.completed_at).toLocaleString('en-GB') : '—'}","${task?.end_date ? formatDate(task.end_date) : '—'}"`
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `samesun-report-${rangeFrom ?? 'all'}-to-${rangeTo}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) {
    return <p className="text-center text-sm text-[#94a3b8] py-10">Loading report…</p>
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#64748b]">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5a623] text-white text-sm font-medium hover:bg-[#e0951a] transition-colors"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {RANGE_PRESETS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === key
                ? 'bg-[#1e293b] text-white'
                : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#93c5fd]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-[#94a3b8] font-medium">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/25 focus:border-[#3b82f6]"
          />
          <label className="text-xs text-[#94a3b8] font-medium">To</label>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            placeholder={today}
            className="px-2.5 py-1.5 rounded-lg border border-[#e2e8f0] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/25 focus:border-[#3b82f6]"
          />
          <span className="text-xs text-[#94a3b8]">leave "To" blank for today onwards</span>
        </div>
      )}

      <p className="text-xs text-[#94a3b8] mb-4">
        Showing completed-task activity for <span className="font-medium text-[#475569]">{rangeLabel}</span> · open tasks always reflect the current backlog
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STAT_TILES.map(tile => (
          <div key={tile.key} className="rounded-xl border p-4 text-center" style={{ background: tile.bg, borderColor: tile.border }}>
            <p style={{ fontFamily: 'var(--font-display)', color: tile.text }} className="text-2xl font-semibold">
              {statValues[tile.key]}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: tile.text }}>{tile.label}</p>
          </div>
        ))}
      </div>

      {activeTeamStats.length > 0 && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-3">By team</p>
          <div className="flex flex-col gap-3">
            {activeTeamStats.map(t => {
              const pct = Math.round((t.done / t.total) * 100)
              const dot = TEAM_DOT[t.slug] ?? '#94a3b8'
              return (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 font-medium text-[#1e293b]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                      {t.name}
                    </span>
                    <span className="text-[#94a3b8]">{t.done}/{t.total} · <span className="font-semibold" style={{ color: dot }}>{pct}%</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dot }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {instances.length === 0 ? (
        <div className="text-center py-14 text-[#94a3b8]">
          <p className="text-sm font-semibold text-[#1e293b]">Nothing to report</p>
          <p className="text-sm mt-1">No task activity in range</p>
        </div>
      ) : (
        <>
          <ReportSection title="Overdue" tone="danger" items={overdue} teams={teams} users={users} today={today} />
          <ReportSection title="Due today" items={dueToday} teams={teams} users={users} today={today} />
          <ReportSection title="Due this week" items={dueThisWeek} teams={teams} users={users} today={today} />
          <ReportSection title="In progress" items={inProgress.filter(i => !overdue.includes(i))} teams={teams} users={users} today={today} />
          <ReportSection title={`Completed (${rangeLabel})`} items={completed} teams={teams} users={users} today={today} />
          <ReportSection title="Not started" items={notStarted} teams={teams} users={users} today={today} />
        </>
      )}
    </div>
  )
}
