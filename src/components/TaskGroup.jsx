import { useState } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import TaskRow from './TaskRow'

export default function TaskGroup({ title, count, tasks, tone = 'default', onStatusChange, onEdit, onDelete, openMenuId, onToggleMenu }) {
  const [open, setOpen] = useState(true)

  const toneStyles = {
    default: 'text-[#475569]',
    danger: 'text-[#dc2626]',
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-visible mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#f1f5f9] rounded-t-xl"
      >
        <ChevronDown
          size={14}
          className={`text-[#94a3b8] transition-transform ${open ? '' : '-rotate-90'}`}
        />
        {tone === 'danger' && <AlertTriangle size={14} className="text-[#dc2626]" />}
        <span className={`text-xs font-semibold uppercase tracking-wide ${toneStyles[tone]}`}>
          {title}
        </span>
        <span className="text-xs text-[#94a3b8] font-mono">· {count}</span>
      </button>

      {open && (
        <div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusChange={(status) => onStatusChange?.(task.id, status)}
              onEdit={() => onEdit?.(task.taskId)}
              onDelete={() => onDelete?.(task.taskId)}
              menuOpen={openMenuId === task.id}
              onToggleMenu={onToggleMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}