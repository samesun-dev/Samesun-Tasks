import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import TaskGroup from './TaskGroup'
import FilterBar from './FilterBar'
import TaskFormModal from './TaskFormModal'

const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
}

const CITY_OPTIONS = [
  'Toronto', 'Montreal', 'Vancouver', 'Guesthouse Van', 'Banff',
  'Ocean Beach', 'Hollywood', 'San Francisco', 'Venice Beach',
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const GROUP_DEFS = [
  ['overdue', 'Overdue', 'danger'],
  ['today', 'Due today', 'default'],
  ['week', 'Due this week', 'default'],
  ['month', 'Due this month', 'default'],
  ['later', 'Later', 'default'],
  ['noDueDate', 'No due date', 'default'],
]

export default function TasksPage({ user }) {
  const [department, setDepartment] = useState(null)
  const [city, setCity] = useState(null)
  const [teams, setTeams] = useState({})
  const [users, setUsers] = useState({})
  const [instances, setInstances] = useState([])
  const [tasks, setTasks] = useState({})
  const [loading, setLoading] = useState(true)
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const today = todayISO()

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: teamData }, { data: userData }, { data: instanceData }] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('users').select('id,name,email,team_id'),
      supabase.from('task_instances').select('*').neq('status', 'completed').order('due_date', { ascending: true }),
    ])
    const teamMap = {}
    teamData?.forEach(t => { teamMap[t.id] = t })
    setTeams(teamMap)
    const userMap = {}
    userData?.forEach(u => { userMap[u.id] = u })
    setUsers(userMap)

    if (!instanceData?.length) {
      setInstances([])
      setTasks({})
      setLoading(false)
      return
    }
    const taskIds = [...new Set(instanceData.map(i => i.task_id))]
    const { data: taskData } = await supabase.from('tasks').select('*').in('id', taskIds)
    const taskMap = {}
    taskData?.forEach(t => { taskMap[t.id] = t })
    setTasks(taskMap)
    setInstances(instanceData)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleStatusChange(instanceId, status) {
    if (status === 'completed') {
      await supabase.from('task_instances').update({
        status: 'completed',
        completed_by: user.id,
        completed_at: new Date().toISOString(),
      }).eq('id', instanceId)
    } else {
      await supabase.from('task_instances').update({ status }).eq('id', instanceId)
    }
    loadData()
  }

  async function handleAddTask(form) {
    const { data: newTask } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      team_id: form.team_id || null,
      type: form.frequency ? 'recurring' : 'one_off',
      frequency: form.frequency || null,
      location: form.location || null,
      is_private: form.is_private,
      assigned_to: form.assigned_to || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      created_by: user.id,
      is_active: true,
    }).select().single()
    if (newTask) {
      await supabase.from('task_instances').insert({ task_id: newTask.id, status: 'not_started', due_date: today })
    }
    setShowAddForm(false)
    loadData()
  }

  async function handleEditTask(form) {
    await supabase.from('tasks').update({
      title: form.title,
      description: form.description || null,
      team_id: form.team_id || null,
      location: form.location || null,
      assigned_to: form.assigned_to || null,
      frequency: form.frequency || null,
      type: form.frequency ? 'recurring' : 'one_off',
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      is_private: form.is_private,
    }).eq('id', editingTaskId)
    setEditingTaskId(null)
    loadData()
  }

  async function handleDeleteTask() {
    await supabase.from('tasks').update({ is_active: false }).eq('id', editingTaskId)
    setEditingTaskId(null)
    loadData()
  }

  async function handleDeleteFromMenu(taskId) {
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId)
    loadData()
  }

  useEffect(() => {
    supabase.from('task_instances').select('id', { count: 'exact' })
      .eq('status', 'completed').gte('completed_at', today + 'T00:00:00')
      .then(({ count }) => setTodayCompleted(count ?? 0))
  }, [instances, today])

  const departmentOptions = Object.values(teams).map(t => t.name).sort()

  const filtered = instances.filter(inst => {
    const task = tasks[inst.task_id]
    if (!task) return false
    if (task.is_private && task.created_by !== user.id) return false
    if (department) {
      const team = teams[task.team_id]
      if (team?.name !== department) return false
    }
    if (city) {
      if (!task.location || !task.location.toLowerCase().includes(city.toLowerCase())) return false
    }
    return true
  })

  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().split('T')[0] })()
  const monthEnd = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0] })()
  function taskEndDate(inst) { return tasks[inst.task_id]?.end_date ?? null }

  const groups = {
    overdue: filtered.filter(i => { const e = taskEndDate(i); return e && e < today }),
    today: filtered.filter(i => { const e = taskEndDate(i); return e === today }),
    week: filtered.filter(i => { const e = taskEndDate(i); return e && e > today && e <= weekEnd }),
    month: filtered.filter(i => { const e = taskEndDate(i); return e && e > weekEnd && e <= monthEnd }),
    later: filtered.filter(i => { const e = taskEndDate(i); return e && e > monthEnd }),
    noDueDate: filtered.filter(i => { const e = taskEndDate(i); return !e }),
  }

  function toRowTask(inst, groupKey) {
    const task = tasks[inst.task_id]
    const team = teams[task.team_id]
    return {
      id: inst.id,
      taskId: task.id,
      name: task.title,
      subtitle: task.description || '',
      category: team?.name ?? '',
      frequency: task.frequency ?? '',
      dueDate: task.end_date ? formatDate(task.end_date) : 'no date',
      statusLabel: STATUS_LABELS[inst.status] ?? inst.status,
      status: groupKey === 'overdue' ? 'overdue' : 'pending',
      workStatus: inst.status ?? 'not_started',
    }
  }

  const totalToday = filtered.length + todayCompleted
  const pct = totalToday ? Math.round((todayCompleted / totalToday) * 100) : 0
  const overdueCount = groups.overdue.length
  const editingTask = editingTaskId ? tasks[editingTaskId] : null

  return (
    <div className="max-w-4xl">
      <div className="bg-white border border-[#e2e8f0] rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-[#1e293b] font-medium">
            {todayCompleted} of {totalToday} tasks completed today
          </p>
          {overdueCount > 0 && <p className="text-xs text-[#dc2626] mt-0.5">{overdueCount} overdue</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-lg font-semibold text-[#3b82f6]"
          >
            {pct}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <FilterBar
          department={department} setDepartment={setDepartment}
          city={city} setCity={setCity}
          departmentOptions={departmentOptions}
          cityOptions={CITY_OPTIONS}
        />

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5a623] text-white text-sm font-medium hover:bg-[#e0951a] transition-colors"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#94a3b8] py-10">Loading tasks…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-[#94a3b8]">
          <p className="text-sm font-semibold text-[#1e293b]">All clear!</p>
          <p className="text-sm mt-1">No open tasks</p>
        </div>
      ) : (
        GROUP_DEFS.map(([key, label, tone]) => {
          const groupItems = groups[key]
          if (!groupItems.length) return null
          return (
            <TaskGroup
              key={key}
              title={label}
              count={groupItems.length}
              tasks={groupItems.map(i => toRowTask(i, key))}
              tone={tone}
              onStatusChange={handleStatusChange}
              onEdit={setEditingTaskId}
              onDelete={handleDeleteFromMenu}
              openMenuId={openMenuId}
              onToggleMenu={setOpenMenuId}
            />
          )
        })
      )}

      {showAddForm && (
        <TaskFormModal
          mode="add"
          teams={Object.values(teams)}
          users={Object.values(users)}
          onSave={handleAddTask}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingTask && (
        <TaskFormModal
          mode="edit"
          task={editingTask}
          teams={Object.values(teams)}
          users={Object.values(users)}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          onCancel={() => setEditingTaskId(null)}
        />
      )}
    </div>
  )
}