import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.is_admin ? user.id : null;
}

// ── GET — materiales, usuarios o reportes ─────────────────
export async function GET(req: NextRequest) {
  const adminId = await verifyAdmin(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type   = searchParams.get("type") ?? "materials";
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";

  // ── Usuarios ──
  if (type === "users") {
    let query = supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, program, is_seller, is_banned, ban_reason, banned_at, created_at")
      .order("created_at", { ascending: false });
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // ── Reportes ──
  if (type === "reports") {
    let query = supabaseAdmin
      .from("reports")
      .select(`
        id, reason, status, admin_notes, created_at, reviewed_at,
        reporter:reporter_id ( first_name, last_name ),
        material:material_id ( id, title, subject ),
        seller:seller_id    ( id, first_name, last_name )
      `)
      .order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // ── Materiales (default) ──
  let query = supabaseAdmin
    .from("materials")
    .select(`
      id, title, description, subject, price, file_url,
      file_type, file_size, is_visible, created_at, user_id,
      curation_status, curation_notes, curated_at, curated_by,
      profiles:user_id ( first_name, last_name, program )
    `)
    .not("file_url", "is", null)
    .order("created_at", { ascending: false });

  if (status === "pending") {
    query = query.or("curation_status.is.null,curation_status.eq.pending");
  } else if (status) {
    query = query.eq("curation_status", status);
  }
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── PATCH — aprobar/rechazar material, ban/unban usuario, resolver reporte ──
export async function PATCH(req: NextRequest) {
  const adminId = await verifyAdmin(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── Ban / Unban usuario ──
  if (action === "ban" || action === "unban") {
    const { user_id, reason } = body;
    if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_banned:  action === "ban",
        ban_reason: action === "ban" ? (reason ?? null) : null,
        banned_at:  action === "ban" ? new Date().toISOString() : null,
      })
      .eq("id", user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notificar al usuario si fue baneado
    if (action === "ban") {
      await supabaseAdmin.from("notifications").insert({
        user_id: user_id,
        title:   "🚫 Cuenta suspendida",
        message: `Tu cuenta ha sido suspendida.${reason ? ` Motivo: ${reason}` : ""} Si consideras que esto es un error, escríbenos a soporte@skillu.com`,
        type:    "error",
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Resolver reporte ──
  if (action === "resolve_report") {
    const { report_id, verdict, admin_notes } = body;
    if (!report_id || !verdict) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    // Obtener el reporte
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("seller_id, material_id, material:material_id(title)")
      .eq("id", report_id)
      .single();

    if (!report) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });

    // Actualizar reporte
    await supabaseAdmin
      .from("reports")
      .update({
        status:      verdict === "guilty" ? "reviewed_guilty" : "reviewed_innocent",
        admin_notes: admin_notes ?? null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", report_id);

    // Si es culpable, notificar al vendedor
    if (verdict === "guilty") {
      const materialTitle = (report.material as any)?.title ?? "tu publicación";
      await supabaseAdmin.from("notifications").insert({
        user_id: report.seller_id,
        title:   "⚠️ Reporte procesado",
        message: `Se procesó un reporte sobre "${materialTitle}". ${admin_notes ? `Observación: ${admin_notes}` : "Tu contenido fue revisado y se encontraron irregularidades."}`,
        type:    "warning",
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Aprobar / Rechazar material ──
  const { material_id, notes } = body;
  if (!material_id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { data: material } = await supabaseAdmin
    .from("materials")
    .select("user_id, file_url, title")
    .eq("id", material_id)
    .single();

  if (!material) return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });

  if (action === "approve") {
    await supabaseAdmin
      .from("materials")
      .update({
        curation_status: "approved",
        curation_notes:  notes ?? null,
        curated_by:      adminId,
        curated_at:      new Date().toISOString(),
        is_visible:      true,
      })
      .eq("id", material_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: material.user_id,
      title:   "✅ Material aprobado",
      message: `Tu publicación "${material.title}" fue aprobada y ya es visible para todos los estudiantes.`,
      type:    "success",
    });

  } else {
    if (material.file_url) {
      const url      = new URL(material.file_url);
      const parts    = url.pathname.split("/object/public/materials/");
      const filePath = parts[1];
      if (filePath) await supabaseAdmin.storage.from("materials").remove([filePath]);
    }

    await supabaseAdmin
      .from("materials")
      .update({
        curation_status: "rejected",
        curation_notes:  notes ?? null,
        curated_by:      adminId,
        curated_at:      new Date().toISOString(),
        is_visible:      false,
        file_url:        null,
        file_type:       null,
        file_size:       null,
      })
      .eq("id", material_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: material.user_id,
      title:   "🚫 Material rechazado",
      message: `Tu publicación "${material.title}" fue rechazada.${notes ? ` Motivo: ${notes}` : ""} Por favor sube un archivo diferente o elimina la publicación.`,
      type:    "error",
    });
  }

  return NextResponse.json({ ok: true });
}