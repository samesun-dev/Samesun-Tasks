import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// "Remove" on the People page used to just delete the public.users row via
// a plain client-side call. That never touched the person's actual
// Supabase Auth account, so their password kept working and — since most
// read policies only require auth.role() = 'authenticated', not "has a
// users row" — they kept effectively full access to tasks/teams/users
// forever. This function does the part that actually revokes access:
// delete the real Auth account (admin-gated, same pattern as create-user),
// then clean up the profile row.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
  if (callerError || !caller) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("email", (caller.email ?? "").toLowerCase().trim())
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admins only" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { userId } = await req.json();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (userId === callerProfile.id) {
    return new Response(JSON.stringify({ error: "You can't remove your own account." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Some people still only have a public.users row from before the
  // People-sync trigger existed (has_account: false) — there's no matching
  // auth.users row to delete yet. Treat "not found" as success rather than
  // failing the whole removal.
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError && !authDeleteError.message?.toLowerCase().includes("not found")) {
    return new Response(JSON.stringify({ error: authDeleteError.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { error: profileDeleteError } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (profileDeleteError) {
    return new Response(JSON.stringify({ error: profileDeleteError.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
