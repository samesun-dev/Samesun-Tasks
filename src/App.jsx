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
  { value: "blocked",     label: "Blocked" },
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

const BG       = "#FAFAF8";
const CARD     = "#FFFFFF";
const NAVY     = "#0F1523";
const ACCENT   = "#F5A623";
const BORDER   = "#EEEDE9";
const TEXT     = "#1A2235";
const MUTED    = "#9CA3AF";
const DANGER   = "#991B1B";

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
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
            {error && <p style={{ color: DANGER, fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</p>}
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

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ background: NAVY, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px" }}>
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
              <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "5px 12px", borderRadius: 7, cursor: "pointer" }}>
                Sign out
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {[["tasks","Tasks"],["history","History"],["people","People"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 16px",
                fontSize: 13, fontWeight: 600, color: tab === key ? ACCENT : "rgba(255,255,255,0.45)",
                borderBottom: tab === key ? `2px solid ${ACCENT}` : "2px solid transparent",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 80px" }}>
        {tab === "tasks"   && <TaskView   user={user} />}
        {tab === "history" && <HistoryView />}
        {tab === "people"  && <PeopleView currentUser={user} />}
      </div>
    </div>
  );
}

// ── TASK VIEW ──────────────────────────────────────────────
function TaskView({ user }) {
  const [activeTeam, setActiveTeam]       = useState("all");
  const [instances, setInstances]         = useState([]);
  const [tasks, setTasks]                 = useState({});
  const [teams, setTeams]                 = useState({});
  const [users, setUsers]                 = useState({});
  const [loading, setLoading]             = useState(true);
  const [completingId, setCompletingId]   = useState(null);
  const [editingTask, setEditingTask]     = useState(null);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const today = todayISO();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: teamData }, { data: userData }, { data: instanceData }] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("users").select("id,name,email,team_id"),
      supabase.from("task_instances").select("*").eq("due_date", today).order("created_at"),
    ]);
    const teamMap = {}; teamData?.forEach(t => { teamMap[t.id] = t; }); setTeams(teamMap);
    const userMap = {}; userData?.forEach(u => { userMap[u.id] = u; }); setUsers(userMap);
    if (!instanceData?.length) { setInstances([]); setLoading(false); return; }
    const taskIds = [...new Set(instanceData.map(i => i.task_id))];
    const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
    const taskMap = {}; taskData?.forEach(t => { taskMap[t.id] = t; }); setTasks(taskMap);
    setInstances(instanceData); setLoading(false);
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = instances.filter(inst => {
    const task = tasks[inst.task_id];
    if (!task) return false;
    if (task.is_private && task.created_by !== user.id) return false;
    if (activeTeam === "all") return true;
    return teams[task.team_id]?.slug === activeTeam;
  });

  const completed = filtered.filter(i => i.status === "completed");
  const pending   = filtered.filter(i => i.status !== "completed");
  const pct = filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Progress card */}
      <div style={{ background: NAVY, borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
          <span>{completed.length} of {filtered.length} tasks done today</span>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
          <div style={{ height: 6, background: ACCENT, borderRadius: 3, width: `${pct}%`, transition: "width 0.4s", boxShadow: "0 0 8px rgba(245,166,35,0.5)" }} />
        </div>
      </div>

      {/* Team tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {TEAMS.map(t => (
          <button key={t.slug} onClick={() => setActiveTeam(t.slug)} style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            background: activeTeam === t.slug ? ACCENT : CARD,
            color: activeTeam === t.slug ? "#fff" : MUTED,
            border: activeTeam === t.slug ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
            boxShadow: activeTeam === t.slug ? "0 2px 8px rgba(245,166,35,0.3)" : "none",
          }}>{t.name}</button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowAddForm(true)} style={{
          flex: 1, background: ACCENT, border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
          padding: "11px", borderRadius: 10, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,166,35,0.35)",
        }}>+ Add task</button>
        <button onClick={() => setShowReport(true)} style={ghostBtn}>Report</button>
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading tasks…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Pending · {pending.length}</p>
              <div style={card}>
                {pending.map((inst, i) => (
                  <TaskRow key={inst.id} instance={inst} task={tasks[inst.task_id]}
                    teams={teams} users={users} isLast={i === pending.length - 1}
                    onComplete={() => setCompletingId(inst.id)}
                    onEdit={() => setEditingTask(tasks[inst.task_id])}
                    onStatusChange={async status => { await supabase.from("task_instances").update({ status }).eq("id", inst.id); loadData(); }} />
                ))}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <button onClick={() => setShowCompleted(!showCompleted)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "2px 0" }}>
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Completed · {completed.length}</span>
                <span style={{ fontSize: 11, color: MUTED }}>{showCompleted ? "Hide ↑" : "Show ↓"}</span>
              </button>
              {showCompleted && (
                <div style={card}>
                  {completed.map((inst, i) => (
                    <CompletedRow key={inst.id} instance={inst} task={tasks[inst.task_id]}
                      teams={teams} users={users} isLast={i === completed.length - 1}
                      onUncomplete={async () => {
                        await supabase.from("task_instances").update({ status: "not_started", completed_by: null, completed_at: null }).eq("id", inst.id);
                        loadData();
                      }} />
                  ))}
                </div>
              )}
            </>
          )}

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>☀️</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>All clear!</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>No tasks here — add one above</p>
            </div>
          )}
        </>
      )}

      {completingId && (
        <CompleteModal
          instance={instances.find(i => i.id === completingId)}
          task={tasks[instances.find(i => i.id === completingId)?.task_id]}
          users={Object.values(users)}
          onConfirm={async userId => {
            await supabase.from("task_instances").update({ status: "completed", completed_by: userId, completed_at: new Date().toISOString() }).eq("id", completingId);
            setCompletingId(null); loadData();
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
        <ReportModal instances={instances} tasks={tasks} teams={teams} users={users} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

// ── HISTORY VIEW ───────────────────────────────────────────
function HistoryView() {
  const [instances, setInstances] = useState([]);
  const [tasks, setTasks]         = useState({});
  const [teams, setTeams]         = useState({});
  const [users, setUsers]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [activeTeam, setActiveTeam] = useState("all");
  const [preset, setPreset]       = useState("yesterday");
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");

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
            background: preset === key ? ACCENT : CARD,
            color: preset === key ? "#fff" : MUTED,
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
            background: activeTeam === t.slug ? NAVY : CARD,
            color: activeTeam === t.slug ? "#fff" : MUTED,
            border: activeTeam === t.slug ? `1px solid ${NAVY}` : `1px solid ${BORDER}`,
          }}>{t.name}</button>
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Completed", done, "#065F46", "#D1FAE5", "#6EE7B7"],["Not done", pending, "#92400E", "#FEF3C7", "#FCD34D"]].map(([label, val, text, bg, border]) => (
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
function PeopleView({ currentUser }) {
  const [users, setUsers]           = useState([]);
  const [teams, setTeams]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
    const { data } = await supabase.from("users").insert({
      name: form.name, email: form.email, password: form.password,
      team_id: form.team_id || null, role: "member",
    }).select().single();
    if (data) setNewCredentials({ name: form.name, email: form.email, password: form.password });
    setShowAdd(false); loadPeople();
  }

  async function handleEditUser(form) {
    await supabase.from("users").update({
      name: form.name, email: form.email, team_id: form.team_id || null, role: form.role,
      ...(form.password ? { password: form.password } : {}),
    }).eq("id", editingUser.id);
    setEditingUser(null); loadPeople();
  }

  async function handleDeleteUser(id) {
    await supabase.from("users").delete().eq("id", id);
    setEditingUser(null); loadPeople();
  }

  const initials = name => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: MUTED, fontSize: 13, fontWeight: 500 }}>{users.length} people</p>
        <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
          + Add person
        </button>
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p>
      ) : (
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
              <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>URL</p>
              <p style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>samesun-tasks.vercel.app</p>
              <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Email</p>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{newCredentials.email}</p>
              <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Password</p>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{newCredentials.password}</p>
            </div>
            <button onClick={() => setNewCredentials(null)} style={{ width: "100%", padding: 12, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
              Done
            </button>
          </div>
        </div>
      )}

      {showAdd && <UserFormModal mode="add" teams={Object.values(teams)} onSave={handleAddUser} onCancel={() => setShowAdd(false)} />}
      {editingUser && (
        <UserFormModal mode="edit" user={editingUser} teams={Object.values(teams)}
          onSave={handleEditUser} onDelete={() => handleDeleteUser(editingUser.id)} onCancel={() => setEditingUser(null)} />
      )}
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
                <button onClick={onDelete} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Yes, remove</button>
                <button onClick={() => setConfirm(false)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
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
            <input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder={mode === "add" ? "Set a password" : "Leave blank to keep current"} style={inputStyle} />
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
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 11, background: ACCENT, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
            {saving ? "Saving…" : mode === "add" ? "Add person" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TASK ROW ───────────────────────────────────────────────
function TaskRow({ instance, task, teams, users, isLast, onComplete, onEdit, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(instance.notes || "");
  if (!task) return null;

  const team       = teams[task.team_id];
  const assignedTo = users[task.assigned_to];
  const isOverdue  = task.end_date && new Date(task.end_date) < new Date();

  async function saveNote() {
    await supabase.from("task_instances").update({ notes: noteText }).eq("id", instance.id);
  }

  return (
    <div style={isLast ? {} : rowBorder}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
        <button onClick={onComplete} style={{
          width: 22, height: 22, borderRadius: "50%", border: `2px solid ${BORDER}`,
          background: "#fff", cursor: "pointer", flexShrink: 0, marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{task.title}</span>
              {task.is_private && <span style={{ color: MUTED, fontSize: 11, marginLeft: 6 }}>🔒</span>}
              {isOverdue && <span style={{ color: "#DC2626", fontSize: 11, marginLeft: 6, fontWeight: 600, background: "#FEF2F2", padding: "1px 6px", borderRadius: 4 }}>Overdue</span>}
            </div>
            <button onClick={onEdit} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "3px 8px", borderRadius: 5, cursor: "pointer", flexShrink: 0, fontWeight: 500 }}>Edit</button>
          </div>

          {task.description && <p style={{ color: MUTED, fontSize: 12, margin: "4px 0 0", lineHeight: 1.5 }}>{task.description}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
            {task.status && task.status !== "not_started" && <StatusBadge status={task.status} />}
            {task.frequency && <span style={{ fontSize: 11, color: MUTED, background: "#F3F4F6", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>{task.frequency}</span>}
            {assignedTo && <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>👤 {assignedTo.name.split(" ")[0]}</span>}
            {task.location && <span style={{ fontSize: 11, color: MUTED }}>📍 {task.location}</span>}
          </div>

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

          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>
              {expanded ? "Hide details" : "Details"}
            </button>
            <button onClick={() => setShowNote(!showNote)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>
              {showNote ? "Hide note" : instance.notes ? "Edit note" : "+ Note"}
            </button>
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

// ── COMPLETED ROW ──────────────────────────────────────────
function CompletedRow({ instance, task, teams, users, isLast, onUncomplete }) {
  if (!task) return null;
  const team        = teams[task.team_id];
  const completedBy = users[instance.completed_by];
  const time        = instance.completed_at ? new Date(instance.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", ...(isLast ? {} : rowBorder) }}>
      <button onClick={onUncomplete} style={{ width: 22, height: 22, borderRadius: "50%", background: "#D1FAE5", border: "2px solid #6EE7B7", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: MUTED, fontSize: 13, textDecoration: "line-through" }}>{task.title}</span>
        {team && <span style={{ color: MUTED, fontSize: 11, marginLeft: 6, opacity: 0.6 }}>{team.name}</span>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {completedBy && <p style={{ color: TEXT, fontSize: 12, fontWeight: 600 }}>{completedBy.name.split(" ")[0]}</p>}
        {time && <p style={{ color: MUTED, fontSize: 11 }}>{time}</p>}
      </div>
    </div>
  );
}

// ── COMPLETE MODAL ─────────────────────────────────────────
function CompleteModal({ task, users, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 420, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Who completed this?</p>
        {task && <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>{task.title}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {users.map(u => (
            <button key={u.id} onClick={() => onConfirm(u.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#FEF3C7", border: "2px solid #FCD34D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#92400E" }}>{u.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
              </div>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{u.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ width: "100%", marginTop: 12, padding: 11, background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Cancel</button>
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
        ["Status","status", STATUS_OPTIONS.map(o => [o.value, o.label])],
        ["Team","team_id", [["","No team"],...teams.map(t=>[t.id,t.name])]],
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
  const [saving, setSaving] = useState(false);
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
          <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{ flex: 1, padding: 11, background: ACCENT, border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: !form.title.trim() || saving ? 0.5 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── REPORT MODAL ───────────────────────────────────────────
function ReportModal({ instances, tasks, teams, users, onClose }) {
  const rows = instances.map(inst => {
    const task = tasks[inst.task_id];
    const team = task ? teams[task.team_id] : null;
    return {
      task: task?.title ?? "—", team: team?.name ?? "—", status: inst.status,
      assigned_to: users[task?.assigned_to]?.name ?? "—",
      completed_by: users[inst.completed_by]?.name ?? "—",
      completed_at: inst.completed_at ? new Date(inst.completed_at).toLocaleString("en-GB") : "—",
      frequency: task?.frequency ?? "one-off",
      due_date: task?.end_date ? formatDate(task.end_date) : "—",
      location: task?.location ?? "—",
    };
  });

  function exportCSV() {
    const header = "Task,Team,Status,Assigned To,Completed By,Completed At,Frequency,Due Date,Location";
    const blob = new Blob([[header,...rows.map(r=>`"${r.task}","${r.team}","${r.status}","${r.assigned_to}","${r.completed_by}","${r.completed_at}","${r.frequency}","${r.due_date}","${r.location}"`)].join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `samesun-tasks-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const done = rows.filter(r => r.status === "completed").length;
  const pending = rows.filter(r => r.status !== "completed").length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 520, border: `1px solid ${BORDER}`, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>Today's Report</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["Completed", done, "#065F46","#D1FAE5","#6EE7B7"],["Still to do", pending,"#92400E","#FEF3C7","#FCD34D"]].map(([label,val,text,bg,border]) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 30, fontWeight: 800, color: text, margin: 0 }}>{val}</p>
              <p style={{ fontSize: 12, color: text, margin: "3px 0 0", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{r.task}</p>
                <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{r.team} · {r.frequency}{r.assigned_to !== "—" ? ` · 👤 ${r.assigned_to}` : ""}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <StatusBadge status={r.status} />
                {r.completed_by !== "—" && <p style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{r.completed_by}</p>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={exportCSV} style={{ width: "100%", padding: 12, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>
          Export CSV
        </button>
      </div>
    </div>
  );
}