import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Circle, CheckCircle2, ChevronRight, MoreHorizontal } from 'lucide-react'

const CATEGORY_DOT = {
  Finance: '#8b5cf6',
  Operations: '#3b82f6',
  Sales: '#10b981',
  Marketing: '#ec4899',
  HR: '#0ea5e9',
}

const STATUS_CHOICES = [
  { value: 'not_started', label: 'Not started', dot: '#cbd5e1' },
  { value: 'in_progress', label: 'In progress', dot: '#f5a623' },
  { value: 'completed', label: 'Completed', dot: '#10b981' },
]

export default function TaskRow({ task, onStatusChange, onEdit, onDelete, menuOpen, onToggleMenu }) {
  const [expanded, setExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 })
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 })
  const [updating, setUpdating] = useState(false)
  const buttonRef = useRef(null)
  const menuButtonRef = useRef(null)
  const pickerRef = useRef(null)
  const menuRef = useRef(null)
  const isOverdue = task.status === 'overdue'
  const currentStatus = task.workStatus ?? 'not_started'

  useEffect(() => {
    if (!pickerOpen && !menuOpen) return
    function handleOutside(e) {
      if (pickerOpen) {
        if (buttonRef.current?.contains(e.target)) return
        if (pickerRef.current?.contains(e.target)) return
        setPickerOpen(false)
      }
      if (menuOpen) {
        if (menuButtonRef.current?.contains(e.target)) return
        if (menuRef.current?.contains(e.target)) return
        onToggleMenu?.(null)
      }
    }
    function handleReposition() {
      setPickerOpen(false)
      if (menuOpen) onToggleMenu?.(null)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [pickerOpen, menuOpen, onToggleMenu])

  function togglePicker(e) {
    e.stopPropagation()
    if (updating) return
    if (menuOpen) onToggleMenu?.(null)
    if (!pickerOpen) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPickerCoords({ top: rect.bottom + 4, left: rect.left })
    }
    setPickerOpen(!pickerOpen)
  }

  function toggleMenu(e) {
    e.stopPropagation()
    setPickerOpen(false)
    if (!menuOpen) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      setMenuCoords({ top: rect.bottom + 4, left: rect.right - 144 })
    }
    onToggleMenu?.(menuOpen ? null : task.id)
  }

  async function handleSelect(e, value) {
    e.stopPropagation()
    setPickerOpen(false)
    if (value === currentStatus || updating) return
    setUpdating(true)
    await onStatusChange?.(value)
  }

  function handleEditClick(e) {
    e.stopPropagation()
    onToggleMenu?.(null)
    onEdit?.()
  }

  function handleDeleteClick(e) {
    e.stopPropagation()
    onToggleMenu?.(null)
    if (window.confirm(`Delete "${task.name}"? This can't be undone.`)) {
      onDelete?.()
    }
  }

  const circleDot = STATUS_CHOICES.find(s => s.value === currentStatus)?.dot

  return (
    <div
      className={`group border-b border-[#f1f5f9] last:border-0 ${
        isOverdue ? 'border-l-2 border-l-[#dc2626]' : ''
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="relative mt-0.5 shrink-0">
          <button
            ref={buttonRef}
            onClick={togglePicker}
            disabled={updating}
            className="text-[#cbd5e1] hover:text-[#3b82f6] transition-colors disabled:cursor-default"
          >
            {updating || currentStatus === 'completed' ? (
              <CheckCircle2 size={18} className="text-[#10b981]" />
            ) : currentStatus === 'not_started' ? (
              <Circle size={18} />
            ) : (
              <span
                className="flex items-center justify-center w-[18px] h-[18px] rounded-full border-2"
                style={{ borderColor: circleDot }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: circleDot }} />
              </span>
            )}
          </button>

          {pickerOpen && createPortal(
            <div
              ref={pickerRef}
              style={{ position: 'fixed', top: pickerCoords.top, left: pickerCoords.left }}
              className="w-36 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 z-50"
            >
              {STATUS_CHOICES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => handleSelect(e, opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-[#f8fafc] ${
                    currentStatus === opt.value ? 'font-semibold text-[#1e293b]' : 'text-[#475569]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                  {opt.label}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-left"
            >
              <ChevronRight
                size={14}
                className={`text-[#94a3b8] transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
              />
              <span className="font-medium text-sm text-[#1e293b]">{task.name}</span>
            </button>
          </div>

          {expanded && (
            <div className="mt-2 ml-5 flex flex-col gap-2">
              <p className="text-sm text-[#64748b]">{task.subtitle}</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-[#475569]">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_DOT[task.category] ?? '#94a3b8' }}
                  />
                  {task.category}
                </span>
                <span className="text-xs text-[#94a3b8] font-mono">{task.frequency}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-xs font-medium ${isOverdue ? 'text-[#dc2626]' : 'text-[#475569]'}`}>
              Due {task.dueDate}
            </p>
            <p className="text-[11px] text-[#94a3b8]">{task.statusLabel}</p>
          </div>

          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={toggleMenu}
              className={`p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569] transition-all ${
                menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuCoords.top, left: menuCoords.left }}
                className="w-36 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 z-50"
              >
                <button onClick={handleEditClick} className="w-full text-left px-3 py-1.5 text-sm text-[#475569] hover:bg-[#f8fafc]">
                  Edit task
                </button>
                <button onClick={handleDeleteClick} className="w-full text-left px-3 py-1.5 text-sm text-[#dc2626] hover:bg-[#f8fafc]">
                  Delete
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
  )
}