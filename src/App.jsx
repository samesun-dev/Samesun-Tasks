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
  hr:        { bg: "rgba(120,220,150,0.1)", text: "#7dca9a" },
  sales:     { bg: "rgba(245,166,35,0.12)", text: "#F5A623" },
  marketing: { bg: "rgba(255,120,150,0.1)", text: "#f58aaa" },
  growth:    { bg: "rgba(100,180,255,0.1)", text: "#7ab8f5" },
  finance:   { bg: "rgba(100,200,255,0.1)", text: "#6ec6f5" },
  ops:       { bg: "rgba(180,120,255,0.1)", text: "#c49af5" },
};

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked",     label: "Blocked" },
  { value: "completed",   label: "Completed" },
];

const STATUS_STYLES = {
  not_started: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" },
  in_progress: { bg: "rgba(245,166,35,0.1)",  text: "rgba(245,166,35,0.9)" },
  blocked:     { bg: "rgba(220,60,60,0.12)",   text: "#e07070" },
  completed:   { bg: "rgba(100,200,120,0.12)", text: "#7dca9a" },
};

function todayISO() { return new Date().toISOString().split("T")[0]; }

function formatDate(d) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SunLogo() {
  return (
    <div style={{ width: 30, height: 30, background: "#F5A623", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F1523" strokeWidth="2.5" strokeLinecap="round">
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
  const c = TEAM_COLORS[teamSlug] ?? { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" };
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 500, background: c.bg, color: c.text }}>{teamName}</span>;
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.not_started;
  const label = STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 500, background: s.bg, color: s.text }}>{label}</span>;
}

