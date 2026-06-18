import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://harbaqvqxwgkifkbejwy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcmJhcXZxeHdna2lma2Jland5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDgwMzYsImV4cCI6MjA5NjUyNDAzNn0.Jdk8rVPVfHcegQuRpFqwZWbdY-bmnhIH2qirvSRqreU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEAMS = [
  { slug: "all",       name: "All" },
  { slug: "hr",        name: "HR" },
  { slug: "sales",     name: "Sales" },
  { slug: "marketing", name: "Marketing" },
  { slug: "growth",    name: "Growth & Dev" },
  { slug: "finance",   name: "Finance" },
  { slug: "ops",       name: "Operations" },
];

const TEAM_COLORS = {
  hr:        { bg: "#FEF3C7", text: "#92400E" },
  sales:     { bg: "#DBEAFE", text: "#1E40AF" },
  marketing: { bg: "#FCE7F3", text: "#9D174D" },
  growth:    { bg: "#D1FAE5", text: "#065F46" },
  finance:   { bg: "#EDE9FE", text: "#5B21B6" },
  ops:       { bg: "#FEE2E2", text: "#991B1B" },
};

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed",   label: "Completed" },
];

const STATUS_STYLES = {
  not_started: { bg: "#F3F4F6", text: "#6B7280" },
  in_progress: { bg: "#FEF3C7", text: "#92400E" },
  blocked:     { bg: "#FEE2E2", text: "#991B1B" },
  completed:   { bg: "#D1FAE5", text: "#065F46" },
};

function todayISO() { return new Date().toISOString().split("T")[0]; }

function formatDate(d) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + "T23:59:59") < new Date();
}

function getPastCycleDates(frequency, count = 5) {
  const dates = [];
  const now = new Date();
  for (let i = count; i >= 1; i--) {
    const d = new Date(now);
    if (frequency === "daily") d.setDate(d.getDate() - i);
    else if (frequency === "weekly") d.setDate(d.getDate() - i * 7);
    else if (frequency === "biweekly") d.setDate(d.getDate() - i * 14);
    else if (frequency === "monthly") d.setMonth(d.getMonth() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function SunLogo() {
  return (
    <div style={{ width: 34, height: 34, background: "#F5A623", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(245,166,35,0.4)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </div>
  );
}

function TeamBadge({ teamSlug, teamName }) {
  const c = TEAM_COLORS[teamSlug] ?? { bg: "#F3F4F6", text: "#6B7280" };
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: c.bg, color: c.text }}>{teamName}</span>;
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.not_started;
  const label = STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: s.bg, color: s.text }}>{label}</span>;
}

const BG     = "#FAFAF8";
const CARD   = "#FFFFFF";
const NAVY   = "#0F1523";
const ACCENT = "#F5A623";
const BORDER = "#EEEDE9";
const TEXT   = "#1A2235";
const MUTED  = "#9CA3AF";

const card       = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#FAFAF8", color: TEXT, fontSize: 13, outline: "none" };
const labelStyle = { display: "block", fontSize: 12, color: MUTED, marginBottom: 5, fontWeight: 500 };
const rowBorder  = { borderBottom: `1px solid ${BORDER}` };
const ghostBtn   = { background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer" };

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("task_user")); } catch { return null; } });
  function handleLogin(u) { localStorage.setItem("task_user", JSON.stringify(u)); setUser(u); }
  function handleLogout() { localStorage.removeItem("task_user"); setUser(null); }
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <Main user={user} onLogout={handleLogout} />;
}

// ── LOGIN ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    const { data } = await supabase.from("users").select("id,name,email,role,team_id")
      .eq("email", email.toLowerCase().trim()).eq("password", password).single();
    setLoading(false);
    if (!data) { setError("Wrong email or password."); return; }
    onLogin(data);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", marginBottom: 16 }}><SunLogo /></div>
          <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 700, margin: 0 }}>Samesun Tasks</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Your team's daily task hub</p>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@samesun.com" required autoFocus style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required style={inputStyle} />
            </div>
            {error && <p style={{ color: "#991B1B", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.4)" }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, marginTop: 16 }}>admin@company.com · admin123</p>
      </div>
    </div>
  );
}

