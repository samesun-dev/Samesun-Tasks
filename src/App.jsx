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

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started", color: "bg-slate-100 text-slate-600" },
  { value: "in_progress", label: "In progress", color: "bg-amber-100 text-amber-700" },
  { value: "blocked",     label: "Blocked",     color: "bg-red-100 text-red-700" },
  { value: "completed",   label: "Completed",   color: "bg-green-100 text-green-700" },
];

function todayISO() { return new Date().toISOString().split("T")[0]; }

function formatDate(d) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("task_user")); } catch { return null; }
  });

  function handleLogin(userData) {
    localStorage.setItem("task_user", JSON.stringify(userData));
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem("task_user");
    setUser(null);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <TaskView user={user} onLogout={handleLogout} />;
}

// ── LOGIN ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data } = await supabase
      .from("users")
      .select("id, name, email, role, team_id")
      .eq("email", email.toLowerCase().trim())
      .eq("password", password)
      .single();
    setLoading(false);
    if (!data) { setError("Wrong email or password."); return; }
    onLogin(data);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500 mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Team Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base
                           focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50
                         text-white font-semibold py-3 rounded-xl text-base transition-colors">
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-500 text-xs mt-4">
          Default login: admin@company.com / admin123
        </p>
      </div>
    </div>
  );
}