const card  = { background: "#1A2235", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, outline: "none" };
const labelStyle = { display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 5 };
const rowBorder  = { borderBottom: "0.5px solid rgba(255,255,255,0.05)" };
const ghostBtn   = { background: "none", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer" };

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
    <div style={{ minHeight: "100vh", background: "#0F1523", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, background: "#F5A623", borderRadius: 16, marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F1523" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 600, margin: 0 }}>Samesun Tasks</h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 4 }}>Sign in to continue</p>
        </div>
        <div style={{ background: "#1A2235", borderRadius: 16, padding: 24, border: "0.5px solid rgba(255,255,255,0.07)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@samesun.com" required autoFocus style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required style={inputStyle} />
            </div>
            {error && <p style={{ color: "#e07070", fontSize: 12, background: "rgba(220,60,60,0.08)", padding: "8px 12px", borderRadius: 6 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background: "#F5A623", color: "#0F1523", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 16 }}>admin@company.com · admin123</p>
      </div>
    </div>
  );
}

// ── MAIN SHELL ─────────────────────────────────────────────
function Main({ user, onLogout }) {
  const [tab, setTab] = useState("tasks");

  const navBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      background: "none", border: "none", cursor: "pointer", padding: "9px 14px",
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
      borderBottom: tab === key ? "2px solid #F5A623" : "2px solid transparent",
      color: tab === key ? "#F5A623" : "rgba(255,255,255,0.35)",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0F1523" }}>
      <div style={{ background: "#0F1523", borderBottom: "0.5px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SunLogo />
              <div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>Samesun Tasks</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, padding: "5px 10px" }}>{user.name}</span>
              <button onClick={onLogout} style={ghostBtn}>Sign out</button>
            </div>
          </div>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {navBtn("tasks",   "Tasks")}
            {navBtn("history", "History")}
            {navBtn("people",  "People")}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 20px 80px" }}>
        {tab === "tasks"   && <TaskView   user={user} />}
        {tab === "history" && <HistoryView />}
        {tab === "people"  && <PeopleView currentUser={user} />}
      </div>
    </div>
  );
}

// ── TASK VIEW ──────────────────────────────────────────────
function TaskView({ user }) {
  const [activeTeam, setActiveTeam]     = useState("all");
  const [instances, setInstances]       = useState([]);
  const [tasks, setTasks]               = useState({});
  const [teams, setTeams]               = useState({});
  const [users, setUsers]               = useState({});
  const [loading, setLoading]           = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [editingTask, setEditingTask]   = useState(null);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [showReport, setShowReport]     = useState(false);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Team tabs + progress */}
      <div style={{ background: "#0F1523", marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20, borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {TEAMS.map(t => (
            <button key={t.slug} onClick={() => setActiveTeam(t.slug)} style={{
              padding: "8px 12px", fontSize: 11, fontWeight: 500, background: "none", border: "none",
              borderBottom: activeTeam === t.slug ? "2px solid #F5A623" : "2px solid transparent",
              color: activeTeam === t.slug ? "#F5A623" : "rgba(255,255,255,0.3)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{t.name}</button>
          ))}
        </div>
        <div style={{ padding: "8px 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>
            <span>{completed.length} of {filtered.length} tasks done today</span>
            <span style={{ color: "#F5A623", fontWeight: 500 }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
            <div style={{ height: 3, background: "#F5A623", borderRadius: 2, width: `${pct}%`, transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowAddForm(true)} style={{ flex: 1, background: "rgba(245,166,35,0.05)", border: "1px dashed rgba(245,166,35,0.25)", color: "rgba(245,166,35,0.65)", fontSize: 13, padding: 11, borderRadius: 10, cursor: "pointer" }}>
          + Add task
        </button>
        <button onClick={() => setShowReport(true)} style={ghostBtn}>Report</button>
      </div>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 40, fontSize: 13 }}>Loading tasks…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 2px 2px" }}>Pending · {pending.length}</p>
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
              <button onClick={() => setShowCompleted(!showCompleted)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 2px", width: "100%" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Completed · {completed.length}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{showCompleted ? "Hide" : "Show"}</span>
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
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>☀️</div>
              <p style={{ fontSize: 14 }}>No tasks here — add one above</p>
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
    if (preset === "yesterday") {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return [fmt(y), fmt(y)];
    }
    if (preset === "week") {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
      return [fmt(mon), fmt(today)];
    }
    if (preset === "month") {
      return [`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`, fmt(today)];
    }
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
  filtered.forEach(inst => {
    if (!grouped[inst.due_date]) grouped[inst.due_date] = [];
    grouped[inst.due_date].push(inst);
  });

  const done    = filtered.filter(i => i.status === "completed").length;
  const pending = filtered.filter(i => i.status !== "completed").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Preset buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["yesterday","Yesterday"],["week","This week"],["month","This month"],["custom","Custom range"]].map(([key, label]) => (
          <button key={key} onClick={() => setPreset(key)} style={{
            padding: "6px 12px", fontSize: 12, borderRadius: 6, cursor: "pointer", fontWeight: 500,
            background: preset === key ? "#F5A623" : "rgba(255,255,255,0.05)",
            color: preset === key ? "#0F1523" : "rgba(255,255,255,0.5)",
            border: preset === key ? "none" : "0.5px solid rgba(255,255,255,0.1)",
          }}>{label}</button>
        ))}
      </div>

      {/* Custom date range */}
      {preset === "custom" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inputStyle, colorScheme: "dark", flex: 1 }} />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, colorScheme: "dark", flex: 1 }} />
          <button onClick={loadHistory} style={{ ...ghostBtn, whiteSpace: "nowrap" }}>Apply</button>
        </div>
      )}

      {/* Team filter */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
        {TEAMS.map(t => (
          <button key={t.slug} onClick={() => setActiveTeam(t.slug)} style={{
            padding: "5px 10px", fontSize: 11, borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap",
            background: activeTeam === t.slug ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
            color: activeTeam === t.slug ? "#F5A623" : "rgba(255,255,255,0.35)",
            border: activeTeam === t.slug ? "0.5px solid rgba(245,166,35,0.3)" : "0.5px solid rgba(255,255,255,0.08)",
          }}>{t.name}</button>
        ))}
      </div>

      {/* Summary */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[["Completed", done, "#7dca9a", "rgba(100,200,120,0.08)"], ["Not done", pending, "#F5A623", "rgba(245,166,35,0.08)"]].map(([label, val, color, bg]) => (
            <div key={label} style={{ background: bg, border: `0.5px solid ${color}22`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{val}</p>
              <p style={{ fontSize: 11, color, opacity: 0.7, margin: "2px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
          <p style={{ fontSize: 14 }}>No tasks found for this period</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayInstances]) => (
          <div key={date}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              {formatDate(date)}
            </p>
            <div style={card}>
              {dayInstances.map((inst, i) => {
                const task = tasks[inst.task_id];
                const team = task ? teams[task.team_id] : null;
                const completedBy = users[inst.completed_by];
                const time = inst.completed_at ? new Date(inst.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", ...(i < dayInstances.length - 1 ? rowBorder : {}) }}>
                    <StatusBadge status={inst.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>{task?.title ?? "—"}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                        {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
                        {task?.frequency && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{task.frequency}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {completedBy && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 500 }}>{completedBy.name.split(" ")[0]}</p>}
                      {time && <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>{time}</p>}
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
      name: form.name, email: form.email,
      team_id: form.team_id || null, role: form.role,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{users.length} people</p>
        <button onClick={() => setShowAdd(true)} style={{ background: "#F5A623", border: "none", color: "#0F1523", fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
          + Add person
        </button>
      </div>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 40, fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={card}>
          {users.map((u, i) => {
            const team = teams[u.team_id];
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", ...(i < users.length - 1 ? rowBorder : {}) }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,166,35,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#F5A623" }}>{initials(u.name)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{u.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1 }}>{u.email}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
                  {u.role === "admin" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(245,166,35,0.1)", color: "#F5A623" }}>admin</span>}
                  <button onClick={() => setEditingUser(u)} style={{ background: "none", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", fontSize: 10, padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New credentials popup */}
      {newCredentials && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#1A2235", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>✅ Person added!</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16 }}>Share these login details with {newCredentials.name}:</p>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>URL</p>
              <p style={{ color: "#F5A623", fontSize: 13, fontWeight: 500, marginBottom: 10 }}>samesun-tasks.vercel.app</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Email</p>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{newCredentials.email}</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Password</p>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{newCredentials.password}</p>
            </div>
            <button onClick={() => setNewCredentials(null)} style={{ width: "100%", padding: 11, background: "#F5A623", border: "none", color: "#0F1523", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <UserFormModal mode="add" teams={Object.values(teams)} onSave={handleAddUser} onCancel={() => setShowAdd(false)} />
      )}
      {editingUser && (
        <UserFormModal mode="edit" user={editingUser} teams={Object.values(teams)}
          onSave={handleEditUser}
          onDelete={() => handleDeleteUser(editingUser.id)}
          onCancel={() => setEditingUser(null)} />
      )}
    </div>
  );
}

// ── USER FORM MODAL ────────────────────────────────────────
function UserFormModal({ mode, user, teams, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    name:     user?.name     ?? "",
    email:    user?.email    ?? "",
    password: "",
    team_id:  user?.team_id  ?? "",
    role:     user?.role     ?? "member",
  });
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (mode === "add" && !form.password.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: "#1A2235", borderRadius: 16, padding: 20, width: "100%", maxWidth: 420, border: "0.5px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{mode === "add" ? "Add person" : "Edit person"}</p>
          {mode === "edit" && (
            !confirm
              ? <button onClick={() => setConfirm(true)} style={{ background: "none", border: "none", color: "rgba(220,100,100,0.6)", fontSize: 11, cursor: "pointer" }}>Remove</button>
              : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sure?</span>
                  <button onClick={onDelete} style={{ background: "none", border: "none", color: "#e07070", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Yes, remove</button>
                  <button onClick={() => setConfirm(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer" }}>Cancel</button>
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
            <label style={labelStyle}>{mode === "add" ? "Password" : "New password (leave blank to keep current)"}</label>
            <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
              placeholder={mode === "add" ? "Set a password" : "Leave blank to keep current"} style={inputStyle} />
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
          <button onClick={onCancel} style={{ flex: 1, padding: 11, background: "none", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 11, background: "#F5A623", border: "none", color: "#0F1523", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.4 : 1 }}>
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 14px" }}>
        <button onClick={onComplete} style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.18)", background: "none", cursor: "pointer", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{task.title}</span>
              {task.is_private && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginLeft: 6 }}>🔒</span>}
              {isOverdue && <span style={{ color: "#e07070", fontSize: 10, marginLeft: 6, fontWeight: 500 }}>Overdue</span>}
            </div>
            <button onClick={onEdit} style={{ background: "none", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", fontSize: 10, padding: "3px 7px", borderRadius: 4, cursor: "pointer", flexShrink: 0 }}>Edit</button>
          </div>

          {task.description && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>{task.description}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, alignItems: "center" }}>
            {team && <TeamBadge teamSlug={team.slug} teamName={team.name} />}
            {task.status && task.status !== "not_started" && <StatusBadge status={task.status} />}
            {task.frequency && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{task.frequency}</span>}
            {assignedTo && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>👤 {assignedTo.name.split(" ")[0]}</span>}
            {task.location && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>📍 {task.location}</span>}
          </div>

          {expanded && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 7, display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                ["Date added", task.created_at ? formatDate(task.created_at.split("T")[0]) : null],
                ["Start date", task.start_date ? formatDate(task.start_date) : null],
                ["Due date",   task.end_date   ? formatDate(task.end_date)   : null],
                ["Assigned",   assignedTo?.name],
                ["Location",   task.location],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 8, fontSize: 11 }}>
                  <span style={{ color: "rgba(255,255,255,0.3)", width: 76, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 7 }}>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", padding: 0 }}>
              {expanded ? "Hide details" : "Details"}
            </button>
            <button onClick={() => setShowNote(!showNote)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, cursor: "pointer", padding: 0 }}>
              {showNote ? "Hide note" : instance.notes ? "Edit note" : "+ Note"}
            </button>
          </div>

          {showNote && (
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} onBlur={saveNote}
              placeholder="Add a note…" rows={2}
              style={{ marginTop: 8, width: "100%", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,0.65)", fontSize: 11, resize: "none", outline: "none" }} />
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
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", ...(isLast ? {} : rowBorder) }}>
      <button onClick={onUncomplete} style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(245,166,35,0.15)", border: "1.5px solid rgba(245,166,35,0.3)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textDecoration: "line-through" }}>{task.title}</span>
        {team && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, marginLeft: 6 }}>{team.name}</span>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {completedBy && <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 500 }}>{completedBy.name.split(" ")[0]}</p>}
        {time && <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>{time}</p>}
      </div>
    </div>
  );
}

// ── COMPLETE MODAL ─────────────────────────────────────────
function CompleteModal({ task, users, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: "#1A2235", borderRadius: 16, padding: 20, width: "100%", maxWidth: 400, border: "0.5px solid rgba(255,255,255,0.08)" }} onClick={e => e.stopPropagation()}>
        <p style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Who completed this?</p>
        {task && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 16 }}>{task.title}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 260, overflowY: "auto" }}>
          {users.map(u => (
            <button key={u.id} onClick={() => onConfirm(u.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(245,166,35,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#F5A623" }}>{u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{u.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ width: "100%", marginTop: 12, padding: 10, background: "none", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>Cancel</button>
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
        ["Status", "status", STATUS_OPTIONS.map(o => [o.value, o.label])],
        ["Team",   "team_id", [["", "No team"], ...teams.map(t => [t.id, t.name])]],
        ["Assign to", "assigned_to", [["", "Unassigned"], ...users.map(u => [u.id, u.name])]],
        ["Repeats", "frequency", [["","One-off (no repeat)"],["daily","Daily"],["weekly","Weekly"],["biweekly","Bi-weekly"],["monthly","Monthly"]]],
      ].map(([lbl, key, opts]) => (
        <div key={key}>
          <label style={labelStyle}>{lbl}</label>
          <select value={form[key]} onChange={e => update(key, e.target.value)} style={sel}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
            <input type="date" value={form[key]} onChange={e => update(key, e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={form.is_private} onChange={e => update("is_private", e.target.checked)} style={{ accentColor: "#F5A623" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>🔒 Private — only visible to me</span>
      </label>
    </div>
  );
}

// ── TASK FORM MODAL ────────────────────────────────────────
function TaskFormModal({ mode, task, teams, users, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title:       task?.title       ?? "",
    description: task?.description ?? "",
    team_id:     task?.team_id     ?? "",
    frequency:   task?.frequency   ?? "",
    location:    task?.location    ?? "",
    is_private:  task?.is_private  ?? false,
    assigned_to: task?.assigned_to ?? "",
    start_date:  task?.start_date  ?? "",
    end_date:    task?.end_date    ?? "",
    status:      task?.status      ?? "not_started",
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: "#1A2235", borderRadius: 16, padding: 20, width: "100%", maxWidth: 420, border: "0.5px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{mode === "edit" ? "Edit task" : "Add task"}</p>
          {mode === "edit" && (
            !confirm
              ? <button onClick={() => setConfirm(true)} style={{ background: "none", border: "none", color: "rgba(220,100,100,0.6)", fontSize: 11, cursor: "pointer" }}>Delete</button>
              : <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Sure?</span>
                  <button onClick={onDelete} style={{ background: "none", border: "none", color: "#e07070", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Yes</button>
                  <button onClick={() => setConfirm(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer" }}>No</button>
                </div>
          )}
        </div>
        <TaskFormFields form={form} update={update} teams={teams} users={users} />
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 11, background: "none", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{ flex: 1, padding: 11, background: "#F5A623", border: "none", color: "#0F1523", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: !form.title.trim() || saving ? 0.4 : 1 }}>
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
    const blob = new Blob([[header, ...rows.map(r =>
      `"${r.task}","${r.team}","${r.status}","${r.assigned_to}","${r.completed_by}","${r.completed_at}","${r.frequency}","${r.due_date}","${r.location}"`
    )].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `samesun-tasks-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const done = rows.filter(r => r.status === "completed").length;
  const pending = rows.filter(r => r.status !== "completed").length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: "#1A2235", borderRadius: 16, padding: 20, width: "100%", maxWidth: 520, border: "0.5px solid rgba(255,255,255,0.08)", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Today's Report</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["Completed", done, "#7dca9a", "rgba(100,200,120,0.08)"],["Still to do", pending, "#F5A623", "rgba(245,166,35,0.08)"]].map(([label, val, color, bg]) => (
            <div key={label} style={{ background: bg, border: `0.5px solid ${color}33`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0 }}>{val}</p>
              <p style={{ fontSize: 11, color, opacity: 0.7, margin: "2px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>{r.task}</p>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 2 }}>
                  {r.team} · {r.frequency}{r.assigned_to !== "—" ? ` · 👤 ${r.assigned_to}` : ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <StatusBadge status={r.status} />
                {r.completed_by !== "—" && <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 3 }}>{r.completed_by}</p>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={exportCSV} style={{ width: "100%", padding: 12, background: "#F5A623", border: "none", color: "#0F1523", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Export CSV
        </button>
      </div>
    </div>
  );
}