"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/UserContext";
import { Toast }             from "@/components/ui/Toast";
import { ConfirmModal }      from "@/components/ui/ConfirmModal";
import { ConfigModal }       from "@/components/dashboard/ConfigModal";
import { PublishMetaModal }  from "@/components/dashboard/PublishMetaModal";
import { UploadFileModal }   from "@/components/dashboard/UploadFileModal";
import { EditMaterialModal } from "@/components/dashboard/EditMaterialModal";
import { FILE_TYPE_THUMB }   from "@/types/material";
import type { Material }     from "@/types/material";

export default function MisPublicacionesPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();

  const [materials,   setMaterials]   = useState<Material[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [toast,       setToast]       = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [showConfig,  setShowConfig]  = useState(false);
  const [editMat,     setEditMat]     = useState<Material | null>(null);
  const [confirmId,   setConfirmId]   = useState<string | null>(null);

  // Escuchar evento del sidebar para abrir config
  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) { router.replace("/login"); return; }
    if (!profile.is_seller) { router.replace("/materiales"); return; }
    loadMaterials(profile.id);
  }, [profileLoading, profile]);

  async function loadMaterials(uid?: string) {
    setLoading(true);
    const userId = uid ?? profile?.id;
    if (!userId) return;

    const { data } = await supabase
      .from("materials")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setMaterials(data as Material[]);
    setLoading(false);
  }

  async function toggleVisibility(mat: Material) {
    if (!mat.file_url && !mat.is_visible) {
      showToastMsg("⚠️ Sube un archivo antes de hacer visible este material");
      return;
    }
    await supabase
      .from("materials")
      .update({ is_visible: !mat.is_visible })
      .eq("id", mat.id);
    showToastMsg(mat.is_visible ? "Material ocultado" : "Material visible");
    loadMaterials();
  }

  async function handleDelete(id: string) {
    await supabase.from("materials").delete().eq("id", id);
    showToastMsg("Material eliminado");
    setConfirmId(null);
    loadMaterials();
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return materials.filter(m =>
      !q || m.title.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q)
    );
  }, [materials, search]);

  const stats = {
    total:      materials.length,
    visible:    materials.filter(m => m.is_visible).length,
    hidden:     materials.filter(m => !m.is_visible).length,
    sinArchivo: materials.filter(m => !m.file_url).length,
  };

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">Mis publicaciones</span>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={() => setShowPublish(true)}>
            Publicar datos
          </button>
          <button className="btn-orange-sm" onClick={() => setShowUpload(true)}>
            <PlusIcon /> Subir archivo
          </button>
          <button className="btn-signout" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <div className="dash-content">
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Total",       value: stats.total,      sub: "publicaciones" },
            { label: "Visibles",    value: stats.visible,    sub: "activas"       },
            { label: "Ocultas",     value: stats.hidden,     sub: "no visibles"   },
            { label: "Sin archivo", value: stats.sinArchivo, sub: "pendientes"    },
          ].map(c => (
            <div className="stat-card" key={c.label}>
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-value">{c.value}</div>
              <div className="stat-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="search-filters" style={{ marginBottom: 16 }}>
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título o materia..."
            />
          </div>
        </div>

        <div className="section-header">
          <span className="section-title">Resultados</span>
          <span className="section-count">
            {loading ? "Cargando…" : `${filtered.length} material${filtered.length !== 1 ? "es" : ""}`}
          </span>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            Aún no tienes publicaciones
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {filtered.map(m => (
            <MyMaterialRow
              key={m.id}
              material={m}
              onEdit={()   => setEditMat(m)}
              onToggle={()  => toggleVisibility(m)}
              onDelete={()  => setConfirmId(m.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Modales ── */}
      {showPublish && (
        <PublishMetaModal
          onClose={() => setShowPublish(false)}
          onSaved={() => {
            setShowPublish(false);
            showToastMsg("Publicación creada. Ahora sube el archivo.");
            loadMaterials();
          }}
        />
      )}

      {showUpload && (
        <UploadFileModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            showToastMsg("¡Archivo publicado!");
            loadMaterials();
          }}
        />
      )}

      {editMat && (
        <EditMaterialModal
          material={editMat}
          onClose={() => setEditMat(null)}
          onSaved={() => {
            setEditMat(null);
            showToastMsg("Material actualizado");
            loadMaterials();
          }}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Eliminar material"
          message="¿Seguro que quieres eliminar este material? Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {toast      && <Toast message={toast} />}
    </>
  );
}

// ── Fila de material ──────────────────────────────────────
function MyMaterialRow({ material: m, onEdit, onToggle, onDelete }: {
  material: Material;
  onEdit:   () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const thumbCls   = FILE_TYPE_THUMB[m.file_type ?? "PDF"] ?? "thumb-pdf";
  const sinArchivo = !m.file_url;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--white)", border: "1px solid var(--gray-200)",
      borderRadius: 10, padding: "12px 16px",
      opacity: m.is_visible ? 1 : 0.65,
    }}>
      <div className={`mat-thumb ${thumbCls}`} style={{ width: 40, height: 40, flexShrink: 0 }}>
        <FileIcon />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={{
            fontSize: 13, fontWeight: 600, color: "var(--gray-900)", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300,
          }}>
            {m.title}
          </p>
          <span className="badge badge-subj">{m.subject ?? "—"}</span>
          {sinArchivo && (
            <span style={{
              fontSize: 10, background: "#fef9c3", color: "#854d0e",
              borderRadius: 4, padding: "2px 6px", fontWeight: 600,
            }}>
              Sin archivo
            </span>
          )}
          <span style={{
            fontSize: 10,
            background: m.is_visible ? "#dcfce7" : "var(--gray-100)",
            color:      m.is_visible ? "#166534"  : "var(--gray-500)",
            borderRadius: 4, padding: "2px 6px", fontWeight: 600,
          }}>
            {m.is_visible ? "Visible" : "Oculto"}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "3px 0 0" }}>
          {m.price === 0 ? "Gratis" : `$${m.price.toLocaleString("es-CO")} COP`}
          {" · "}
          {new Date(m.created_at).toLocaleDateString("es-CO")}
          {m.file_size ? ` · ${m.file_size}` : ""}
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <ActionBtn onClick={onEdit} title="Editar" color="var(--gray-600)">
          <EditIcon />
        </ActionBtn>
        <ActionBtn
          onClick={onToggle}
          title={sinArchivo ? "Sube un archivo primero" : m.is_visible ? "Ocultar" : "Mostrar"}
          color={sinArchivo ? "var(--gray-300)" : "var(--gray-600)"}
          disabled={sinArchivo}
        >
          {m.is_visible ? <EyeOffIcon /> : <EyeIcon />}
        </ActionBtn>
        <ActionBtn onClick={onDelete} title="Eliminar" color="#ef4444">
          <TrashIcon />
        </ActionBtn>
      </div>
    </div>
  );
}

// ── Botón de acción ───────────────────────────────────────
function ActionBtn({ onClick, title, color, children, disabled }: {
  onClick:   () => void;
  title:     string;
  color:     string;
  children:  React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "var(--gray-50)", border: "1px solid var(--gray-200)",
        borderRadius: 6, width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        color, opacity: disabled ? 0.4 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "var(--gray-100)"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "var(--gray-50)";  }}
    >
      {children}
    </button>
  );
}

// ── Iconos ────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5"  x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
