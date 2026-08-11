import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
console.log("RESEND_API_KEY present:", RESEND_API_KEY.length > 0);
console.log("SUPABASE_URL present:", !!Deno.env.get("SUPABASE_URL"));

const APP_URL = "https://samesun-tasks.vercel.app";
const FROM = "Samesun Tasks <tasks@tasks.samesun.com>";

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
      <p style="color: #D1D5DB; font-size: 12px; margin-top: 32px;">You are receiving this because you have tasks assigned to you in Samesun Tasks.</p>
    </div>
  `;
}

function taskCard(task: any, teamName: string, color: string, borderColor: string, dateColor: string) {
  const dateStr = new Date(task.end_date + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });
  return `
    <div style="background: ${color}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
      <p style="font-weight: 700; color: #0F1523; margin: 0 0 4px;">${task.title}</p>
      ${task.description ? `<p style="color: #6B7280; margin: 0 0 8px; font-size: 13px;">${task.description}</p>` : ""}
      ${teamName ? `<span style="background: #EDE9FE; color: #5B21B6; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 600;">${teamName}</span>` : ""}
      <p style="color: ${dateColor}; font-size: 13px; font-weight: 600; margin: 8px 0 0;">Due: ${dateStr}</p>
    </div>
  `;
}

Deno.serve(async (_req) => {
  console.log("Function started");
  const today = new Date().toISOString().split("T")[0];
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const dueSoonDate = twoDaysFromNow.toISOString().split("T")[0];
  console.log("Today:", today, "Due soon date:", dueSoonDate);

  const { data: usersData } = await supabase.from("users").select("id, name, email");
  const userMap: Record<string, { name: string; email: string }> = {};
  usersData?.forEach((u: any) => { userMap[u.id] = { name: u.name, email: u.email }; });
  console.log("Users loaded:", Object.keys(userMap).length);

  const { data: teamsData } = await supabase.from("teams").select("id, name");
  const teamMap: Record<string, string> = {};
  teamsData?.forEach((t: any) => { teamMap[t.id] = t.name; });

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, end_date, assigned_to, team_id")
    .eq("is_active", true)
    .not("assigned_to", "is", null)
    .not("end_date", "is", null);

  console.log("Tasks found:", tasks?.length ?? 0, "Error:", tasksError?.message ?? "none");

  const taskIds = tasks?.map((t: any) => t.id) ?? [];
  if (!taskIds.length) {
    console.log("No tasks found - exiting early");
    return new Response(JSON.stringify({ emailsSent: 0, reason: "no tasks" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: instances, error: instancesError } = await supabase
    .from("task_instances")
    .select("task_id, status")
    .in("task_id", taskIds)
    .neq("status", "completed");

  console.log("Incomplete instances:", instances?.length ?? 0, "Error:", instancesError?.message ?? "none");

  const incompleteTaskIds = new Set(instances?.map((i: any) => i.task_id) ?? []);

  const { data: watchers } = await supabase
    .from("task_watchers")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  const watcherMap: Record<string, string[]> = {};
  watchers?.forEach((w: any) => {
    if (!watcherMap[w.task_id]) watcherMap[w.task_id] = [];
    watcherMap[w.task_id].push(w.user_id);
  });

  let emailsSent = 0;

  for (const task of tasks ?? []) {
    console.log("Checking task:", task.title, "end_date:", task.end_date, "incomplete:", incompleteTaskIds.has(task.id));
    if (!incompleteTaskIds.has(task.id)) continue;

    const assignee = userMap[task.assigned_to];
    console.log("Assignee:", assignee?.email ?? "not found");
    if (!assignee) continue;

    const teamName = task.team_id ? (teamMap[task.team_id] ?? "") : "";
    const isOverdue = task.end_date < today;
    const isDueSoon = task.end_date === dueSoonDate;
    console.log("isOverdue:", isOverdue, "isDueSoon:", isDueSoon);

    const watcherEmails: string[] = (watcherMap[task.id] ?? [])
      .map((id: string) => userMap[id]?.email)
      .filter(Boolean) as string[];

    const allRecipients = [assignee.email, ...watcherEmails];

    if (isOverdue) {
      const subject = `Overdue: ${task.title}`;
      const card = taskCard(task, teamName, "#FEF2F2", "#FECACA", "#DC2626");
      const body = `<p>Hi ${assignee.name.split(" ")[0]},</p><p>The following task is overdue and still incomplete:</p>${card}<p>Please complete this task or update the due date if needed.</p>`;
      const html = emailTemplate(`Overdue: ${task.title}`, body);
      for (const email of allRecipients) {
        await sendEmail(email, subject, html);
        emailsSent++;
      }
    } else if (isDueSoon) {
      const subject = `Due in 2 days: ${task.title}`;
      const card = taskCard(task, teamName, "#FEF3C7", "#FCD34D", "#92400E");
      const body = `<p>Hi ${assignee.name.split(" ")[0]},</p><p>A reminder that the following task is due in 2 days:</p>${card}`;
      const html = emailTemplate(`Due in 2 days: ${task.title}`, body);
      for (const email of allRecipients) {
        await sendEmail(email, subject, html);
        emailsSent++;
      }
    }
  }

  console.log("Total emails sent:", emailsSent);

  return new Response(JSON.stringify({ emailsSent, date: today }), {
    headers: { "Content-Type": "application/json" },
  });
});