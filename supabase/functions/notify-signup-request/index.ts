import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = "https://samesun-tasks.vercel.app";
const FROM = "Samesun Tasks <tasks@tasks.samesun.com>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  let id: string | undefined;
  try {
    ({ id } = await req.json());
  } catch {
    // ignore, handled by the missing-id check below
  }

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // The caller here is whoever just submitted the request form — not
  // logged in, so nothing about them is trustworthy. Look the request up
  // by id and use the DB's own copy of name/email, rather than trusting
  // anything the request body claims. Otherwise this endpoint would be an
  // open way to blast an arbitrary subject/name to every admin's inbox.
  const { data: request } = await supabaseAdmin
    .from("signup_requests")
    .select("id, name, email, status, notified_at")
    .eq("id", id)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Idempotent: a retry (or a double-invoke) for the same request never
  // sends a second round of emails.
  if (request.notified_at) {
    return new Response(JSON.stringify({ ok: true, alreadyNotified: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: admins } = await supabaseAdmin.from("users").select("email").eq("role", "admin");
  const adminEmails = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);

  const safeName = escapeHtml(request.name);
  const safeEmail = escapeHtml(request.email);
  const subject = `New access request: ${request.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 24px;">
        <span style="font-weight: 700; font-size: 16px; color: #0F1523;">Samesun Tasks</span>
      </div>
      <h2 style="color: #0F1523; font-size: 20px; margin: 0 0 12px;">New access request</h2>
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;"><strong>${safeName}</strong> (${safeEmail}) has requested an account.</p>
      <div style="margin-top: 28px;">
        <a href="${APP_URL}" style="background: #F5A623; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Review in Samesun Tasks →
        </a>
      </div>
      <p style="color: #D1D5DB; font-size: 12px; margin-top: 32px;">You're receiving this because you're an admin on Samesun Tasks.</p>
    </div>
  `;

  let sent = 0;
  for (const email of adminEmails) {
    const ok = await sendEmail(email, subject, html);
    if (ok) sent++;
  }

  // Marked regardless of how many sends actually succeeded — this is a
  // best-effort nudge, not the source of truth (the People page's pending
  // list is), so a partial Resend failure shouldn't cause a retry storm.
  await supabaseAdmin.from("signup_requests").update({ notified_at: new Date().toISOString() }).eq("id", id);

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