// ── MAIN SHELL ─────────────────────────────────────────────
function Main({ user, onLogout }) {
  const [tab, setTab] = useState("tasks");
  const [showCompleted, setShowCompleted]       = useState(false);
  const [completedInstances, setCompletedInstances] = useState([]);
  const [completedTasks, setCompletedTasks]     = useState({});
  const [completedAll, setCompletedAll]         = useState(false);
  const [teams, setTeams]                       = useState({});
  const [users, setUsers]                       = useState({});

  const loadCompleted = useCallback(async (allTime = false) => {
    const cutoff = allTime ? null : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })();
    let query = supabase.from("task_instances").select("*").eq("status", "completed").order("completed_at", { ascending: false });
    if (cutoff) query = query.gte("completed_at", cutoff);
    const { data: instanceData } = await query;
    if (!instanceData?.length) { setCompletedInstances([]); return; }
    const taskIds = [...new Set(instanceData.map(i => i.task_id))];
    const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
    const taskMap = {}; taskData?.forEach(t => { taskMap[t.id] = t; }); setCompletedTasks(taskMap);
    setCompletedInstances(instanceData);
  }, []);

  useEffect(() => {
    supabase.from("teams").select("*").then(({ data }) => { const m = {}; data?.forEach(t => { m[t.id] = t; }); setTeams(m); });
    supabase.from("users").select("id,name,email,team_id").then(({ data }) => { const m = {}; data?.forEach(u => { m[u.id] = u; }); setUsers(m); });
  }, []);

  useEffect(() => { if (showCompleted) loadCompleted(completedAll); }, [showCompleted, completedAll, loadCompleted]);

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ background: NAVY, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SunLogo />
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Samesun Tasks</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{user.name}</span>
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "5px 12px", borderRadius: 7, cursor: "pointer" }}>Sign out</button>
            </div>
          </div>
          <div style={{ display: "flex" }}>
            {[["tasks","Tasks"],["history","History"],["people","People"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 16px",
                fontSize: 13, fontWeight: 600,
                color: tab === key ? ACCENT : "rgba(255,255,255,0.45)",
                borderBottom: tab === key ? `2px solid ${ACCENT}` : "2px solid transparent",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 80px" }}>
        {tab === "tasks"   && <TaskView user={user} allUsers={users} allTeams={teams} onTaskComplete={() => { if (showCompleted) loadCompleted(completedAll); }} />}
        {tab === "history" && <HistoryView />}
        {tab === "people"  && <PeopleView />}
      </div>

      {/* Completed button */}
      <button onClick={() => setShowCompleted(true)} style={{
        position: "fixed", right: 20, bottom: 24,
        background: NAVY, color: "#fff", border: "none", borderRadius: 12,
        padding: "11px 18px", cursor: "pointer", zIndex: 20,
        fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l4 4 8-8" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Completed
      </button>

      {showCompleted && (
        <CompletedDrawer
          instances={completedInstances} tasks={completedTasks}
          teams={teams} users={users} allTime={completedAll}
          onToggleAllTime={() => setCompletedAll(!completedAll)}
          onClose={() => setShowCompleted(false)}
          onUncomplete={async id => {
            await supabase.from("task_instances").update({ status: "not_started", completed_by: null, completed_at: null }).eq("id", id);
            loadCompleted(completedAll);
          }} />
      )}
    </div>
  );
}

// ── TASK VIEW ──────────────────────────────────────────────
function TaskView({ user, allUsers, allTeams, onTaskComplete }) {
  const [activeTeam, setActiveTeam]         = useState("all");
  const [activePerson, setActivePerson]     = useState("all");
  const [showMyTasks, setShowMyTasks]       = useState(false);
  const [instances, setInstances]           = useState([]);
  const [tasks, setTasks]                   = useState({});
  const [teams, setTeams]                   = useState(allTeams ?? {});
  const [users, setUsers]                   = useState(allUsers ?? {});
  const [loading, setLoading]               = useState(true);
  const [statusPickerId, setStatusPickerId] = useState(null);
  const [completingId, setCompletingId]     = useState(null);
  const [editingTask, setEditingTask]       = useState(null);
  const [showAddForm, setShowAddForm]       = useState(false);
  const [showReport, setShowReport]         = useState(false);
  const today = todayISO();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: teamData }, { data: userData }, { data: instanceData }] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("users").select("id,name,email,team_id"),
      supabase.from("task_instances").select("*").neq("status", "completed").order("due_date", { ascending: true }),
    ]);
    const teamMap = {}; teamData?.forEach(t => { teamMap[t.id] = t; }); setTeams(teamMap);
    const userMap = {}; userData?.forEach(u => { userMap[u.id] = u; }); setUsers(userMap);
    if (!instanceData?.length) { setInstances([]); setLoading(false); return; }
    const taskIds = [...new Set(instanceData.map(i => i.task_id))];
    const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
    const taskMap = {}; taskData?.forEach(t => { taskMap[t.id] = t; }); setTasks(taskMap);
    setInstances(instanceData); setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // People in the active team
  const teamObj = TEAMS.find(t => t.slug === activeTeam);
  const teamRecord = teamObj ? Object.values(teams).find(t => t.slug === activeTeam) : null;
  const peopleInTeam = teamRecord
    ? Object.values(users).filter(u => u.team_id === teamRecord.id)
    : [];

  const filtered = instances.filter(inst => {
    const task = tasks[inst.task_id];
    if (!task) return false;
    if (task.is_private && task.created_by !== user.id) return false;
    if (showMyTasks && task.assigned_to !== user.id) return false;
    if (activePerson !== "all" && task.assigned_to !== activePerson) return false;
    if (activeTeam === "all") return true;
    return teams[task.team_id]?.slug === activeTeam;
  });

  const weekEnd  = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().split("T")[0]; })();
  const monthEnd = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]; })();

  function taskEndDate(inst) { return tasks[inst.task_id]?.end_date ?? null; }

  const groups = {
    overdue:   filtered.filter(i => { const e = taskEndDate(i); return e && e < today; }),
    today:     filtered.filter(i => { const e = taskEndDate(i); return e === today; }),
    week:      filtered.filter(i => { const e = taskEndDate(i); return e && e > today && e <= weekEnd; }),
    month:     filtered.filter(i => { const e = taskEndDate(i); return e && e > weekEnd && e <= monthEnd; }),
    later:     filtered.filter(i => { const e = taskEndDate(i); return e && e > monthEnd; }),
    noDueDate: filtered.filter(i => { const e = taskEndDate(i); return !e; }),
  };

  const [todayCompleted, setTodayCompleted] = useState(0);
  useEffect(() => {
    supabase.from("task_instances").select("id", { count: "exact" })
      .eq("status", "completed").gte("completed_at", today + "T00:00:00")
      .then(({ count }) => setTodayCompleted(count ?? 0));
  }, [instances, today]);

  const totalToday = filtered.length + todayCompleted;
  const pct = totalToday ? Math.round((todayCompleted / totalToday) * 100) : 0;
  const overdueCount = groups.overdue.length;

  async function handleStatusChange(instId, newStatus) {
    if (newStatus === "completed") {
      setCompletingId(instId);
    } else {
      setInstances(prev => prev.map(i => i.id === instId ? { ...i, status: newStatus } : i));
      await supabase.from("task_instances").update({ status: newStatus }).eq("id", instId);
    }
    setStatusPickerId(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} onClick={() => { if (statusPickerId) setStatusPickerId(null); }}>

      {/* Progress card */}
      <div style={{ background: NAVY, borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
          <span>
            {todayCompleted} of {totalToday} tasks completed today
            {overdueCount > 0 && <span style={{ color: "#FCA5A5", marginLeft: 8 }}>· {overdueCount} overdue</span>}
          </span>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
          <div style={{ height: 6, background: ACCENT, borderRadius: 3, width: `${pct}%`, transition: "width 0.4s", boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
        </div>
      </div>

      {/* Team tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {TEAMS.map(t => (
          <button key={t.slug} onClick={() => { setActiveTeam(t.slug); setActivePerson("all"); }} style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap",
            background: activeTeam === t.slug ? ACCENT : CARD,
            color: activeTeam === t.slug ? "#fff" : MUTED,
            border: activeTeam === t.slug ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
            boxShadow: activeTeam === t.slug ? "0 2px 8px rgba(245,166,35,0.3)" : "none",
          }}>{t.name}</button>
        ))}
      </div>

      {/* People sub-tabs — only show when a specific team is selected */}
      {activeTeam !== "all" && peopleInTeam.length > 0 && (
        <div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
          <button onClick={() => setActivePerson("all")} style={{
            padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: "pointer",
            background: activePerson === "all" ? NAVY : "none",
            color: activePerson === "all" ? "#fff" : MUTED,
            border: `1px solid ${activePerson === "all" ? NAVY : BORDER}`,
          }}>All</button>
          {peopleInTeam.map(u => (
            <button key={u.id} onClick={() => setActivePerson(u.id)} style={{
              padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap",
              background: activePerson === u.id ? NAVY : "none",
              color: activePerson === u.id ? "#fff" : MUTED,
              border: `1px solid ${activePerson === u.id ? NAVY : BORDER}`,
            }}>{u.name.split(" ")[0]}</button>
          ))}
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => setShowAddForm(true)} style={{ flex: 1, background: ACCENT, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, padding: "11px", borderRadius: 10, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
          + Add task
        </button>
        <button onClick={() => setShowMyTasks(!showMyTasks)} style={{
          ...ghostBtn,
          background: showMyTasks ? "#EDE9FE" : "none",
          color: showMyTasks ? "#5B21B6" : MUTED,
          border: `1px solid ${showMyTasks ? "#C4B5FD" : BORDER}`,
          fontWeight: showMyTasks ? 700 : 400,
        }}>My tasks</button>
        <button onClick={() => setShowReport(true)} style={ghostBtn}>Report</button>
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading tasks…</p>
      ) : (
        <>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>☀️</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>All clear!</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No open tasks</p>
            </div>
          )}

          {[
            ["overdue",   "⚠️ Overdue",      "#DC2626", "#FEF2F2", "#FECACA"],
            ["today",     "Due today",        TEXT,      null,      null],
            ["week",      "Due this week",    TEXT,      null,      null],
            ["month",     "Due this month",   TEXT,      null,      null],
            ["later",     "Later",            TEXT,      null,      null],
            ["noDueDate", "No due date",      TEXT,      null,      null],
          ].map(([key, label, color, bg, borderColor]) => {
            const groupItems = groups[key];
            if (!groupItems.length) return null;
            return (
              <div key={key}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color, marginBottom: 6 }}>
                  {label} · {groupItems.length}
                </p>
                <div style={{ ...card, ...(bg ? { background: bg, borderColor } : {}) }}>
                  {groupItems.map((inst, i) => (
                    <TaskRow key={inst.id} instance={inst} task={tasks[inst.task_id]}
                      teams={teams} users={users} isLast={i === groupItems.length - 1}
                      today={today} isStatusPickerOpen={statusPickerId === inst.id}
                      onCircleClick={e => { e.stopPropagation(); setStatusPickerId(statusPickerId === inst.id ? null : inst.id); }}
                      onStatusChange={status => handleStatusChange(inst.id, status)}
                      onEdit={() => setEditingTask(tasks[inst.task_id])} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {completingId && (
        <CompleteModal
          instance={instances.find(i => i.id === completingId)}
          task={tasks[instances.find(i => i.id === completingId)?.task_id]}
          users={Object.values(users)}
          onConfirm={async userId => {
            await supabase.from("task_instances").update({ status: "completed", completed_by: userId, completed_at: new Date().toISOString() }).eq("id", completingId);
            setCompletingId(null); loadData(); onTaskComplete?.();
          }}
          onCancel={() => setCompletingId(null)} />
      )}

      {editingTask && (
        <TaskFormModal mode="edit" task={editingTask} teams={Object.values(teams)} users={Object.values(users)}
          onSave={async updates => {
            await supabase.from("tasks").update({
              title: updates.title, description: updates.description || null,
              team_id: updates.team_id || null, location: updates.location || null,
              assigned_to: updates.assigned_to || null, frequency: updates.frequency || null,
              type: updates.frequency ? "recurring" : "one_off",
              start_date: updates.start_date || null, end_date: updates.end_date || null,
              status: updates.status, is_private: updates.is_private,
            }).eq("id", editingTask.id);
            setEditingTask(null); loadData();
          }}
          onDelete={async () => { await supabase.from("tasks").update({ is_active: false }).eq("id", editingTask.id); setEditingTask(null); loadData(); }}
          onCancel={() => setEditingTask(null)} />
      )}

      {showAddForm && (
        <TaskFormModal mode="add" teams={Object.values(teams)} users={Object.values(users)}
          onSave={async d => {
            const { data: newTask } = await supabase.from("tasks").insert({
              title: d.title, description: d.description || null, team_id: d.team_id || null,
              type: d.frequency ? "recurring" : "one_off", frequency: d.frequency || null,
              location: d.location || null, is_private: d.is_private,
              assigned_to: d.assigned_to || null, start_date: d.start_date || null,
              end_date: d.end_date || null, status: "not_started", created_by: user.id, is_active: true,
            }).select().single();
            if (newTask) await supabase.from("task_instances").insert({ task_id: newTask.id, status: "not_started", due_date: today });
            setShowAddForm(false); loadData();
          }}
          onCancel={() => setShowAddForm(false)} />
      )}

      {showReport && (
        <ReportModal tasks={tasks} teams={teams} users={users} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

// ── TASK ROW ───────────────────────────────────────────────
function TaskRow({ instance, task, teams, users, isLast, today, isStatusPickerOpen, onCircleClick, onStatusChange, onEdit }) {
  const [expanded, setExpanded]       = useState(false);
  const [showNote, setShowNote]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cycleHistory, setCycleHistory] = useState(null);
  const [noteText, setNoteText]       = useState(instance.notes || "");
  const [hovered, setHovered]         = useState(false);
  if (!task) return null;

  const team        = teams[task.team_id];
  const assignedTo  = users[task.assigned_to];
  const taskOverdue = task.end_date ? isOverdue(task.end_date) : false;
  const hasDueDate  = !!task.end_date;
  const dueDateOver = isOverdue(task.end_date);
  const currentStatus = instance.status ?? "not_started";
  const isRecurring = task.type === "recurring" && task.frequency;

  async function saveNote() {
    await supabase.from("task_instances").update({ notes: noteText }).eq("id", instance.id);
  }

  async function loadCycleHistory() {
    if (cycleHistory) { setShowHistory(!showHistory); return; }
    const pastDates = getPastCycleDates(task.frequency, 5);
    const { data } = await supabase
      .from("task_instances")
      .select("due_date, status, completed_by")
      .eq("task_id", task.id)
      .in("due_date", pastDates);
    const map = {};
    data?.forEach(d => { map[d.due_date] = d; });
    setCycleHistory(pastDates.map(date => ({ date, inst: map[date] ?? null })));
    setShowHistory(true);
  }

  const cycleLabel = { daily: "day", weekly: "week", biweekly: "2 wks", monthly: "month" };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...(isLast ? {} : rowBorder), ...(taskOverdue ? { background: "#FFFBEB" } : hovered ? { background: "#FAFAF8" } : {}) }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>

        {/* Circle with status picker */}
        <div style={{ position: "relative", flexShrink: 0, marginTop: 1 }}>
          <button onClick={onCircleClick} style={{
            width: 22, height: 22, borderRadius: "50%",
            border: `2px solid ${taskOverdue ? "#FCA5A5" : currentStatus === "in_progress" ? ACCENT : BORDER}`,
            background: currentStatus === "in_progress" ? "#FEF3C7" : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}>
            {currentStatus === "in_progress" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />}
          </button>

          {isStatusPickerOpen && (
            <div style={{
              position: "absolute", top: 28, left: 0, background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 150, overflow: "hidden",
            }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={e => { e.stopPropagation(); onStatusChange(opt.value); }} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 12px", background: currentStatus === opt.value ? "#F9FAFB" : "none",
                  border: "none", cursor: "pointer", fontSize: 13, color: TEXT,
                  fontWeight: currentStatus === opt.value ? 600 : 400,
                  borderBottom: opt.value !== "completed" ? `1px solid ${BORDER}` : "none",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_STYLES[opt.value]?.text ?? MUTED, flexShrink: 0 }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>
              {task.title}
              {task.is_private && <span style={{ color: MUTED, fontSize: 11, marginLeft: 6 }}>🔒</span>}
            </span>

            {/* Right side */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              {hasDueDate && (
                <span style={{ fontSize: 11, fontWeight: 600, color: dueDateOver ? "#DC2626" : MUTED, background: dueDateOver ? "#FEF2F2" : "#F3F4F6", padding: "2px 8px", borderRadius: 20 }}>
                  Due {formatDate(task.end_date)}
                </span>
              )}
              <StatusBadge status={currentStatus} />
              <button onClick={onEdit} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "2px 8px", borderRadius: 5, cursor: "pointer", fontWeight: 500 }}>Edit</button>
            </div>
          </div>

          {taskOverdue && (
            <p style={{ fontSize: 11, color: "#DC2626", fontWeight: 600, marginTop: 2 }}>⚠️ Overdue since {formatDate(task.end_date)}</p>
          )}

          {task.description && <p style={{ color: MUTED, fontSize: 12, margin: "4px 0 0", lineHeight: 1.5 }}>{task.description}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
            {task.frequency && <span style={{ fontSize: 11, color: MUTED, background: "#F3F4F6", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>{task.frequency}</span>}
            {assignedTo && <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>👤 {assignedTo.name.split(" ")[0]}</span>}
            {task.location && <span style={{ fontSize: 11, color: MUTED }}>📍 {task.location}</span>}
          </div>

          {/* Cycle history */}
          {showHistory && cycleHistory && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Completion history</p>
              <div style={{ display: "flex", gap: 8 }}>
                {cycleHistory.map(({ date, inst }) => {
                  const done    = inst?.status === "completed";
                  const missed  = inst && inst.status !== "completed";
                  const noData  = !inst;
                  return (
                    <div key={date} style={{ textAlign: "center" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: done ? "#D1FAE5" : missed ? "#FEE2E2" : "#F3F4F6",
                        border: `1.5px solid ${done ? "#6EE7B7" : missed ? "#FCA5A5" : BORDER}`,
                        fontSize: 12,
                      }}>
                        {done ? "✓" : missed ? "✗" : "○"}
                      </div>
                      <p style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>{cycleLabel[task.frequency] ?? ""}</p>
                    </div>
                  );
                })}
                {/* Current cycle */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FEF3C7", border: `1.5px solid ${ACCENT}`, fontSize: 12 }}>
                    ○
                  </div>
                  <p style={{ fontSize: 9, color: ACCENT, marginTop: 3, fontWeight: 600 }}>now</p>
                </div>
              </div>
            </div>
          )}

          {/* Expanded details */}
          {expanded && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Date added", task.created_at ? formatDate(task.created_at.split("T")[0]) : null],
                ["Start date", task.start_date ? formatDate(task.start_date) : null],
                ["Due date",   task.end_date   ? formatDate(task.end_date)   : null],
                ["Assigned",   assignedTo?.name],
                ["Location",   task.location],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                  <span style={{ color: MUTED, width: 80, flexShrink: 0, fontWeight: 500 }}>{label}</span>
                  <span style={{ color: TEXT, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action links */}
          <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center" }}>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>›</span>
              {expanded ? "Hide details" : "Details"}
            </button>
            <button onClick={() => setShowNote(!showNote)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>
              {showNote ? "Hide note" : instance.notes ? "Edit note" : "+ Note"}
            </button>
            {isRecurring && (
              <button onClick={loadCycleHistory} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>
                {showHistory ? "Hide history" : "History"}
              </button>
            )}
          </div>

          {showNote && (
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} onBlur={saveNote}
              placeholder="Add a note…" rows={2}
              style={{ marginTop: 8, width: "100%", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 12, resize: "none", outline: "none" }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPLETED DRAWER ───────────────────────────────────────
function CompletedDrawer({ instances, tasks, teams, users, allTime, onToggleAllTime, onClose, onUncomplete }) {
  const [expanded, setExpanded] = useState(false);

  const grouped = {};
  instances.forEach(inst => {
    const dateKey = inst.completed_at ? inst.completed_at.split("T")[0] : "unknown";
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(inst);
  });

  const width = expanded ? "100vw" : "min(420px, 92vw)";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 30 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width, background: CARD, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", zIndex: 40, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, margin: 0 }}>✅ Completed</p>
            <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{instances.length} tasks</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setExpanded(!expanded)} style={ghostBtn}>{expanded ? "⤡" : "⤢"}</button>
            <button onClick={onClose} style={{ ...ghostBtn, fontSize: 16 }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {instances.length === 0 ? (
            <p style={{ color: MUTED, textAlign: "center", padding: "40px 0", fontSize: 13 }}>No completed tasks yet</p>
          ) : (
            Object.entries(grouped).map(([date, dayInstances]) => (
              <div key={date}>
                <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{formatDate(date)}</p>
                <div style={card}>
                  {dayInstances.map((inst, i) => {
                    const task = tasks[inst.task_id];
                    const team = task ? teams[task.team_id] : null;
                    const completedBy = users[inst.completed_by];
                    const time = inst.completed_at ? new Date(inst.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                    return (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", ...(i < dayInstances.length - 1 ? rowBorder : {}) }}>
                        <button onClick={() => onUncomplete(inst.id)} style={{ width: 20, height: 20, borderRadius: "50%", background: "#D1FAE5", border: "2px solid #6EE7B7", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{task?.title ?? "—"}</p>
                          {team && <div style={{ marginTop: 3 }}><TeamBadge teamSlug={team.slug} teamName={team.name} /></div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {completedBy && <p style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{completedBy.name.split(" ")[0]}</p>}
                          {time && <p style={{ color: MUTED, fontSize: 11 }}>{time}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
          <p style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>{allTime ? "Showing all completed tasks" : "Showing last 30 days"}</p>
          <button onClick={onToggleAllTime} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
            {allTime ? "Show last 30 days" : "Show all time"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── HISTORY VIEW ───────────────────────────────────────────
function HistoryView() {
  const [instances, setInstances]   = useState([]);
  const [tasks, setTasks]           = useState({});
  const [teams, setTeams]           = useState({});
  const [users, setUsers]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [activeTeam, setActiveTeam] = useState("all");
  const [preset, setPreset]         = useState("yesterday");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");

  function getRange() {
    const today = new Date();
    const fmt = d => d.toISOString().split("T")[0];
    if (preset === "yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); return [fmt(y), fmt(y)]; }
    if (preset === "week") { const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1); return [fmt(mon), fmt(today)]; }
    if (preset === "month") return [`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`, fmt(today)];
    if (preset === "custom") return [from, to];
    return [fmt(today), fmt(today)];
  }

  const loadHistory = useCallback(async () => {
    const [fromDate, toDate] = getRange();
    if (!fromDate || !toDate) return;
    setLoading(true);
    const [{ data: teamData }, { data: userData }, { data: instanceData }] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("users").select("id,name,email,team_id"),
      supabase.from("task_instances").select("*").gte("due_date", fromDate).lte("due_date", toDate).order("due_date", { ascending: false }),
    ]);
    const teamMap = {}; teamData?.forEach(t => { teamMap[t.id] = t; }); setTeams(teamMap);
    const userMap = {}; userData?.forEach(u => { userMap[u.id] = u; }); setUsers(userMap);
    if (!instanceData?.length) { setInstances([]); setLoading(false); return; }
    const taskIds = [...new Set(instanceData.map(i => i.task_id))];
    const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
    const taskMap = {}; taskData?.forEach(t => { taskMap[t.id] = t; }); setTasks(taskMap);
    setInstances(instanceData); setLoading(false);
  }, [preset, from, to]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const filtered = instances.filter(inst => {
    const task = tasks[inst.task_id];
    if (!task) return false;
    if (activeTeam === "all") return true;
    return teams[task.team_id]?.slug === activeTeam;
  });

  const grouped = {};
  filtered.forEach(inst => { if (!grouped[inst.due_date]) grouped[inst.due_date] = []; grouped[inst.due_date].push(inst); });

  const done    = filtered.filter(i => i.status === "completed").length;
  const pending = filtered.filter(i => i.status !== "completed").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["yesterday","Yesterday"],["week","This week"],["month","This month"],["custom","Custom"]].map(([key, label]) => (
          <button key={key} onClick={() => setPreset(key)} style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer",
            background: preset === key ? ACCENT : CARD, color: preset === key ? "#fff" : MUTED,
            border: preset === key ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
            boxShadow: preset === key ? "0 2px 8px rgba(245,166,35,0.3)" : "none",
          }}>{label}</button>
        ))}
      </div>

      {preset === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <span style={{ color: MUTED, fontSize: 12 }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={loadHistory} style={{ ...ghostBtn, whiteSpace: "nowrap" }}>Apply</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        {TEAMS.map(t => (
          <button key={t.slug} onClick={() => setActiveTeam(t.slug)} style={{
            padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap",
            background: activeTeam === t.slug ? NAVY : CARD, color: activeTeam === t.slug ? "#fff" : MUTED,
            border: activeTeam === t.slug ? `1px solid ${NAVY}` : `1px solid ${BORDER}`,
          }}>{t.name}</button>
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Completed",done,"#065F46","#D1FAE5","#6EE7B7"],["Not done",pending,"#92400E","#FEF3C7","#FCD34D"]].map(([label,val,text,bg,border]) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: text, margin: 0 }}>{val}</p>
              <p style={{ fontSize: 12, color: text, opacity: 0.8, margin: "3px 0 0", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>No tasks found</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Try a different date range</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayInstances]) => (
          <div key={date}>
            <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{formatDate(date)}</p>
            <div style={card}>
              {dayInstances.map((inst, i) => {
                const task = tasks[inst.task_id];
                const team = task ? teams[task.team_id] : null;
                const completedBy = users[inst.completed_by];
                const time = inst.completed_at ? new Date(inst.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", ...(i < dayInstances.length - 1 ? rowBorder : {}) }}>
                    <StatusBadge status={inst.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{task?.title ?? "—"}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                        {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
                        {task?.frequency && <span style={{ fontSize: 11, color: MUTED }}>{task.frequency}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {completedBy && <p style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{completedBy.name.split(" ")[0]}</p>}
                      {time && <p style={{ color: MUTED, fontSize: 11 }}>{time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── PEOPLE VIEW ────────────────────────────────────────────
function PeopleView() {
  const [users, setUsers]                   = useState([]);
  const [teams, setTeams]                   = useState({});
  const [loading, setLoading]               = useState(true);
  const [showAdd, setShowAdd]               = useState(false);
  const [editingUser, setEditingUser]       = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    const [{ data: userData }, { data: teamData }] = await Promise.all([
      supabase.from("users").select("*").order("name"),
      supabase.from("teams").select("*"),
    ]);
    setUsers(userData ?? []);
    const teamMap = {}; teamData?.forEach(t => { teamMap[t.id] = t; }); setTeams(teamMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  async function handleAddUser(form) {
    const { data } = await supabase.from("users").insert({ name: form.name, email: form.email, password: form.password, team_id: form.team_id || null, role: "member" }).select().single();
    if (data) setNewCredentials({ name: form.name, email: form.email, password: form.password });
    setShowAdd(false); loadPeople();
  }

  async function handleEditUser(form) {
    await supabase.from("users").update({ name: form.name, email: form.email, team_id: form.team_id || null, role: form.role, ...(form.password ? { password: form.password } : {}) }).eq("id", editingUser.id);
    setEditingUser(null); loadPeople();
  }

  const initials = name => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: MUTED, fontSize: 13, fontWeight: 500 }}>{users.length} people</p>
        <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>+ Add person</button>
      </div>

      {loading ? <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p> : (
        <div style={card}>
          {users.map((u, i) => {
            const team = teams[u.team_id];
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", ...(i < users.length - 1 ? rowBorder : {}) }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#FEF3C7", border: "2px solid #FCD34D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#92400E" }}>{initials(u.name)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                  <p style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>{u.email}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
                  {u.role === "admin" && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>Admin</span>}
                  <button onClick={() => setEditingUser(u)} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {newCredentials && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: CARD, borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>✅ Person added!</p>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>Share these login details with {newCredentials.name}:</p>
            <div style={{ background: BG, borderRadius: 10, padding: "14px 16px", marginBottom: 16, border: `1px solid ${BORDER}` }}>
              {[["URL","samesun-tasks.vercel.app"],["Email",newCredentials.email],["Password",newCredentials.password]].map(([lbl,val]) => (
                <div key={lbl} style={{ marginBottom: 10 }}>
                  <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{lbl}</p>
                  <p style={{ color: lbl === "URL" ? ACCENT : TEXT, fontSize: 13, fontWeight: 700 }}>{val}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setNewCredentials(null)} style={{ width: "100%", padding: 12, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Done</button>
          </div>
        </div>
      )}

      {showAdd && <UserFormModal mode="add" teams={Object.values(teams)} onSave={handleAddUser} onCancel={() => setShowAdd(false)} />}
      {editingUser && <UserFormModal mode="edit" user={editingUser} teams={Object.values(teams)} onSave={handleEditUser} onDelete={async () => { await supabase.from("users").delete().eq("id", editingUser.id); setEditingUser(null); loadPeople(); }} onCancel={() => setEditingUser(null)} />}
    </div>
  );
}

// ── USER FORM MODAL ────────────────────────────────────────
function UserFormModal({ mode, user, teams, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", password: "", team_id: user?.team_id ?? "", role: user?.role ?? "member" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (mode === "add" && !form.password.trim()) return;
    setSaving(true); await onSave(form); setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 440, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>{mode === "add" ? "Add person" : "Edit person"}</p>
          {mode === "edit" && (!confirm
            ? <button onClick={() => setConfirm(true)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Remove</button>
            : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: MUTED }}>Sure?</span>
                <button onClick={onDelete} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Yes</button>
                <button onClick={() => setConfirm(false)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>No</button>
              </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[["Full name","name","text","Jane Smith"],["Email","email","email","jane@samesun.com"]].map(([lbl,key,type,ph]) => (
            <div key={key}>
              <label style={labelStyle}>{lbl}</label>
              <input type={type} value={form[key]} onChange={e => update(key, e.target.value)} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>{mode === "add" ? "Password" : "New password (leave blank to keep)"}</label>
            <input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder={mode === "add" ? "Set a password" : "Leave blank to keep"} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Team</label>
            <select value={form.team_id} onChange={e => update("team_id", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">No team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={e => update("role", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 11, background: ACCENT, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : mode === "add" ? "Add person" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMPLETE MODAL ─────────────────────────────────────────
function CompleteModal({ task, users, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60, padding: 16 }} onClick={onCancel}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 420, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Who completed this?</p>
        {task && <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>{task.title}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {users.map(u => (
            <button key={u.id} onClick={() => onConfirm(u.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: "pointer" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#FEF3C7", border: "2px solid #FCD34D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#92400E" }}>{u.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
              </div>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{u.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ width: "100%", marginTop: 12, padding: 11, background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── TASK FORM FIELDS ───────────────────────────────────────
function TaskFormFields({ form, update, teams, users }) {
  const sel = { ...inputStyle, appearance: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelStyle}>Title *</label>
        <input type="text" value={form.title} onChange={e => update("title", e.target.value)} placeholder="What needs doing?" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Any extra detail…" rows={2} style={{ ...inputStyle, resize: "none" }} />
      </div>
      {[
        ["Status","status",[["not_started","Not started"],["in_progress","In progress"],["blocked","Blocked"]]],
        ["Team","team_id",[["","No team"],...teams.map(t=>[t.id,t.name])]],
        ["Assign to","assigned_to",[["","Unassigned"],...users.map(u=>[u.id,u.name])]],
        ["Repeats","frequency",[["","One-off"],["daily","Daily"],["weekly","Weekly"],["biweekly","Bi-weekly"],["monthly","Monthly"]]],
      ].map(([lbl,key,opts]) => (
        <div key={key}>
          <label style={labelStyle}>{lbl}</label>
          <select value={form[key]} onChange={e => update(key, e.target.value)} style={sel}>
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      ))}
      <div>
        <label style={labelStyle}>Location</label>
        <input type="text" value={form.location} onChange={e => update("location", e.target.value)} placeholder="e.g. Vancouver office, Remote" style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {[["Start date","start_date"],["Due date","end_date"]].map(([lbl,key]) => (
          <div key={key} style={{ flex: 1 }}>
            <label style={labelStyle}>{lbl}</label>
            <input type="date" value={form[key]} onChange={e => update(key, e.target.value)} style={inputStyle} />
          </div>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={form.is_private} onChange={e => update("is_private", e.target.checked)} style={{ accentColor: ACCENT, width: 15, height: 15 }} />
        <span style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>🔒 Private — only visible to me</span>
      </label>
    </div>
  );
}

// ── TASK FORM MODAL ────────────────────────────────────────
function TaskFormModal({ mode, task, teams, users, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title: task?.title ?? "", description: task?.description ?? "",
    team_id: task?.team_id ?? "", frequency: task?.frequency ?? "",
    location: task?.location ?? "", is_private: task?.is_private ?? false,
    assigned_to: task?.assigned_to ?? "", start_date: task?.start_date ?? "",
    end_date: task?.end_date ?? "", status: task?.status ?? "not_started",
  });
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({ ...form, title: form.title.trim(), description: form.description.trim() });
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 440, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>{mode === "edit" ? "Edit task" : "Add task"}</p>
          {mode === "edit" && (!confirm
            ? <button onClick={() => setConfirm(true)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Delete</button>
            : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: MUTED }}>Sure?</span>
                <button onClick={onDelete} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Yes</button>
                <button onClick={() => setConfirm(false)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>No</button>
              </div>
          )}
        </div>
        <TaskFormFields form={form} update={update} teams={teams} users={users} />
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 11, background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{ flex: 1, padding: 11, background: ACCENT, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: !form.title.trim() || saving ? 0.5 : 1 }}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── REPORT MODAL ───────────────────────────────────────────
function ReportModal({ tasks, teams, users, onClose }) {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading]     = useState(true);
  const today = todayISO();

  useEffect(() => {
    async function load() {
      const { data: openData } = await supabase.from("task_instances").select("*").neq("status", "completed").order("due_date", { ascending: true });
      const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })();
      const { data: completedData } = await supabase.from("task_instances").select("*").eq("status", "completed").gte("completed_at", cutoff).order("completed_at", { ascending: false });
      const allInstances = [...(openData ?? []), ...(completedData ?? [])];
      if (!allInstances.length) { setInstances([]); setLoading(false); return; }
      const taskIds = [...new Set(allInstances.map(i => i.task_id))];
      const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
      const taskMap = {}; taskData?.forEach(t => { taskMap[t.id] = t; });
      setInstances(allInstances.map(i => ({ ...i, _task: taskMap[i.task_id] })));
      setLoading(false);
    }
    load();
  }, []);

  const weekEnd  = (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString().split("T")[0]; })();
  const monthEnd = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]; })();

  const completed   = instances.filter(i => i.status === "completed");
  const inProgress  = instances.filter(i => i.status === "in_progress");
  const overdue     = instances.filter(i => i.status !== "completed" && i._task?.end_date && i._task.end_date < today);
  const dueToday    = instances.filter(i => i.status !== "completed" && i._task?.end_date === today);
  const dueThisWeek = instances.filter(i => i.status !== "completed" && i._task?.end_date && i._task.end_date > today && i._task.end_date <= weekEnd);
  const notStarted  = instances.filter(i => i.status === "not_started" && (!i._task?.end_date || i._task.end_date >= today));

  const teamStats = {};
  Object.values(teams).forEach(t => { teamStats[t.id] = { name: t.name, slug: t.slug, done: 0, total: 0 }; });
  instances.forEach(inst => {
    const teamId = inst._task?.team_id;
    if (!teamId || !teamStats[teamId]) return;
    teamStats[teamId].total++;
    if (inst.status === "completed") teamStats[teamId].done++;
  });

  function exportCSV() {
    const header = "Task,Team,Status,Assigned To,Completed By,Completed At,Due Date";
    const rows = instances.map(inst => {
      const task = inst._task;
      const team = task ? teams[task.team_id] : null;
      return `"${task?.title ?? "—"}","${team?.name ?? "—"}","${inst.status}","${users[task?.assigned_to]?.name ?? "—"}","${users[inst.completed_by]?.name ?? "—"}","${inst.completed_at ? new Date(inst.completed_at).toLocaleString("en-GB") : "—"}","${task?.end_date ? formatDate(task.end_date) : "—"}"`;
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `samesun-report-${today}.csv`; a.click();
  }

  const Section = ({ title, color, items }) => items.length > 0 ? (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color, marginBottom: 8 }}>{title} · {items.length}</p>
      <div style={card}>
        {items.map((inst, i) => {
          const task = inst._task;
          const team = task ? teams[task.team_id] : null;
          const assignedTo = users[task?.assigned_to];
          const completedBy = users[inst.completed_by];
          return (
            <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", ...(i < items.length - 1 ? rowBorder : {}) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{task?.title ?? "—"}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                  {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
                  {assignedTo && <span style={{ fontSize: 11, color: MUTED }}>👤 {assignedTo.name.split(" ")[0]}</span>}
                  {task?.end_date && <span style={{ fontSize: 11, color: task.end_date < today ? "#DC2626" : MUTED, fontWeight: task.end_date < today ? 600 : 400 }}>Due {formatDate(task.end_date)}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {completedBy && <p style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{completedBy.name.split(" ")[0]}</p>}
                {inst.completed_at && <p style={{ color: MUTED, fontSize: 11 }}>{new Date(inst.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: BG, borderRadius: 16, width: "100%", maxWidth: 580, border: `1px solid ${BORDER}`, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, background: CARD, borderRadius: "16px 16px 0 0" }}>
          <div>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, margin: 0 }}>Task Report</p>
            <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {loading ? <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p> : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                ["Completed", completed.length, "#065F46", "#D1FAE5", "#6EE7B7"],
                ["In progress", inProgress.length, "#92400E", "#FEF3C7", "#FCD34D"],
                ["Overdue", overdue.length, "#991B1B", "#FEE2E2", "#FCA5A5"],
                ["Not started", notStarted.length, "#1E40AF", "#DBEAFE", "#93C5FD"],
              ].map(([label, val, text, bg, border]) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: text, margin: 0 }}>{val}</p>
                  <p style={{ fontSize: 10, color: text, margin: "2px 0 0", fontWeight: 600, opacity: 0.8 }}>{label}</p>
                </div>
              ))}
            </div>

            {Object.values(teamStats).some(t => t.total > 0) && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>By team</p>
                <div style={{ ...card, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.values(teamStats).filter(t => t.total > 0).map(t => {
                    const pct = Math.round((t.done / t.total) * 100);
                    const c = TEAM_COLORS[t.slug] ?? { bg: "#F3F4F6", text: "#6B7280" };
                    return (
                      <div key={t.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: TEXT }}>{t.name}</span>
                          <span style={{ color: MUTED }}>{t.done}/{t.total} · <span style={{ fontWeight: 600, color: c.text }}>{pct}%</span></span>
                        </div>
                        <div style={{ height: 6, background: c.bg, borderRadius: 3 }}>
                          <div style={{ height: 6, background: c.text, borderRadius: 3, width: `${pct}%`, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Section title="⚠️ Overdue"              color="#DC2626" items={overdue} />
            <Section title="Due today"                color="#92400E" items={dueToday} />
            <Section title="Due this week"            color={TEXT}    items={dueThisWeek} />
            <Section title="In progress"              color="#92400E" items={inProgress.filter(i => !overdue.includes(i))} />
            <Section title="Completed (last 30 days)" color="#065F46" items={completed} />
            <Section title="Not started"              color={MUTED}   items={notStarted} />
          </div>
        )}

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, background: CARD, borderRadius: "0 0 16px 16px" }}>
          <button onClick={exportCSV} style={{ width: "100%", padding: 11, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}