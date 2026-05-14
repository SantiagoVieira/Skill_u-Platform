"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase }  from "@/lib/supabase";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Toast } from "@/components/ui/Toast";

type CurationStatus = "pending" | "approved" | "rejected";
type AdminView = "materials" | "users" | "reports";

interface AdminMaterial {
  id:              string;
  title:           string;
  description:     string;
  subject:         string;
  price:           number;
  file_url:        string | null;
  file_type:       string | null;
  file_size:       string | null;
  is_visible:      boolean;
  created_at:      string;
  user_id:         string;
  curation_status: CurationStatus | null;
  curation_notes:  string | null;
  curated_at:      string | null;
  profiles: { first_name: string; last_name: string; program: string } | null;
}

interface AdminUser {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  program:    string;
  is_seller:  boolean;
  is_banned:  boolean;
  ban_reason: string | null;
  banned_at:  string | null;
  created_at: string;
}

interface AdminReport {
  id:          string;
  reason:      string;
  status:      string;
  admin_notes: string | null;
  created_at:  string;
  reviewed_at: string | null;
  reporter:    { first_name: string; last_name: string } | null;
  material:    { id: string; title: string; subject: string } | null;
  seller:      { id: string; first_name: string; last_name: string } | null;
}

type FilterTab = "all" | "pending" | "approved";

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading: guardLoading, isAdmin } = useAdminGuard();

  const [view,         setView]         = useState<AdminView>("materials");
  const [materials,    setMaterials]    = useState<AdminMaterial[]>([]);
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [reports,      setReports]      = useState<AdminReport[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<FilterTab>("pending");
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState<AdminMaterial | null>(null);
  const [actionModal,  setActionModal]  = useState<{ mat: AdminMaterial; action: "approve" | "reject" } | null>(null);
  const [banModal,     setBanModal]     = useState<AdminUser | null>(null);
  const [reportModal,  setReportModal]  = useState<AdminReport | null>(null);
  const [notes,        setNotes]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState("");
  const [allStats,     setAllStats]     = useState({ total: 0, pending: 0, approved: 0 });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  const loadStats = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res  = await fetch("/api/curator/materials", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      setAllStats({
        total:    data.length,
        pending:  data.filter((m: AdminMaterial) => !m.curation_status || m.curation_status === "pending").length,
        approved: data.filter((m: AdminMaterial) => m.curation_status === "approved").length,
      });
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { router.replace("/login"); return; }
    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    if (search) params.set("search", search);
    const res  = await fetch(`/api/curator/materials?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { router.replace("/login"); return; }
    const data = await res.json();
    setMaterials(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [tab, search, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams({ type: "users" });
    if (search) params.set("search", search);
    const res  = await fetch(`/api/curator/materials?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams({ type: "reports" });
    if (tab !== "all") params.set("status", tab === "pending" ? "pending" : "reviewed_guilty");
    const res  = await fetch(`/api/curator/materials?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReports(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (!guardLoading && isAdmin) {
      loadStats();
      if (view === "materials") loadMaterials();
      if (view === "users")     loadUsers();
      if (view === "reports")   loadReports();
    }
  }, [guardLoading, isAdmin, view, loadMaterials, loadUsers, loadReports, loadStats]);

  async function handleMaterialAction() {
    if (!actionModal) return;
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch("/api/curator/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ material_id: actionModal.mat.id, action: actionModal.action, notes: notes.trim() || null }),
    });
    setSubmitting(false);
    setActionModal(null);
    setNotes("");
    setSelected(null);
    if (res.ok) {
      showToast(actionModal.action === "approve" ? "✅ Material aprobado" : "🚫 Material rechazado y archivo eliminado");
      loadMaterials();
      loadStats();
    } else showToast("Error al procesar");
  }

  async function handleBan(user: AdminUser, unban = false) {
    const token = await getToken();
    const res = await fetch("/api/curator/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: unban ? "unban" : "ban", user_id: user.id, reason: notes.trim() || null }),
    });
    setBanModal(null);
    setNotes("");
    if (res.ok) {
      showToast(unban ? "✅ Cuenta reactivada" : "🚫 Cuenta suspendida");
      loadUsers();
    } else showToast("Error al procesar");
  }

  async function handleResolveReport(verdict: "guilty" | "innocent") {
    if (!reportModal) return;
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch("/api/curator/materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "resolve_report", report_id: reportModal.id, verdict, admin_notes: notes.trim() || null }),
    });
    setSubmitting(false);
    setReportModal(null);
    setNotes("");
    if (res.ok) {
      showToast(verdict === "guilty" ? "⚠️ Reporte procesado — vendedor notificado" : "✅ Reporte archivado sin acción");
      loadReports();
    } else showToast("Error al procesar");
  }

  async function handleSignOut() {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), 1000)),
      ]);
    } catch (e) { console.warn("signOut:", e); }
    window.location.href = "/login";
  }

  if (guardLoading) return <AdminSplash />;
  if (!isAdmin)     return null;

  const MAT_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "pending",  label: "Pendientes", count: allStats.pending  },
    { key: "approved", label: "Aprobados",  count: allStats.approved },
    { key: "all",      label: "Todos",      count: allStats.total    },
  ];

  return (
    <>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", height: 58,
        borderBottom: "1px solid var(--gray-200)", background: "var(--white)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldIcon />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--gray-900)" }}>
              Skill<span style={{ color: "#7c3aed" }}>_u</span> Admin
            </span>
            <span style={{ marginLeft: 10, fontSize: 10, background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>CURADOR</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-900)" }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500 }}>Administrador</div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ background: "var(--gray-100)", border: "1px solid var(--gray-200)", borderRadius: 7, padding: "6px 13px", fontSize: 12, color: "var(--gray-700)", cursor: "pointer", fontWeight: 500 }}
          >
            Salir
          </button>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>

        {/* Sidebar */}
        <aside style={{ width: 240, borderRight: "1px solid var(--gray-200)", background: "var(--white)", padding: "20px 0", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "0 16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 10 }}>Resumen</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StatPill label="Total"      value={allStats.total}    color="#6b7280" bg="#f3f4f6" />
              <StatPill label="Pendientes" value={allStats.pending}  color="#d97706" bg="#fef3c7" />
              <StatPill label="Aprobados"  value={allStats.approved} color="#16a34a" bg="#dcfce7" />
            </div>
          </div>

          <div style={{ height: 1, background: "var(--gray-100)", margin: "0 16px 20px" }} />

          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 10 }}>Secciones</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {([
                { key: "materials", label: "Materiales",  icon: "📄" },
                { key: "users",     label: "Usuarios",     icon: "👥" },
                { key: "reports",   label: "Reportes",     icon: "🚩" },
              ] as { key: AdminView; label: string; icon: string }[]).map(s => (
                <button key={s.key} onClick={() => { setView(s.key); setSearch(""); setSelected(null); setTab("pending"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 8, border: "none",
                    background: view === s.key ? "#ede9fe" : "transparent",
                    color: view === s.key ? "#5b21b6" : "var(--gray-600)",
                    fontWeight: view === s.key ? 600 : 400,
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-tabs para materiales */}
            {view === "materials" && (
              <>
                <div style={{ height: 1, background: "var(--gray-100)", margin: "12px 0" }} />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 8 }}>Filtrar</p>
                {MAT_TABS.map(t => (
                  <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px", borderRadius: 8, border: "none", width: "100%",
                      background: tab === t.key ? "#ede9fe" : "transparent",
                      color: tab === t.key ? "#5b21b6" : "var(--gray-600)",
                      fontWeight: tab === t.key ? 600 : 400, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    <span>{t.label}</span>
                    <span style={{ fontSize: 10, background: tab === t.key ? "#7c3aed" : "var(--gray-200)", color: tab === t.key ? "white" : "var(--gray-500)", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--gray-50)" }}>
          {/* Buscador */}
          <div style={{ padding: "16px 20px", background: "var(--white)", borderBottom: "1px solid var(--gray-200)" }}>
            <div style={{ position: "relative", maxWidth: 400 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={view === "materials" ? "Buscar por título…" : view === "users" ? "Buscar usuario…" : "Buscar reportes…"}
                style={{ width: "100%", height: 36, padding: "0 12px 0 32px", border: "1px solid var(--gray-200)", borderRadius: 8, fontSize: 13, outline: "none", background: "var(--gray-50)" }}
              />
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)", fontSize: 13 }}>Cargando…</div>
            ) : view === "materials" ? (
              materials.length === 0 ? <EmptyState msg={tab === "pending" ? "🎉 Sin materiales pendientes" : "Sin resultados"} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {materials.map(mat => (
                    <MaterialRow key={mat.id} material={mat}
                      isSelected={selected?.id === mat.id}
                      onClick={() => setSelected(s => s?.id === mat.id ? null : mat)}
                      onApprove={() => { setActionModal({ mat, action: "approve" }); setNotes(""); }}
                      onReject={() =>  { setActionModal({ mat, action: "reject"  }); setNotes(""); }}
                    />
                  ))}
                </div>
              )
            ) : view === "users" ? (
              users.length === 0 ? <EmptyState msg="Sin usuarios" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.map(u => (
                    <UserRow key={u.id} user={u}
                      onBan={() => { setBanModal(u); setNotes(""); }}
                      onUnban={() => handleBan(u, true)}
                    />
                  ))}
                </div>
              )
            ) : (
              reports.length === 0 ? <EmptyState msg="Sin reportes pendientes" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reports.map(r => (
                    <ReportRow key={r.id} report={r}
                      onResolve={() => { setReportModal(r); setNotes(""); }}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </main>

        {/* Panel detalle material */}
        {selected && view === "materials" && (
          <aside style={{ width: 340, borderLeft: "1px solid var(--gray-200)", background: "var(--white)", overflowY: "auto", flexShrink: 0 }}>
            <DetailPanel material={selected}
              onApprove={() => { setActionModal({ mat: selected, action: "approve" }); setNotes(""); }}
              onReject={() =>  { setActionModal({ mat: selected, action: "reject"  }); setNotes(""); }}
              onClose={() => setSelected(null)}
            />
          </aside>
        )}
      </div>

      {/* Modal aprobar/rechazar */}
      {actionModal && (
        <ActionModal
          action={actionModal.action} materialTitle={actionModal.mat.title}
          notes={notes} onNotesChange={setNotes} submitting={submitting}
          onConfirm={handleMaterialAction}
          onCancel={() => { setActionModal(null); setNotes(""); }}
        />
      )}

      {/* Modal ban */}
      {banModal && (
        <BanModal
          user={banModal} notes={notes} onNotesChange={setNotes}
          onConfirm={() => handleBan(banModal)}
          onCancel={() => { setBanModal(null); setNotes(""); }}
        />
      )}

      {/* Modal resolver reporte */}
      {reportModal && (
        <ResolveReportModal
          report={reportModal} notes={notes} onNotesChange={setNotes}
          submitting={submitting}
          onGuilty={() => handleResolveReport("guilty")}
          onInnocent={() => handleResolveReport("innocent")}
          onCancel={() => { setReportModal(null); setNotes(""); }}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}

// ── Fila usuario ──────────────────────────────────────────
function UserRow({ user: u, onBan, onUnban }: { user: AdminUser; onBan: () => void; onUnban: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: u.is_banned ? "#fef2f2" : "var(--white)",
      border: `1px solid ${u.is_banned ? "#fecaca" : "var(--gray-200)"}`,
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: u.is_banned ? "#fee2e2" : "#ede9fe", color: u.is_banned ? "#dc2626" : "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
        {u.first_name?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>
            {u.first_name} {u.last_name}
          </span>
          {u.is_seller && <span style={{ fontSize: 10, background: "#fff1e6", color: "var(--orange)", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>Vendedor</span>}
          {u.is_banned && <span style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>🚫 Suspendido</span>}
        </div>
        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "2px 0 0" }}>
          {u.email} · {u.program}
          {u.is_banned && u.ban_reason && <span style={{ color: "#dc2626" }}> · Motivo: {u.ban_reason}</span>}
        </p>
      </div>
      {u.is_banned ? (
        <button onClick={onUnban}
          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid #86efac", background: "#f0fdf4", color: "#16a34a", whiteSpace: "nowrap" }}>
          Reactivar cuenta
        </button>
      ) : (
        <button onClick={onBan}
          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", whiteSpace: "nowrap" }}>
          Suspender cuenta
        </button>
      )}
    </div>
  );
}

// ── Fila reporte ──────────────────────────────────────────
function ReportRow({ report: r, onResolve }: { report: AdminReport; onResolve: () => void }) {
  const isPending = r.status === "pending";
  return (
    <div style={{
      background: "var(--white)", border: `1px solid ${isPending ? "#fde68a" : "var(--gray-200)"}`,
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: isPending ? "#fef3c7" : "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
          🚩
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>
              {r.material?.title ?? "Material eliminado"}
            </span>
            <span style={{ fontSize: 10, background: isPending ? "#fef3c7" : "#dcfce7", color: isPending ? "#92400e" : "#166534", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
              {isPending ? "Pendiente" : "Revisado"}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--gray-600)", margin: 0 }}>
            <strong>Motivo:</strong> {r.reason}
          </p>
          <p style={{ fontSize: 11, color: "var(--gray-400)", margin: "3px 0 0" }}>
            Reportado por <strong>{r.reporter?.first_name} {r.reporter?.last_name}</strong>
            {" · "}{r.material?.subject}
            {" · "}{new Date(r.created_at).toLocaleDateString("es-CO")}
          </p>
          {r.admin_notes && (
            <p style={{ fontSize: 11, color: "#166534", margin: "4px 0 0", fontStyle: "italic" }}>
              Nota admin: {r.admin_notes}
            </p>
          )}
        </div>
        {isPending && (
          <button onClick={onResolve}
            style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid #fde68a", background: "#fef3c7", color: "#92400e", whiteSpace: "nowrap", flexShrink: 0 }}>
            Revisar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal ban ─────────────────────────────────────────────
function BanModal({ user: u, notes, onNotesChange, onConfirm, onCancel }: {
  user: AdminUser; notes: string; onNotesChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "var(--white)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4 }}>🚫 Suspender cuenta</div>
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 16 }}>
          <strong>{u.first_name} {u.last_name}</strong> — {u.email}
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--gray-700)", marginBottom: 6 }}>Motivo (recomendado)</label>
          <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={3}
            placeholder="Ej: Múltiples subidas de contenido con derechos de autor…"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gray-200)", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, color: "var(--gray-900)" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: 8, border: "1px solid var(--gray-200)", background: "var(--gray-50)", color: "var(--gray-700)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex: 1, height: 40, borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirmar suspensión</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal resolver reporte ────────────────────────────────
function ResolveReportModal({ report: r, notes, onNotesChange, submitting, onGuilty, onInnocent, onCancel }: {
  report: AdminReport; notes: string; onNotesChange: (v: string) => void;
  submitting: boolean; onGuilty: () => void; onInnocent: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "var(--white)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4 }}>🚩 Resolver reporte</div>
        <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 4 }}>
          <strong>"{r.material?.title}"</strong>
        </p>
        <p style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 16 }}>
          Motivo reportado: {r.reason}
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--gray-700)", marginBottom: 6 }}>Observación (se enviará al vendedor si hay infracción)</label>
          <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={3}
            placeholder="Ej: Se confirmó que el documento contiene material con derechos de autor…"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gray-200)", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, color: "var(--gray-900)" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ height: 40, borderRadius: 8, border: "1px solid var(--gray-200)", background: "var(--gray-50)", color: "var(--gray-700)", fontSize: 13, cursor: "pointer", padding: "0 16px" }}>Cancelar</button>
          <button onClick={onInnocent} disabled={submitting}
            style={{ flex: 1, height: 40, borderRadius: 8, border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ✅ Sin infracción
          </button>
          <button onClick={onGuilty} disabled={submitting}
            style={{ flex: 1, height: 40, borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ⚠️ Hay infracción
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login ban check (para usar en login page) ─────────────
// Se exporta para importar desde el login
export function isBannedUser(profile: any) {
  return profile?.is_banned === true;
}

// ── Componentes reutilizables ─────────────────────────────
function StatPill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: bg }}>
      <span style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function MaterialRow({ material: m, isSelected, onClick, onApprove, onReject }: {
  material: AdminMaterial; isSelected: boolean; onClick: () => void; onApprove: () => void; onReject: () => void;
}) {
  const status = m.curation_status ?? "pending";
  const badge: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#fef3c7", color: "#d97706", label: "Pendiente" },
    approved: { bg: "#dcfce7", color: "#16a34a", label: "Aprobado"  },
  };
  const b = badge[status] ?? badge.pending;
  return (
    <div onClick={onClick} style={{ background: isSelected ? "#faf5ff" : "var(--white)", border: `1px solid ${isSelected ? "#c4b5fd" : "var(--gray-200)"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", boxShadow: isSelected ? "0 0 0 2px #ede9fe" : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FileTypeIcon type={m.file_type} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>{m.title}</span>
            <span style={{ fontSize: 10, background: b.bg, color: b.color, borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{b.label}</span>
            {m.price === 0
              ? <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>Gratis</span>
              : <span style={{ fontSize: 10, background: "var(--gray-100)", color: "var(--gray-600)", borderRadius: 4, padding: "1px 6px" }}>${m.price.toLocaleString("es-CO")} COP</span>
            }
          </div>
          <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
            <strong style={{ color: "var(--gray-700)" }}>{m.profiles?.first_name} {m.profiles?.last_name}</strong>
            {" · "}{m.subject}{" · "}{new Date(m.created_at).toLocaleDateString("es-CO")}
          </div>
        </div>
        {status === "pending" && (
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <QuickBtn title="Aprobar"  color="#16a34a" bg="#dcfce7" onClick={onApprove}><CheckIcon /></QuickBtn>
            <QuickBtn title="Rechazar" color="#dc2626" bg="#fee2e2" onClick={onReject}><XIcon /></QuickBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ material: m, onApprove, onReject, onClose }: {
  material: AdminMaterial; onApprove: () => void; onReject: () => void; onClose: () => void;
}) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Detalle</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", padding: 4 }}><XIcon size={16} /></button>
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4 }}>{m.title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <Tag>{m.subject}</Tag>
        {m.file_type && <Tag>{m.file_type}</Tag>}
        {m.file_size && <Tag>{m.file_size}</Tag>}
        <Tag color="#7c3aed" bg="#ede9fe">{m.price === 0 ? "Gratis" : `$${m.price.toLocaleString("es-CO")} COP`}</Tag>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Label>Descripción</Label>
        <p style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.6, margin: 0 }}>{m.description || "Sin descripción"}</p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Label>Vendedor</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--gray-50)", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
            {(m.profiles?.first_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.profiles?.first_name} {m.profiles?.last_name}</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{m.profiles?.program}</div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label>Archivo</Label>
        {m.file_url ? (
          <a href={m.file_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#ede9fe", borderRadius: 8, border: "1px solid #c4b5fd", color: "#5b21b6", fontSize: 12, textDecoration: "none" }}>
            <FileTypeIcon type={m.file_type} /> Ver / descargar archivo ↗
          </a>
        ) : (
          <p style={{ fontSize: 12, color: "var(--gray-400)", fontStyle: "italic" }}>Sin archivo</p>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onApprove} style={{ flex: 1, height: 38, borderRadius: 8, border: "none", background: "#16a34a", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <CheckIcon /> Aprobar
        </button>
        <button onClick={onReject} style={{ flex: 1, height: 38, borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <XIcon /> Rechazar
        </button>
      </div>
    </div>
  );
}

function ActionModal({ action, materialTitle, notes, onNotesChange, submitting, onConfirm, onCancel }: {
  action: "approve" | "reject"; materialTitle: string; notes: string;
  onNotesChange: (v: string) => void; submitting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const isReject = action === "reject";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "var(--white)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{isReject ? "🚫 Rechazar" : "✅ Aprobar"}</div>
        <p style={{ fontSize: 13, color: "var(--gray-600)", margin: 0, marginBottom: 8 }}><strong>"{materialTitle}"</strong></p>
        {isReject && <p style={{ fontSize: 11, color: "#dc2626", padding: "8px 10px", background: "#fef2f2", borderRadius: 6, marginBottom: 16 }}>⚠️ El archivo será eliminado y el vendedor notificado.</p>}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--gray-700)", marginBottom: 6 }}>
            {isReject ? "Motivo del rechazo" : "Notas (opcional)"}
          </label>
          <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gray-200)", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, color: "var(--gray-900)" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: 8, border: "1px solid var(--gray-200)", background: "var(--gray-50)", color: "var(--gray-700)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} disabled={submitting} style={{ flex: 1, height: 40, borderRadius: 8, border: "none", background: isReject ? "#dc2626" : "#16a34a", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Procesando…" : isReject ? "Confirmar rechazo" : "Confirmar aprobación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p style={{ fontSize: 14, color: "var(--gray-500)" }}>{msg}</p></div>;
}
function AdminSplash() {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--gray-400)", fontSize: 13 }}>Verificando permisos…</div></div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{children}</p>;
}
function Tag({ children, color = "var(--gray-600)", bg = "var(--gray-100)" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ fontSize: 10, background: bg, color, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{children}</span>;
}
function QuickBtn({ title, color, bg, onClick, children }: { title: string; color: string; bg: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: bg, color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>;
}
function FileTypeIcon({ type }: { type: string | null }) {
  const colors: Record<string, string> = { PDF: "#ef4444", DOC: "#3b82f6", IMG: "#10b981", VID: "#8b5cf6" };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[type ?? "PDF"] ?? "#7c3aed"} strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
}
function ShieldIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function CheckIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function XIcon({ size = 13 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }