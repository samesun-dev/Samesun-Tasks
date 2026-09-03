import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabaseClient";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import TasksPage from "./components/TasksPage";
import ReportsPage from "./components/ReportsPage";

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

const TAB_LABELS = { tasks: "Tasks", history: "History", people: "People", reports: "Reports" };

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

async function invokeCreateUser(body) {
  const { data, error } = await supabase.functions.invoke("create-user", { body });
  if (error) {
    let message = error.message;
    try {
      const parsed = await error.context.json();
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore, fall back to error.message */ }
    return { error: message };
  }
  if (data?.error) return { error: data.error };
  return { data };
}

async function fetchProfile(email) {
  const { data } = await supabase.from("users").select("id,name,email,role,team_id")
    .eq("email", email.toLowerCase().trim()).single();
  return data ?? null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) setUser(await fetchProfile(authUser.email));
      setCheckingSession(false);
    })();
  }, []);

  function handleLogin(u) { setUser(u); }
  async function handleLogout() { await supabase.auth.signOut(); setUser(null); }

  if (window.location.pathname === "/reset-password") return <ResetPasswordScreen />;
  if (checkingSession) return null;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <Main user={user} onLogout={handleLogout} />;
}

// ── LOGIN ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });
    if (authError || !data.user) {
      setLoading(false);
      setError("Wrong email or password.");
      return;
    }
    const profile = await fetchProfile(data.user.email);
    setLoading(false);
    if (!profile) { setError("Signed in, but no matching profile was found. Contact an admin."); return; }
    onLogin(profile);
  }

  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;
  if (showRequest) return <RequestAccessScreen onBack={() => setShowRequest(false)} />;

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
            <div style={{ display: "flex", justifyContent: "center", gap: 6, fontSize: 12 }}>
              <button type="button" onClick={() => setShowForgot(true)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}>
                Forgot password?
              </button>
              <span style={{ color: BORDER }}>·</span>
              <button type="button" onClick={() => setShowRequest(true)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}>
                Request access
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── REQUEST ACCESS ─────────────────────────────────────────
function RequestAccessScreen({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    // Generated client-side (rather than read back via .select() after
    // insert) because anon has no SELECT policy on signup_requests —
    // Postgres RLS applies SELECT policies to INSERT...RETURNING too, so
    // reading the row back here would silently fail.
    const requestId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("signup_requests")
      .insert({ id: requestId, name: name.trim(), email: email.toLowerCase().trim() });
    if (insertError) {
      setLoading(false);
      if (insertError.code === "23505") {
        setError("You've already requested access — an admin will be in touch soon.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    // Best-effort nudge to admins — the request itself is already saved
    // regardless of whether this succeeds, so failures here are silent.
    try {
      // Deployed under this name, not "notify-signup-request" — the
      // Supabase dashboard's rename only changes the display label, not
      // the actual routing slug, so the invoke name has to match what's
      // really live rather than what it's labeled as.
      await supabase.functions.invoke("smart-endpoint", { body: { id: requestId } });
    } catch { /* the People page's pending list is the source of truth */ }
    setLoading(false);
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", marginBottom: 16 }}><SunLogo /></div>
          <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 700, margin: 0 }}>Request access</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>New here? Ask for an account below</p>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: TEXT, fontSize: 13, marginBottom: 16 }}>Thanks! An admin will review your request and email you a link to set up your account.</p>
              <button type="button" onClick={onBack} style={{ width: "100%", padding: 12, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@samesun.com" required style={inputStyle} />
              </div>
              {error && <p style={{ color: "#991B1B", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.4)" }}>
                {loading ? "Submitting…" : "Request access →"}
              </button>
              <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "center" }}>
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD ────────────────────────────────────────
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", marginBottom: 16 }}><SunLogo /></div>
          <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 700, margin: 0 }}>Reset your password</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>We'll email you a link to set a new one</p>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {sent ? (
            <p style={{ color: TEXT, fontSize: 13, textAlign: "center" }}>Check {email} for a reset link.</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@samesun.com" required autoFocus style={inputStyle} />
              </div>
              {error && <p style={{ color: "#991B1B", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.4)" }}>
                {loading ? "Sending…" : "Send reset link →"}
              </button>
            </form>
          )}
          <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "center", width: "100%", marginTop: 16 }}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RESET PASSWORD ─────────────────────────────────────────