// ── TASK VIEW ──────────────────────────────────────────────
function TaskView({ user, onLogout }) {
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
  const today = todayISO();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: teamData }, { data: userData }, { data: instanceData }] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("users").select("id, name, email, team_id"),
      supabase.from("task_instances").select("*").eq("due_date", today).order("created_at"),
    ]);

    const teamMap = {};
    teamData?.forEach(t => { teamMap[t.id] = t; });
    setTeams(teamMap);

    const userMap = {};
    userData?.forEach(u => { userMap[u.id] = u; });
    setUsers(userMap);

    if (!instanceData?.length) { setInstances([]); setLoading(false); return; }

    const taskIds = [...new Set(instanceData.map(i => i.task_id))];
    const { data: taskData } = await supabase.from("tasks").select("*").in("id", taskIds);
    const taskMap = {};
    taskData?.forEach(t => { taskMap[t.id] = t; });
    setTasks(taskMap);
    setInstances(instanceData);
    setLoading(false);
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = instances.filter(inst => {
    const task = tasks[inst.task_id];
    if (!task) return false;
    if (task.is_private && task.created_by !== user.id) return false;
    if (activeTeam === "all") return true;
    const team = teams[task.team_id];
    return team?.slug === activeTeam;
  });

  const completed = filtered.filter(i => i.status === "completed");
  const pending   = filtered.filter(i => i.status !== "completed");
  const progressPct = filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-lg">✅</span>
            <span className="font-bold text-lg">Team Tasks</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">{user.name}</span>
            <button onClick={() => setShowReport(true)}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 transition-colors">
              Report
            </button>
            <button onClick={onLogout}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 transition-colors">
              Sign out
            </button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {TEAMS.map(team => (
            <button key={team.slug} onClick={() => setActiveTeam(team.slug)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                          ${activeTeam === team.slug
                            ? "border-violet-400 text-violet-400"
                            : "border-transparent text-slate-400 hover:text-white"}`}>
              {team.name}
            </button>
          ))}
        </div>
        <div className="max-w-3xl mx-auto px-4 py-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{completed.length} of {filtered.length} tasks done today</span>
            <span className="text-violet-400 font-medium">{progressPct}%</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-24">
        <button onClick={() => setShowAddForm(true)}
          className="w-full bg-white border-2 border-dashed border-slate-300 hover:border-violet-400
                     text-slate-500 hover:text-violet-600 rounded-xl py-3 text-sm font-medium
                     transition-colors flex items-center justify-center gap-2">
          <span className="text-lg">+</span> Add task
        </button>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading tasks…</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {pending.map(inst => (
                  <TaskRow key={inst.id} instance={inst} task={tasks[inst.task_id]}
                    teams={teams} users={users} currentUser={user}
                    onComplete={() => setCompletingId(inst.id)}
                    onEdit={() => setEditingTask(tasks[inst.task_id])}
                    onStatusChange={async status => {
                      await supabase.from("task_instances").update({ status }).eq("id", inst.id);
                      loadData();
                    }} />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <details className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <summary className="px-4 py-3 text-sm font-semibold text-slate-500 cursor-pointer
                                    flex items-center justify-between list-none">
                  <span className="flex items-center gap-2">
                    ✅ Completed
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      {completed.length}
                    </span>
                  </span>
                  <span className="text-slate-400 text-xs">Show / Hide</span>
                </summary>
                <div className="divide-y divide-slate-100">
                  {completed.map(inst => (
                    <CompletedRow key={inst.id} instance={inst}
                      task={tasks[inst.task_id]} teams={teams} users={users}
                      onUncomplete={async () => {
                        await supabase.from("task_instances").update({
                          status: "not_started",
                          completed_by: null,
                          completed_at: null,
                        }).eq("id", inst.id);
                        loadData();
                      }} />
                  ))}
                </div>
              </details>
            )}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-medium">No tasks here</p>
                <p className="text-sm mt-1">Add one using the button above</p>
              </div>
            )}
          </>
        )}
      </main>

      {completingId && (
        <CompleteModal
          instance={instances.find(i => i.id === completingId)}
          task={tasks[instances.find(i => i.id === completingId)?.task_id]}
          users={Object.values(users)}
          onConfirm={async (userId) => {
            await supabase.from("task_instances").update({
              status: "completed",
              completed_by: userId,
              completed_at: new Date().toISOString(),
            }).eq("id", completingId);
            setCompletingId(null);
            loadData();
          }}
          onCancel={() => setCompletingId(null)} />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          teams={Object.values(teams)}
          users={Object.values(users)}
          onSave={async updates => {
            await supabase.from("tasks").update({
              title:       updates.title,
              description: updates.description || null,
              team_id:     updates.team_id || null,
              location:    updates.location || null,
              assigned_to: updates.assigned_to || null,
              frequency:   updates.frequency || null,
              type:        updates.frequency ? "recurring" : "one_off",
              start_date:  updates.start_date || null,
              end_date:    updates.end_date || null,
              status:      updates.status,
              is_private:  updates.is_private,
            }).eq("id", editingTask.id);
            setEditingTask(null);
            loadData();
          }}
          onDelete={async () => {
            await supabase.from("tasks").update({ is_active: false }).eq("id", editingTask.id);
            setEditingTask(null);
            loadData();
          }}
          onCancel={() => setEditingTask(null)} />
      )}

      {showAddForm && (
        <AddTaskModal user={user} teams={Object.values(teams)} users={Object.values(users)}
          onSave={async taskData => {
            const { data: newTask } = await supabase.from("tasks").insert({
              title:       taskData.title,
              description: taskData.description || null,
              team_id:     taskData.team_id || null,
              type:        taskData.frequency ? "recurring" : "one_off",
              frequency:   taskData.frequency || null,
              location:    taskData.location || null,
              is_private:  taskData.is_private,
              assigned_to: taskData.assigned_to || null,
              start_date:  taskData.start_date || null,
              end_date:    taskData.end_date || null,
              status:      "not_started",
              created_by:  user.id,
              is_active:   true,
            }).select().single();
            if (newTask) {
              await supabase.from("task_instances").insert({
                task_id:  newTask.id,
                status:   "not_started",
                due_date: today,
              });
            }
            setShowAddForm(false);
            loadData();
          }}
          onCancel={() => setShowAddForm(false)} />
      )}

      {showReport && (
        <ReportModal instances={instances} tasks={tasks} teams={teams} users={users}
          onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

// ── TASK ROW ───────────────────────────────────────────────
function TaskRow({ instance, task, teams, users, currentUser, onComplete, onEdit, onStatusChange }) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText]   = useState(instance.notes || "");
  const [expanded, setExpanded]   = useState(false);
  if (!task) return null;

  const team        = teams[task.team_id];
  const assignedTo  = users[task.assigned_to];
  const createdAt   = task.created_at ? formatDate(task.created_at.split("T")[0]) : null;
  const isInProgress = instance.status === "in_progress";
  const isOverdue   = task.end_date && new Date(task.end_date) < new Date();

  async function saveNote() {
    await supabase.from("task_instances").update({ notes: noteText }).eq("id", instance.id);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button onClick={onComplete}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                      ${isInProgress ? "border-violet-400 bg-violet-50" : "border-slate-300 hover:border-violet-400"}`}>
          {isInProgress && <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-900 text-sm font-medium">{task.title}</span>
              {task.is_private && <span className="text-xs text-slate-400">🔒</span>}
              {isOverdue && <span className="text-xs text-red-500 font-medium">Overdue</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onEdit}
                className="text-xs text-slate-400 hover:text-violet-600 px-2 py-0.5 rounded-lg
                           hover:bg-violet-50 transition-colors border border-transparent hover:border-violet-200">
                Edit
              </button>
              <button onClick={() => onStatusChange(isInProgress ? "not_started" : "in_progress")}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors
                            ${isInProgress ? "bg-violet-100 border-violet-300 text-violet-700"
                                          : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                {isInProgress ? "In progress" : "Start"}
              </button>
            </div>
          </div>

          {task.description && <p className="text-slate-500 text-xs mt-0.5">{task.description}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {team && (
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                {team.name}
              </span>
            )}
            {task.status && <StatusBadge status={task.status} />}
            {task.frequency && <span className="text-xs text-slate-400 capitalize">{task.frequency}</span>}
            {assignedTo && <span className="text-xs text-slate-500">👤 {assignedTo.name}</span>}
            {task.location && <span className="text-xs text-slate-400">📍 {task.location}</span>}
          </div>

          {expanded && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs text-slate-600">
              {createdAt && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Date added</span>
                  <span>{createdAt}</span>
                </div>
              )}
              {task.start_date && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Start date</span>
                  <span>{formatDate(task.start_date)}</span>
                </div>
              )}
              {task.end_date && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Due date</span>
                  <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                    {formatDate(task.end_date)}
                  </span>
                </div>
              )}
              {assignedTo && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Assigned to</span>
                  <span>{assignedTo.name}</span>
                </div>
              )}
              {task.location && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-24 flex-shrink-0">Location</span>
                  <span>{task.location}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? "Hide details" : "Show details"}
            </button>
            <button onClick={() => setShowNotes(!showNotes)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              {showNotes ? "Hide note" : instance.notes ? "Edit note" : "+ Add note"}
            </button>
          </div>

          {showNotes && (
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} onBlur={saveNote}
              placeholder="Add a note…" rows={2}
              className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-3 py-2
                         text-slate-700 placeholder:text-slate-300 resize-none
                         focus:outline-none focus:ring-1 focus:ring-violet-400" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPLETED ROW ──────────────────────────────────────────
function CompletedRow({ instance, task, teams, users, onUncomplete }) {
  if (!task) return null;
  const team        = teams[task.team_id];
  const completedBy = users[instance.completed_by];
  const time        = instance.completed_at
    ? new Date(instance.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <button onClick={onUncomplete}
        className="w-6 h-6 rounded-full bg-green-100 hover:bg-red-100 flex items-center justify-center
                   flex-shrink-0 group transition-colors">
        <svg className="w-3.5 h-3.5 text-green-600 group-hover:text-red-500 transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-400 line-through">{task.title}</span>
        {team && <span className="ml-2 text-xs text-slate-300">{team.name}</span>}
      </div>
      <div className="text-right flex-shrink-0">
        {completedBy && <p className="text-xs text-slate-500 font-medium">{completedBy.name}</p>}
        {time && <p className="text-xs text-slate-300">{time}</p>}
      </div>
    </div>
  );
}

// ── COMPLETE MODAL ─────────────────────────────────────────
function CompleteModal({ instance, task, users, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-slate-900 mb-1">Who completed this?</h3>
        {task && <p className="text-slate-500 text-sm mb-4">{task.title}</p>}
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {users.map(u => (
            <button key={u.id} onClick={() => onConfirm(u.id)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200
                         hover:border-violet-400 hover:bg-violet-50 text-left transition-colors">
              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-violet-600">
                  {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <span className="text-sm text-slate-700 font-medium truncate">{u.name}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel}
          className="w-full mt-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── TASK FORM FIELDS (shared by Add + Edit) ────────────────
function TaskFormFields({ form, update, teams, users }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
        <input type="text" value={form.title} onChange={e => update("title", e.target.value)}
          placeholder="What needs doing?"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea value={form.description} onChange={e => update("description", e.target.value)}
          placeholder="Any extra detail…" rows={2}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select value={form.status} onChange={e => update("status", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Team</label>
        <select value={form.team_id} onChange={e => update("team_id", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
          <option value="">No team</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Assign to</label>
        <select value={form.assigned_to} onChange={e => update("assigned_to", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
          <option value="">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
        <input type="text" value={form.location} onChange={e => update("location", e.target.value)}
          placeholder="e.g. London office, Remote"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Repeats</label>
        <select value={form.frequency} onChange={e => update("frequency", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
          <option value="">One-off (no repeat)</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
          <input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
          <input type="date" value={form.end_date} onChange={e => update("end_date", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_private}
          onChange={e => update("is_private", e.target.checked)}
          className="w-4 h-4 rounded accent-violet-500" />
        <span className="text-sm text-slate-700">🔒 Private (only visible to me)</span>
      </label>
    </div>
  );
}

// ── ADD TASK MODAL ─────────────────────────────────────────
function AddTaskModal({ user, teams, users, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: "", description: "", team_id: "", frequency: "", location: "",
    is_private: false, assigned_to: "", start_date: "", end_date: "", status: "not_started",
  });
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({ ...form, title: form.title.trim(), description: form.description.trim() });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-slate-900 mb-4">Add task</h3>
        <TaskFormFields form={form} update={update} teams={teams} users={users} />
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40
                       text-white text-sm font-semibold">
            {saving ? "Saving…" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EDIT TASK MODAL ────────────────────────────────────────
function EditTaskModal({ task, teams, users, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title:       task.title ?? "",
    description: task.description ?? "",
    team_id:     task.team_id ?? "",
    frequency:   task.frequency ?? "",
    location:    task.location ?? "",
    is_private:  task.is_private ?? false,
    assigned_to: task.assigned_to ?? "",
    start_date:  task.start_date ?? "",
    end_date:    task.end_date ?? "",
    status:      task.status ?? "not_started",
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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Edit task</h3>
          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Delete task
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sure?</span>
              <button onClick={onDelete} className="text-xs text-red-600 font-medium hover:underline">Yes, delete</button>
              <button onClick={() => setConfirm(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
            </div>
          )}
        </div>
        <TaskFormFields form={form} update={update} teams={teams} users={users} />
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40
                       text-white text-sm font-semibold">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── REPORT MODAL ───────────────────────────────────────────
function ReportModal({ instances, tasks, teams, users, onClose }) {
  const rows = instances.map(inst => {
    const task        = tasks[inst.task_id];
    const team        = task ? teams[task.team_id] : null;
    const completedBy = users[inst.completed_by];
    const assignedTo  = task ? users[task.assigned_to] : null;
    return {
      task:         task?.title ?? "—",
      team:         team?.name ?? "—",
      status:       inst.status,
      assigned_to:  assignedTo?.name ?? "—",
      completed_by: completedBy?.name ?? "—",
      completed_at: inst.completed_at
        ? new Date(inst.completed_at).toLocaleString("en-GB") : "—",
      frequency:    task?.frequency ?? "one-off",
      due_date:     task?.end_date ? formatDate(task.end_date) : "—",
      location:     task?.location ?? "—",
    };
  });

  function exportCSV() {
    const header = "Task,Team,Status,Assigned To,Completed By,Completed At,Frequency,Due Date,Location";
    const csvRows = rows.map(r =>
      `"${r.task}","${r.team}","${r.status}","${r.assigned_to}","${r.completed_by}","${r.completed_at}","${r.frequency}","${r.due_date}","${r.location}"`
    );
    const blob = new Blob([[header, ...csvRows].join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `tasks-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const done    = rows.filter(r => r.status === "completed").length;
  const pending = rows.filter(r => r.status !== "completed").length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-lg">Today's Report</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{done}</p>
            <p className="text-xs text-green-700 mt-0.5">Completed</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-amber-700 mt-0.5">Still to do</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{r.task}</p>
                <p className="text-xs text-slate-400">
                  {r.team} · {r.frequency}
                  {r.assigned_to !== "—" && ` · 👤 ${r.assigned_to}`}
                  {r.location !== "—" && ` · 📍 ${r.location}`}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={r.status} />
                {r.completed_by !== "—" && (
                  <p className="text-xs text-slate-400 mt-0.5">{r.completed_by}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={exportCSV}
          className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors">
          Export CSV
        </button>
      </div>
    </div>
  );
}