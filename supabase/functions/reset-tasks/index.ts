import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();

  // Get all active recurring tasks
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, frequency")
    .eq("type", "recurring")
    .eq("is_active", true);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const toCreate = [];

  for (const task of tasks ?? []) {
    // Check if there's already an open (incomplete) instance for this task
    const { data: openInstance } = await supabase
      .from("task_instances")
      .select("id")
      .eq("task_id", task.id)
      .neq("status", "completed")
      .order("due_date", { ascending: false })
      .limit(1)
      .single();

    if (openInstance) continue; // Already has an open instance — skip

    // Check if instance already exists for today
    const { data: todayInstance } = await supabase
      .from("task_instances")
      .select("id")
      .eq("task_id", task.id)
      .eq("due_date", todayISO)
      .single();

    if (todayInstance) continue; // Already created today — skip

    let shouldCreate = false;

    if (task.frequency === "daily") {
      shouldCreate = true;
    } else if (task.frequency === "weekly") {
      shouldCreate = dayOfWeek === 1;
    } else if (task.frequency === "biweekly") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const weekNum = Math.floor((today.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
      shouldCreate = dayOfWeek === 1 && weekNum % 2 === 0;
    } else if (task.frequency === "monthly") {
      shouldCreate = dayOfMonth === 1;
    } else if (task.frequency === "every_2_months") {
      shouldCreate = dayOfMonth === 1 && today.getMonth() % 2 === 0;
    } else if (task.frequency === "every_3_months") {
      shouldCreate = dayOfMonth === 1 && today.getMonth() % 3 === 0;
    } else if (task.frequency === "annually") {
      shouldCreate = dayOfMonth === 1 && today.getMonth() === 0;
    }

    if (shouldCreate) {
      toCreate.push({ task_id: task.id, status: "not_started", due_date: todayISO });
    }
  }

  if (toCreate.length > 0) {
    await supabase.from("task_instances").insert(toCreate);
  }

  return new Response(
    JSON.stringify({ created: toCreate.length, date: todayISO }),
    { headers: { "Content-Type": "application/json" } }
  );
});