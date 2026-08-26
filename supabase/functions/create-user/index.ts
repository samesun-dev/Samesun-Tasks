import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

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
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admins only" }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { name, email, team_id, role, redirectTo } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return new Response(JSON.stringify({ error: "Name and email are required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    {
      data: { name: name.trim(), role: role || "member", team_id: team_id || "" },
      ...(redirectTo ? { redirectTo } : {}),
    }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
