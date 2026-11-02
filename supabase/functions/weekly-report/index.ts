import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = "https://samesun-tasks.vercel.app";
const FROM = "Samesun Tasks <tasks@tasks.samesun.com>";

// Same gate as reset-tasks/send-emails — see CLAUDE.md for setup steps.
const CRON_SECRET = Deno.env.get("CRON_SECRET");

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  console.log("Sending email to:", to, "subject:", subject);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const body = await res.json();
  console.log("Resend response:", JSON.stringify(body));
  return res.ok;
}

function emailTemplate(title: string, body: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 24px;">
        <span style="font-weight: 700; font-size: 16px; color: #0F1523;">Samesun Tasks</span>
      </div>
      <h2 style="color: #0F1523; font-size: 20px; margin: 0 0 12px;">${title}</h2>
      <div style="color: #6B7280; font-size: 14px; line-height: 1.6;">${body}</div>
      <div style="margin-top: 28px;">
        <a href="${APP_URL}" style="background: #F5A623; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Open Samesun Tasks
        </a>
      </div>
      <p style="color: #D1D5DB; font-size: 12px; margin-top: 32px;">You are receiving this because you're an admin on Samesun Tasks.</p>
    </div>
  `;
}

type TaskEntry = {
  title: string;
  description: string | null;
  end_date: string;
  assigneeName: string;
};

function taskRow(task: TaskEntry) {
  const dateStr = new Date(task.end_date + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });
  return `
    <div style="padding: 10px 0; border-bottom: 1px solid #F3F4F6;">
      <p style="font-weight: 700; color: #0F1523; margin: 0 0 2px;">${escapeHtml(task.title)}</p>
      ${task.description ? `<p style="color: #6B7280; margin: 0 0 4px; font-size: 13px;">${escapeHtml(task.description)}</p>` : ""}
      <p style="color: #DC2626; font-size: 13px; font-weight: 600; margin: 0;">Assigned to: ${escapeHtml(task.assigneeName)} &middot; Was due: ${dateStr}</p>
    </div>
  `;
}

function renderDepartment(teamName: string, tasks: TaskEntry[]) {
  return `
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
      <span style="background: #EDE9FE; color: #5B21B6; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 600;">${escapeHtml(teamName)}</span>
      <div style="margin-top: 8px;">
        ${tasks.map(taskRow).join("")}
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];

  // Only actually send on Mondays — lets this share the same daily cron
  // trigger as reset-tasks/send-emails (same pattern reset-tasks already
  // uses for its own weekly recurring tasks) without needing a separate
  // weekly-only cron entry, and no-ops the other six days.
  if (today.getDay() !== 1) {
    console.log("Not Monday, skipping");
    return new Response(JSON.stringify({ emailsSent: 0, reason: "not Monday", date: todayISO }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: usersData } = await supabase.from("users").select("id, name, email, role");
  const userMap: Record<string, { name: string; email: string; role: string }> = {};
  usersData?.forEach((u: any) => { userMap[u.id] = { name: u.name, email: u.email, role: u.role }; });

  const admins = (usersData ?? []).filter((u: any) => u.role === "admin" && u.email);
  console.log("Admins found:", admins.length);
  if (!admins.length) {
    return new Response(JSON.stringify({ emailsSent: 0, reason: "no admins", date: todayISO }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: teamsData } = await supabase.from("teams").select("id, name");
  const teamMap: Record<string, string> = {};
  teamsData?.forEach((t: any) => { teamMap[t.id] = t.name; });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, assigned_to, team_id")
    .eq("is_active", true)
    .not("end_date", "is", null);

  const taskIds = tasks?.map((t: any) => t.id) ?? [];

  const { data: instances } = taskIds.length
    ? await supabase
        .from("task_instances")
        .select("task_id, status")
        .in("task_id", taskIds)
        .neq("status", "completed")
    : { data: [] as any[] };

  const incompleteTaskIds = new Set(instances?.map((i: any) => i.task_id) ?? []);

  const overdueByTeam: Record<string, TaskEntry[]> = {};
  let totalOverdue = 0;

  for (const task of tasks ?? []) {
    if (!incompleteTaskIds.has(task.id)) continue;
    if (!(task.end_date < todayISO)) continue;

    const teamName = task.team_id ? (teamMap[task.team_id] ?? "No department") : "No department";
    const assigneeName = task.assigned_to ? (userMap[task.assigned_to]?.name ?? "Unassigned") : "Unassigned";

    if (!overdueByTeam[teamName]) overdueByTeam[teamName] = [];
    overdueByTeam[teamName].push({
      title: task.title,
      description: task.description,
      end_date: task.end_date,
      assigneeName,
    });
    totalOverdue++;
  }

  const departmentCount = Object.keys(overdueByTeam).length;
  console.log("Overdue tasks:", totalOverdue, "across departments:", departmentCount);

  const sections = Object.entries(overdueByTeam)
    .map(([teamName, teamTasks]) => renderDepartment(teamName, teamTasks))
    .join("");

  const subject = totalOverdue > 0
    ? `Weekly Overdue Report: ${totalOverdue} task${totalOverdue === 1 ? "" : "s"} across ${departmentCount} department${departmentCount === 1 ? "" : "s"}`
    : "Weekly Overdue Report: no overdue tasks";

  const bodyIntro = totalOverdue > 0
    ? `<p>Here's this week's overdue task summary across all departments:</p>${sections}`
    : `<p>No overdue tasks across any department this week.</p>`;

  let emailsSent = 0;
  for (const admin of admins) {
    const greetingName = admin.name?.split(" ")[0] ?? "there";
    const body = `<p>Hi ${greetingName},</p>${bodyIntro}`;
    const html = emailTemplate("Weekly overdue report", body);
    await sendEmail(admin.email, subject, html);
    emailsSent++;
  }

  console.log("Total emails sent:", emailsSent);

  return new Response(JSON.stringify({ emailsSent, totalOverdue, date: todayISO }), {
    headers: { "Content-Type": "application/json" },
  });
});
