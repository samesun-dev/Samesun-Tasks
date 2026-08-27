import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    .eq("email", (caller.email ?? "").toLowerCase().trim())
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

  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: { name: name.trim(), role: role || "member", team_id: team_id || "" },
      ...(redirectTo ? { redirectTo } : {}),
    }
  );

  if (error) {
    // A real Auth account already exists for this email (usually from
    // before the People-sync trigger existed, so it never got a matching
    // public.users row). Instead of failing, back-fill the row and send
    // them a password reset — same end result as a fresh invite.
    if (error.message?.toLowerCase().includes("already been registered")) {
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!existing) {
        const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const authUser = listError ? null : list.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

        if (authUser) {
          await supabaseAdmin.from("users").upsert(
            {
              id: authUser.id,
              name: name.trim(),
              email: normalizedEmail,
              role: role || "member",
              team_id: team_id || null,
              has_account: true,
            },
            { onConflict: "email" }
          );
        }
      }

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        normalizedEmail,
        redirectTo ? { redirectTo } : undefined
      );
      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ existingAccount: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