function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", marginBottom: 16 }}><SunLogo /></div>
          <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 700, margin: 0 }}>Set your password</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 6 }}>Welcome to Samesun Tasks</p>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: 28, border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: TEXT, fontSize: 13, marginBottom: 16 }}>Password set. You're all set to sign in.</p>
              <a href="/" style={{ color: ACCENT, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Go to sign in →</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required minLength={8} style={inputStyle} />
              </div>
              {error && <p style={{ color: "#991B1B", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(245,166,35,0.4)" }}>
                {loading ? "Saving…" : "Set password →"}
              </button>
            </form>
          )}
        </div>
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
    <div style={{ minHeight: "100vh", background: BG, display: "flex" }}>
      <Sidebar activePage={tab} onNavigate={setTab} onOpenCompleted={() => setShowCompleted(true)} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar pageTitle={TAB_LABELS[tab]} userEmail={user.email} onSignOut={onLogout} />

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 80px" }}>
          {tab === "tasks"   && <TasksPage user={user} />}
          {tab === "history" && <HistoryView />}
          {tab === "people"  && <PeopleView currentUser={user} />}
          {tab === "reports" && <ReportsPage />}
        </div>
      </div>

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
function PeopleView({ currentUser }) {
  const isAdmin = currentUser?.role === "admin";
  const [users, setUsers]                   = useState([]);
  const [teams, setTeams]                   = useState({});
  const [loading, setLoading]               = useState(true);
  const [showAdd, setShowAdd]               = useState(false);
  const [editingUser, setEditingUser]       = useState(null);
  const [invited, setInvited]               = useState(null);
  const [inviteError, setInviteError]       = useState("");
  const [sendingId, setSendingId]           = useState(null);
  const [sendError, setSendError]           = useState("");
  const [requests, setRequests]             = useState([]);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [requestError, setRequestError]     = useState("");
  const [teamWatchers, setTeamWatchers]     = useState([]);
  const [addingWatcherTeam, setAddingWatcherTeam] = useState(null);
  const [watcherError, setWatcherError]     = useState("");

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

  const loadRequests = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from("signup_requests").select("*")
      .eq("status", "pending").order("created_at", { ascending: true });
    setRequests(data ?? []);
  }, [isAdmin]);

  const loadTeamWatchers = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from("team_watchers").select("id, team_id, user_id");
    setTeamWatchers(data ?? []);
  }, [isAdmin]);

  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { loadTeamWatchers(); }, [loadTeamWatchers]);

  async function handleAddTeamWatcher(teamId, userId) {
    if (!userId) return;
    setWatcherError("");
    const { error } = await supabase.from("team_watchers").insert({ team_id: teamId, user_id: userId });
    setAddingWatcherTeam(null);
    if (error) { setWatcherError(error.message); return; }
    loadTeamWatchers();
  }

  async function handleRemoveTeamWatcher(id) {
    setWatcherError("");
    const { error } = await supabase.from("team_watchers").delete().eq("id", id);
    if (error) { setWatcherError(error.message); return; }
    loadTeamWatchers();
  }

  async function handleAddUser(form) {
    const email = form.email.toLowerCase().trim();
    setInviteError("");
    const { error } = await invokeCreateUser({
      name: form.name,
      email,
      team_id: form.team_id || null,
      role: "member",
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setInviteError(error);
      return;
    }
    if (approvingRequest) {
      await supabase.from("signup_requests").update({
        status: "approved", reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(),
      }).eq("id", approvingRequest.id);
      setApprovingRequest(null); loadRequests();
    }
    setInvited(email);
    setShowAdd(false); loadPeople();
  }

  async function handleDismissRequest(request) {
    setRequestError("");
    const { error } = await supabase.from("signup_requests").update({
      status: "dismissed", reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", request.id);
    if (error) { setRequestError(error.message); return; }
    loadRequests();
  }

  async function handleEditUser(form) {
    const email = form.email.toLowerCase().trim();
    await supabase.from("users").update({ name: form.name, email, team_id: form.team_id || null, role: form.role }).eq("id", editingUser.id);
    setEditingUser(null); loadPeople();
  }

  async function handleSendAccess(u) {
    setSendError(""); setSendingId(u.id);
    if (u.has_account) {
      const { error } = await supabase.auth.resetPasswordForEmail(u.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSendingId(null);
      if (error) { setSendError(error.message); return; }
      setInvited(u.email);
      return;
    }
    const { error } = await invokeCreateUser({
      name: u.name,
      email: u.email,
      team_id: u.team_id || null,
      role: u.role || "member",
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingId(null);
    if (error) { setSendError(error); return; }
    setInvited(u.email);
  }

  const initials = name => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: MUTED, fontSize: 13, fontWeight: 500 }}>{users.length} people</p>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{ background: ACCENT, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,166,35,0.35)" }}>+ Add person</button>
        )}
      </div>

      {requestError && <p style={{ color: "#DC2626", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>{requestError}</p>}

      {isAdmin && requests.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: ACCENT, marginBottom: 6 }}>
            🔔 Pending requests · {requests.length}
          </p>
          <div style={{ ...card, background: "#FFFBEB", borderColor: "#FDE68A" }}>
            {requests.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", ...(i < requests.length - 1 ? rowBorder : {}) }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{r.name}</p>
                  <p style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>{r.email}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleDismissRequest(r)} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Dismiss</button>
                  <button onClick={() => setApprovingRequest(r)} style={{ background: ACCENT, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Approve →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
            📧 Overdue email watchers
          </p>
          <div style={card}>
            {Object.values(teams).sort((a, b) => a.name.localeCompare(b.name)).map((t, i, arr) => {
              const watchersForTeam = teamWatchers.filter(w => w.team_id === t.id);
              const watcherUserIds = new Set(watchersForTeam.map(w => w.user_id));
              const availableUsers = users.filter(u => !watcherUserIds.has(u.id));
              return (
                <div key={t.id} style={{ padding: "12px 16px", ...(i < arr.length - 1 ? rowBorder : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: watchersForTeam.length || addingWatcherTeam === t.id ? 8 : 0 }}>
                    <TeamBadge teamSlug={t.slug} teamName={t.name} />
                    {addingWatcherTeam === t.id ? (
                      <select autoFocus defaultValue=""
                        onChange={e => handleAddTeamWatcher(t.id, e.target.value)}
                        onBlur={() => setAddingWatcherTeam(null)}
                        style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                        <option value="" disabled>Choose a person…</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setAddingWatcherTeam(t.id)} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer" }}>+ Add watcher</button>
                    )}
                  </div>
                  {watchersForTeam.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {watchersForTeam.map(w => {
                        const u = users.find(u => u.id === w.user_id);
                        if (!u) return null;
                        return (
                          <span key={w.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: TEXT, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "3px 6px 3px 10px" }}>
                            {u.name}
                            <button onClick={() => handleRemoveTeamWatcher(w.id)} title="Remove" style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>A watcher gets copied on every overdue / due-in-2-days email for that team's tasks — the same emails the assignee already gets.</p>
        </div>
      )}

      {watcherError && <p style={{ color: "#DC2626", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>{watcherError}</p>}

      {sendError && <p style={{ color: "#DC2626", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>{sendError}</p>}

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
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: u.has_account ? "#D1FAE5" : "#F3F4F6", color: u.has_account ? "#065F46" : "#6B7280", fontWeight: 600 }}>
                    {u.has_account ? "Active" : "No account yet"}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleSendAccess(u)}
                        disabled={sendingId === u.id}
                        style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", opacity: sendingId === u.id ? 0.6 : 1 }}
                      >
                        {sendingId === u.id ? "Sending…" : u.has_account ? "Send reset" : "Send invite"}
                      </button>
                      <button onClick={() => setEditingUser(u)} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {invited && (
        <div onClick={() => setInvited(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>✅ Invite sent!</p>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>{invited} will get an email with a link to set their own password.</p>
            <button onClick={() => setInvited(null)} style={{ width: "100%", padding: 12, background: ACCENT, border: "none", color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Done</button>
          </div>
        </div>
      )}

      {showAdd && <UserFormModal mode="add" teams={Object.values(teams)} onSave={handleAddUser} onCancel={() => setShowAdd(false)} error={inviteError} />}
      {approvingRequest && (
        <UserFormModal mode="add" title="Approve request" user={approvingRequest} teams={Object.values(teams)}
          onSave={handleAddUser}
          onCancel={() => setApprovingRequest(null)}
          error={inviteError} />
      )}
      {editingUser && <UserFormModal mode="edit" user={editingUser} teams={Object.values(teams)} onSave={handleEditUser} onDelete={async () => { await supabase.from("users").delete().eq("id", editingUser.id); setEditingUser(null); loadPeople(); }} onCancel={() => setEditingUser(null)} />}
    </div>
  );
}

// ── USER FORM MODAL ────────────────────────────────────────
function UserFormModal({ mode, user, teams, onSave, onDelete, onCancel, error, title }) {
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", team_id: user?.team_id ?? "", role: user?.role ?? "member" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true); await onSave(form); setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onCancel}>
      <div style={{ background: CARD, borderRadius: 16, padding: 22, width: "100%", maxWidth: 440, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ color: TEXT, fontWeight: 700, fontSize: 16 }}>{title ?? (mode === "add" ? "Add person" : "Edit person")}</p>
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
          {mode === "add" && (
            <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>They'll get an email invite to set their own password.</p>
          )}
          {error && <p style={{ color: "#DC2626", fontSize: 12, background: "#FEF2F2", padding: "8px 12px", borderRadius: 8 }}>{error}</p>}
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
