import { useState } from 'react'
import { ChevronDown, Building2, MapPin } from 'lucide-react'

function FilterSelect({ icon: Icon, label, options, value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-sm text-[#475569] hover:border-[#93c5fd] transition-colors"
      >
        <Icon size={14} className="text-[#94a3b8]" />
        <span className={value ? 'text-[#1e293b] font-medium' : ''}>{value || label}</span>
        <ChevronDown size={14} className={`text-[#94a3b8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 z-20">
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-sm text-[#475569] hover:bg-[#f8fafc]"
          >
            All {label.toLowerCase()}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-sm text-[#475569] hover:bg-[#f8fafc]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({ department, setDepartment, city, setCity, departmentOptions, cityOptions }) {
  return (
    <div className="flex items-center gap-2">
      <FilterSelect
        icon={Building2}
        label="Department"
        options={departmentOptions}
        value={department}
        onChange={setDepartment}
      />
      <FilterSelect
        icon={MapPin}
        label="City"
        options={cityOptions}
        value={city}
        onChange={setCity}
      />
    </div>
  )
}