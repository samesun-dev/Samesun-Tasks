import { Sun, ListTodo, History, Users, BarChart3, CheckCircle2 } from 'lucide-react'

const NAV_ITEMS = [
  { icon: ListTodo, label: 'Tasks', key: 'tasks' },
  { icon: History, label: 'History', key: 'history' },
  { icon: Users, label: 'People', key: 'people' },
  { icon: BarChart3, label: 'Reports', key: 'reports' },
]

export default function Sidebar({ activePage, onNavigate, onOpenCompleted }) {
  return (
    <aside className="w-60 bg-[#eef2f7] flex flex-col h-screen sticky top-0 border-r border-[#dde4ec]">
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-[#dde4ec]">
        <div className="w-8 h-8 rounded-lg bg-[#f5a623] flex items-center justify-center shrink-0">
          <Sun size={17} className="text-white" />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-semibold leading-tight text-[#1e293b]">
            Samesun Tasks
          </h1>
        </div>
      </div>

      <nav className="px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = activePage === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#dbeafe] text-[#1d4ed8]'
                  : 'text-[#64748b] hover:bg-[#e2e8f0]'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          )
        })}

        <button
          onClick={onOpenCompleted}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[#64748b] hover:bg-[#e2e8f0]"
        >
          <CheckCircle2 size={16} />
          Completed
        </button>
      </nav>
    </aside>
  )
}
