import { useState, useEffect, useCallback } from 'react'
import { Download, ChevronDown, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const TEAM_DOT = {
  hr: '#0ea5e9',
  sales: '#10b981',
  marketing: '#ec4899',
  growth: '#14b8a6',
  finance: '#8b5cf6',
  ops: '#3b82f6',
}

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

function plus30ISO() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dt) {
  return dt ? new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
}

function groupByDepartment(items, teams) {
  const groups = {}
  items.forEach(inst => {
    const teamId = inst._task?.team_id ?? null
    const key = teamId ?? '__none'
    if (!groups[key]) groups[key] = { team: teamId ? teams[teamId] : null, items: [] }
    groups[key].items.push(inst)
  })
  return Object.values(groups).sort((a, b) => (a.team?.name ?? 'zzz').localeCompare(b.team?.name ?? 'zzz'))
}

function TaskLine({ inst, users, today, isLast }) {
  const task = inst._task
  const assignedTo = users[task?.assigned_to]
  const completedBy = users[inst.completed_by]
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${isLast ? '' : 'border-b border-[#f1f5f9]'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1e293b]">{task?.title ?? '—'}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
        ) : null}
      </div>
    </div>
  )
}

function DepartmentGroup({ team, items, users, today, bar }) {
  const dot = TEAM_DOT[team?.slug] ?? '#94a3b8'
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between px-4 py-2 bg-[#f8fafc]">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1e293b]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
          {team?.name ?? 'No department'}
          <span className="text-[#94a3b8] font-normal font-mono">· {items.length}</span>
        </span>
        {bar && (
          <span className="text-xs text-[#94a3b8]">
            {bar.done}/{bar.total} · <span className="font-semibold" style={{ color: dot }}>{bar.pct}%</span>
          </span>
        )}
      </div>
      {bar && (
        <div className="h-1 bg-[#f1f5f9] mx-4 mt-1.5 mb-1 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, backgroundColor: dot }} />
        </div>
      )}
      <div>
        {items.map((inst, i) => (
          <TaskLine key={inst.id} inst={inst} users={users} today={today} isLast={i === items.length - 1} />
        ))}
      </div>
    </div>
  )
}

function ReportSection({ title, icon: Icon, tone = 'default', items, teams, users, today, openCountByTeam }) {
  const [open, setOpen] = useState(true)
  if (!items.length) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-4 py-3">
          {Icon && <Icon size={14} className={tone === 'danger' ? 'text-[#dc2626]' : 'text-[#94a3b8]'} />}
          <span className={`text-xs font-semibold uppercase tracking-wide ${tone === 'danger' ? 'text-[#dc2626]' : 'text-[#475569]'}`}>
            {title}
          </span>
          <span className="text-xs text-[#94a3b8]">— nothing here</span>
        </div>
      </div>
    )
  }

  const groups = groupByDepartment(items, teams)
  const toneStyles = { default: 'text-[#475569]', danger: 'text-[#dc2626]' }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#f1f5f9]"
      >
        <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${open ? '' : '-rotate-90'}`} />
        {Icon && <Icon size={14} className={tone === 'danger' ? 'text-[#dc2626]' : 'text-[#94a3b8]'} />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${toneStyles[tone]}`}>{title}</span>
        <span className="text-xs text-[#94a3b8] font-mono">· {items.length}</span>
      </button>

      {open && (
        <div className="py-2">
          {groups.map(g => {
            const teamId = g.team?.id
            const bar = openCountByTeam && teamId
              ? (() => {
                  const done = g.items.length
                  const total = done + (openCountByTeam[teamId] ?? 0)
                  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
                })()
              : null
            return <DepartmentGroup key={teamId ?? '__none'} team={g.team} items={g.items} users={users} today={today} bar={bar} />
          })}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [teams, setTeams] = useState({})
  const [users, setUsers] = useState({})
  const [openInstances, setOpenInstances] = useState([])
  const [completedInstances, setCompletedInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const today = todayISO()
  const in30 = plus30ISO()

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
    const taskIds = [...new Set(allInstances.map(i => i.task_id))]
    const taskMap = {}
    if (taskIds.length) {
      const { data: taskData } = await supabase.from('tasks').select('*').in('id', taskIds)
      taskData?.forEach(t => { taskMap[t.id] = t })
    }

    setOpenInstances((openData ?? []).map(i => ({ ...i, _task: taskMap[i.task_id] })))
    setCompletedInstances((completedData ?? []).map(i => ({ ...i, _task: taskMap[i.task_id] })))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (preset === 'custom' && !customFrom && !customTo) return
    loadData(rangeFrom, rangeTo)
  }, [loadData, rangeFrom, rangeTo, preset, customFrom, customTo])

  const overdue = openInstances.filter(i => i._task?.end_date && i._task.end_date < today)
  const comingUp = openInstances.filter(i => i._task?.end_date && i._task.end_date >= today && i._task.end_date <= in30)

  const openCountByTeam = {}
  openInstances.forEach(i => {
    const teamId = i._task?.team_id
    if (!teamId) return
    openCountByTeam[teamId] = (openCountByTeam[teamId] ?? 0) + 1
  })

  const rangeLabel = preset === 'custom'
    ? `${rangeFrom ? formatDate(rangeFrom) : 'the beginning'} – ${rangeTo === today ? 'today' : formatDate(rangeTo)}`
    : RANGE_LABELS[preset]

  function exportCSV() {
    const allInstances = [...completedInstances, ...overdue, ...comingUp]
    const header = 'Task,Team,Status,Assigned To,Completed By,Completed At,Due Date'
    const rows = allInstances.map(inst => {
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

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border p-4 text-center" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <p style={{ fontFamily: 'var(--font-display)', color: '#059669' }} className="text-2xl font-semibold">{completedInstances.length}</p>
          <p className="text-xs font-medium mt-1" style={{ color: '#059669' }}>Completed ({rangeLabel})</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <p style={{ fontFamily: 'var(--font-display)', color: '#dc2626' }} className="text-2xl font-semibold">{overdue.length}</p>
          <p className="text-xs font-medium mt-1" style={{ color: '#dc2626' }}>Overdue</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <p style={{ fontFamily: 'var(--font-display)', color: '#1d4ed8' }} className="text-2xl font-semibold">{comingUp.length}</p>
          <p className="text-xs font-medium mt-1" style={{ color: '#1d4ed8' }}>Coming up (30 days)</p>
        </div>
      </div>

      <ReportSection title="Overdue" icon={AlertTriangle} tone="danger" items={overdue} teams={teams} users={users} today={today} />

      <ReportSection title="Coming up in the next 30 days" icon={Clock} items={comingUp} teams={teams} users={users} today={today} />

      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#f1f5f9]">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#475569]">
            <CheckCircle2 size={14} className="text-[#94a3b8]" />
            Completed
            <span className="text-[#94a3b8] font-mono normal-case">· {completedInstances.length}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {RANGE_PRESETS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  preset === key
                    ? 'bg-[#1e293b] text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#93c5fd]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f1f5f9]">
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

        {completedInstances.length === 0 ? (
          <p className="text-center text-sm text-[#94a3b8] py-8">No tasks completed in this window</p>
        ) : (
          <div className="py-2">
            {groupByDepartment(completedInstances, teams).map(g => {
              const teamId = g.team?.id
              const done = g.items.length
              const total = teamId ? done + (openCountByTeam[teamId] ?? 0) : done
              const pct = total ? Math.round((done / total) * 100) : 0
              return (
                <DepartmentGroup
                  key={teamId ?? '__none'}
                  team={g.team}
                  items={g.items}
                  users={users}
                  today={today}
                  bar={teamId ? { done, total, pct } : null}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
