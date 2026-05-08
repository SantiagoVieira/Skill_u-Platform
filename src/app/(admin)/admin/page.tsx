"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { Toast } from "@/components/ui/Toast";

/* ── Tipos ──────────────────────────────────────────────── */
type CurationStatus = "pending" | "approved" | "rejected";

interface AdminMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  price: number;
  file_url: string | null;
  file_type: string | null;
  file_size: string | null;
  is_visible: boolean;
  created_at: string;
  user_id: string;
  curation_status: CurationStatus | null;
  curation_notes: string | null;
  curated_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    program: string;
  } | null;
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

/* ── Página principal ───────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const { profile, loading: guardLoading, isAdmin } = useAdminGuard();

  const [materials, setMaterials]     = useState<AdminMaterial[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<FilterTab>("pending");
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<AdminMaterial | null>(null);
  const [actionModal, setActionModal] = useState<{ mat: AdminMaterial; action: "approve" | "reject" } | null>(null);
  const [notes, setNotes]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    if (search)        params.set("search", search);

    const res = await fetch(`/api/curator/materials?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.status === 401) { router.replace("/login"); return; }
    const data = await res.json();
    setMaterials(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [tab, search, router]);

  useEffect(() => {
    if (!guardLoading && isAdmin) loadMaterials();
  }, [guardLoading, isAdmin, loadMaterials]);

  async function handleAction() {
    if (!actionModal) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/curator/materials", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({
        material_id: actionModal.mat.id,
        action: actionModal.action,
        notes: notes.trim() || null,
      }),
    });

    setSubmitting(false);
    setActionModal(null);
    setNotes("");
    setSelected(null);

    if (res.ok) {
      showToast(actionModal.action === "approve" ? "✅ Material aprobado" : "🚫 Material rechazado");
      loadMaterials();
    } else {
      showToast("Error al procesar la acción");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const stats = useMemo(() => ({
    total:    materials.length,
    pending:  materials.filter(m => !m.curation_status || m.curation_status === "pending").length,
    approved: materials.filter(m => m.curation_status === "approved").length,
    rejected: materials.filter(m => m.curation_status === "rejected").length,
  }), [materials]);

  if (guardLoading) return <AdminSplash />;
  if (!isAdmin) return null;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "pending",  label: "Pendientes" },
    { key: "approved", label: "Aprobados"  },
    { key: "rejected", label: "Rechazados" },
    { key: "all",      label: "Todos"      },
  ];

  return (
    <>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", height: 58,
        borderBottom: "1px solid var(--gray-200)",
        background: "var(--white)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldIcon />
          </div>
          <div>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--gray-900)" }}>
              Skill<span style={{ color: "#7c3aed" }}>_u</span> Admin
            </span>
            <span style={{ marginLeft: 10, fontSize: 10, background: "#ede9fe", color: "#5b21b6", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>
              CURADOR
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-900)" }}>
              {profile?.first_name} {profile?.last_name}
            </div>
            <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500 }}>Administrador</div>
          </div>
          <button onClick={handleSignOut} style={{
            background: "var(--gray-100)", border: "1px solid var(--gray-200)",
            borderRadius: 7, padding: "6px 13px", fontSize: 12,
            color: "var(--gray-700)", cursor: "pointer", fontWeight: 500,
          }}>
            Salir
          </button>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>

        {/* Sidebar */}
        <aside style={{
          width: 260, borderRight: "1px solid var(--gray-200)",
          background: "var(--white)", padding: "20px 0", flexShrink: 0, overflowY: "auto",
        }}>
          <div style={{ padding: "0 16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 10 }}>
              Resumen
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StatPill label="Total materiales" value={stats.total}    color="#6b7280" bg="#f3f4f6" />
              <StatPill label="Pendientes"        value={stats.pending}  color="#d97706" bg="#fef3c7" />
              <StatPill label="Aprobados"         value={stats.approved} color="#16a34a" bg="#dcfce7" />
              <StatPill label="Rechazados"        value={stats.rejected} color="#dc2626" bg="#fee2e2" />
            </div>
          </div>

          <div style={{ height: 1, background: "var(--gray-100)", margin: "0 16px 20px" }} />

          <div style={{ padding: "0 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 10 }}>
              Filtrar por estado
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSelected(null); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: 8, border: "none",
                    background: tab === t.key ? "#ede9fe" : "transparent",
                    color: tab === t.key ? "#5b21b6" : "var(--gray-600)",
                    fontWeight: tab === t.key ? 600 : 400,
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span>{t.label}</span>
                  {tab === t.key && (
                    <span style={{
                      fontSize: 10, background: "#7c3aed", color: "white",
                      borderRadius: 10, padding: "1px 6px", fontWeight: 700,
                    }}>
                      {t.key === "pending" ? stats.pending : t.key === "approved" ? stats.approved : t.key === "rejected" ? stats.rejected : stats.total}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Lista central */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--gray-50)" }}>
          <div style={{ padding: "16px 20px", background: "var(--white)", borderBottom: "1px solid var(--gray-200)" }}>
            <div style={{ position: "relative", maxWidth: 400 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por título…"
                style={{
                  width: "100%", height: 36, padding: "0 12px 0 32px",
                  border: "1px solid var(--gray-200)", borderRadius: 8,
                  fontSize: 13, outline: "none", background: "var(--gray-50)",
                }}
              />
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--gray-400)", fontSize: 13 }}>
                Cargando materiales…
              </div>
            ) : materials.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {materials.map(mat => (
                  <MaterialRow
                    key={mat.id}
                    material={mat}
                    isSelected={selected?.id === mat.id}
                    onClick={() => setSelected(s => s?.id === mat.id ? null : mat)}
                    onApprove={() => { setActionModal({ mat, action: "approve" }); setNotes(""); }}
                    onReject={() =>  { setActionModal({ mat, action: "reject"  }); setNotes(""); }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Panel detalle */}
        {selected && (
          <aside style={{
            width: 340, borderLeft: "1px solid var(--gray-200)",
            background: "var(--white)", overflowY: "auto", flexShrink: 0,
          }}>
            <DetailPanel
              material={selected}
              onApprove={() => { setActionModal({ mat: selected, action: "approve" }); setNotes(""); }}
              onReject={() =>  { setActionModal({ mat: selected, action: "reject"  }); setNotes(""); }}
              onClose={() => setSelected(null)}
            />
          </aside>
        )}
      </div>

      {actionModal && (
        <ActionModal
          action={actionModal.action}
          materialTitle={actionModal.mat.title}
          notes={notes}
          onNotesChange={setNotes}
          submitting={submitting}
          onConfirm={handleAction}
          onCancel={() => { setActionModal(null); setNotes(""); }}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}

/* ── Componentes ────────────────────────────────────────── */
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
  const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#fef3c7", color: "#d97706", label: "Pendiente" },
    approved: { bg: "#dcfce7", color: "#16a34a", label: "Aprobado"  },
    rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rechazado" },
  };
  const badge = statusBadge[status] ?? statusBadge.pending;

  return (
    <div onClick={onClick} style={{
      background: isSelected ? "#faf5ff" : "var(--white)",
      border: `1px solid ${isSelected ? "#c4b5fd" : "var(--gray-200)"}`,
      borderRadius: 10, padding: "14px 16px", cursor: "pointer",
      boxShadow: isSelected ? "0 0 0 2px #ede9fe" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FileTypeIcon type={m.file_type} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>{m.title}</span>
            <span style={{ fontSize: 10, background: badge.bg, color: badge.color, borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{badge.label}</span>
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
            <QuickBtn title="Aprobar" color="#16a34a" bg="#dcfce7" onClick={onApprove}><CheckIcon /></QuickBtn>
            <QuickBtn title="Rechazar" color="#dc2626" bg="#fee2e2" onClick={onReject}><XIcon /></QuickBtn>
          </div>
        )}
      </div>
      {m.curation_notes && (
        <div style={{
          marginTop: 10, padding: "8px 10px", borderRadius: 6, fontSize: 11,
          background: status === "rejected" ? "#fef2f2" : "#f0fdf4",
          color: status === "rejected" ? "#991b1b" : "#166534",
          borderLeft: `3px solid ${status === "rejected" ? "#fca5a5" : "#86efac"}`,
        }}>
          <span style={{ fontWeight: 600 }}>Nota curador: </span>{m.curation_notes}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ material: m, onApprove, onReject, onClose }: {
  material: AdminMaterial; onApprove: () => void; onReject: () => void; onClose: () => void;
}) {
  const status = m.curation_status ?? "pending";
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Detalle</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", padding: 4 }}><XIcon size={16} /></button>
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4, lineHeight: 1.4 }}>{m.title}</h2>
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
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {(m.profiles?.first_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>{m.profiles?.first_name} {m.profiles?.last_name}</div>
            <div style={{ fontSize: 11, color: "var(--gray-500)" }}>{m.profiles?.program}</div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Label>Archivo</Label>
        {m.file_url ? (
          <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#ede9fe", borderRadius: 8, border: "1px solid #c4b5fd", color: "#5b21b6", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
            <FileTypeIcon type={m.file_type} /> Ver / descargar archivo ↗
          </a>
        ) : (
          <p style={{ fontSize: 12, color: "var(--gray-400)", fontStyle: "italic" }}>Sin archivo</p>
        )}
      </div>
      <div style={{ marginBottom: 20 }}>
        <Label>Publicado</Label>
        <p style={{ fontSize: 12, color: "var(--gray-600)", margin: 0 }}>{new Date(m.created_at).toLocaleString("es-CO")}</p>
      </div>
      {status !== "pending" && (
        <div style={{ marginBottom: 20 }}>
          <Label>Estado de curación</Label>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: status === "approved" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${status === "approved" ? "#bbf7d0" : "#fecaca"}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: status === "approved" ? "#166534" : "#991b1b", marginBottom: 4 }}>
              {status === "approved" ? "✅ Aprobado" : "🚫 Rechazado"}
            </div>
            {m.curation_notes && <p style={{ fontSize: 11, color: status === "approved" ? "#15803d" : "#b91c1c", margin: 0 }}>{m.curation_notes}</p>}
            {m.curated_at && <p style={{ fontSize: 10, color: "var(--gray-400)", margin: "6px 0 0" }}>{new Date(m.curated_at).toLocaleString("es-CO")}</p>}
          </div>
        </div>
      )}
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-900)", marginBottom: 4 }}>{isReject ? "🚫 Rechazar material" : "✅ Aprobar material"}</div>
          <p style={{ fontSize: 13, color: "var(--gray-600)", margin: 0 }}><strong>"{materialTitle}"</strong></p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--gray-700)", marginBottom: 6 }}>
            {isReject ? "Motivo del rechazo (recomendado)" : "Notas para el vendedor (opcional)"}
          </label>
          <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={4}
            placeholder={isReject ? "Ej: El documento viola nuestras políticas…" : "Ej: Excelente material."}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gray-200)", borderRadius: 8, fontSize: 13, resize: "vertical", outline: "none", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6, color: "var(--gray-900)" }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: 8, border: "1px solid var(--gray-200)", background: "var(--gray-50)", color: "var(--gray-700)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirm} disabled={submitting} style={{ flex: 1, height: 40, borderRadius: 8, border: "none", background: isReject ? "#dc2626" : "#16a34a", color: "white", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Procesando…" : isReject ? "Confirmar rechazo" : "Confirmar aprobación"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const msgs: Record<FilterTab, string> = {
    pending: "🎉 No hay materiales pendientes de revisión",
    approved: "Aún no hay materiales aprobados",
    rejected: "No hay materiales rechazados",
    all: "No hay materiales en la plataforma",
  };
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
      <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 500 }}>{msgs[tab]}</p>
    </div>
  );
}

function AdminSplash() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gray-50)" }}>
      <div style={{ textAlign: "center", color: "var(--gray-400)", fontSize: 13 }}>Verificando permisos…</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{children}</p>;
}

function Tag({ children, color = "var(--gray-600)", bg = "var(--gray-100)" }: { children: React.ReactNode; color?: string; bg?: string }) {
  return <span style={{ fontSize: 10, background: bg, color, borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{children}</span>;
}

function QuickBtn({ title, color, bg, onClick, children }: { title: string; color: string; bg: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: bg, color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
      {children}
    </button>
  );
}

function FileTypeIcon({ type }: { type: string | null }) {
  const colors: Record<string, string> = { PDF: "#ef4444", DOC: "#3b82f6", IMG: "#10b981", VID: "#8b5cf6" };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors[type ?? "PDF"] ?? "#7c3aed"} strokeWidth="2" strokeLinecap="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function ShieldIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;
}

function XIcon({ size = 13 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}