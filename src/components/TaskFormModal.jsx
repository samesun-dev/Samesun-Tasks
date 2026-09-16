import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CITY_OPTIONS } from '../lib/constants'

const inputClass = 'w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/25 focus:border-[#3b82f6] transition-all'
const labelClass = 'block text-xs font-medium text-[#94a3b8] mb-1.5'

const STATUS_OPTIONS = [
  ['not_started', 'Not started'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'], 
]

const FREQUENCY_OPTIONS = [
  ['', 'One-off'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['biweekly', 'Bi-weekly'],
  ['monthly', 'Monthly'],
  ['every_2_months', 'Every 2 months'],
  ['every_3_months', 'Every 3 months'],
  ['annually', 'Annually'],
]

export default function TaskFormModal({ mode, task, teams, users, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'not_started',
    team_id: task?.team_id ?? '',
    assigned_to: task?.assigned_to ?? '',
    frequency: task?.frequency ?? '',
    location: task?.location ?? '',
    end_date: task?.end_date ?? '',
    reminder_days_before: task?.reminder_days_before ?? 2,
    is_private: task?.is_private ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [watchers, setWatchers] = useState([])
  const [addingWatcher, setAddingWatcher] = useState(false)
  const [watcherError, setWatcherError] = useState('')
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const loadWatchers = useCallback(async () => {
    if (mode !== 'edit' || !task?.id) return
    const { data } = await supabase.from('task_watchers').select('id, user_id').eq('task_id', task.id)
    setWatchers(data ?? [])
  }, [mode, task?.id])

  useEffect(() => { loadWatchers() }, [loadWatchers])

  async function handleAddWatcher(userId) {
    setAddingWatcher(false)
    if (!userId) return
    setWatcherError('')
    const { error } = await supabase.from('task_watchers').insert({ task_id: task.id, user_id: userId })
    if (error) { setWatcherError(error.message); return }
    loadWatchers()
  }

  async function handleRemoveWatcher(id) {
    setWatcherError('')
    const { error } = await supabase.from('task_watchers').delete().eq('id', id)
    if (error) { setWatcherError(error.message); return }
    loadWatchers()
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      reminder_days_before: Number.isFinite(form.reminder_days_before) ? form.reminder_days_before : 2,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[#e2e8f0] shadow-xl max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: 'var(--font-display)' }} className="text-base font-semibold text-[#1e293b]">
            {mode === 'edit' ? 'Edit task' : 'Add task'}
          </p>
          {mode === 'edit' && (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#94a3b8]">Sure?</span>
                <button onClick={onDelete} className="text-[#dc2626] font-semibold">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[#94a3b8]">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs font-medium text-[#dc2626]">
                Delete
              </button>
            )
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text" value={form.title} onChange={e => update('title', e.target.value)}
              placeholder="What needs doing?" className={inputClass} autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description} onChange={e => update('description', e.target.value)}
              placeholder="Any extra detail…" rows={2} className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => update('status', e.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Department</label>
            <select value={form.team_id} onChange={e => update('team_id', e.target.value)} className={inputClass}>
              <option value="">No team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Assign to</label>
            <select value={form.assigned_to} onChange={e => update('assigned_to', e.target.value)} className={inputClass}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Repeats</label>
            <select value={form.frequency} onChange={e => update('frequency', e.target.value)} className={inputClass}>
              {FREQUENCY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Location</label>
            <select value={form.location} onChange={e => update('location', e.target.value)} className={inputClass}>
              <option value="">No location</option>
              {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Due date</label>
            <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} className={inputClass} />
          </div>

          {form.end_date && (
            <div>
              <label className={labelClass}>Remind me this many days before</label>
              <input
                type="number" min={0} max={60} value={form.reminder_days_before}
                onChange={e => update('reminder_days_before', e.target.value === '' ? '' : Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox" checked={form.is_private} onChange={e => update('is_private', e.target.checked)}
              className="w-4 h-4 accent-[#f5a623]"
            />
            <span className="text-sm text-[#64748b]">Private — only visible to me</span>
          </label>

          {mode === 'edit' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`${labelClass} mb-0`}>Watchers</label>
                {addingWatcher ? (
                  <select
                    autoFocus defaultValue=""
                    onChange={e => handleAddWatcher(e.target.value)}
                    onBlur={() => setAddingWatcher(false)}
                    className="px-2 py-1 rounded-md border border-[#e2e8f0] text-xs text-[#1e293b]"
                  >
                    <option value="" disabled>Choose a person…</option>
                    {users.filter(u => !watchers.some(w => w.user_id === u.id)).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setAddingWatcher(true)}
                    className="text-xs font-medium text-[#3b82f6] hover:underline"
                  >
                    + Add watcher
                  </button>
                )}
              </div>
              {watchers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {watchers.map(w => {
                    const u = users.find(u => u.id === w.user_id)
                    if (!u) return null
                    return (
                      <span key={w.id} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-full pl-2.5 pr-1.5 py-0.5">
                        {u.name}
                        <button onClick={() => handleRemoveWatcher(w.id)} title="Remove" className="text-[#94a3b8] hover:text-[#dc2626] leading-none">×</button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#94a3b8]">Nobody's watching this task specifically.</p>
              )}
              <p className="text-[11px] text-[#94a3b8] mt-1">Watchers get copied on this task's overdue / due-soon emails, on top of the assignee.</p>
              {watcherError && <p className="text-xs text-[#dc2626] mt-1">{watcherError}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#64748b] hover:bg-[#f8fafc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim() || saving}
            className="flex-1 py-2.5 rounded-lg bg-[#f5a623] text-white text-sm font-semibold hover:bg-[#e0951a] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  )
}
