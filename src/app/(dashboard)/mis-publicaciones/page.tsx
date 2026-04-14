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

type FilterType = "todas" | "visibles" | "ocultas" | "sin_archivo";

export default function MisPublicacionesPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();

  const [materials,    setMaterials]    = useState<Material[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<FilterType>("todas");
  const [toast,        setToast]        = useState("");
  const [showPublish,  setShowPublish]  = useState(false);
  const [showUpload,   setShowUpload]   = useState(false);
  const [uploadForId,  setUploadForId]  = useState<string | null>(null);
  const [showConfig,   setShowConfig]   = useState(false);
  const [editMat,      setEditMat]      = useState<Material | null>(null);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);

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

  // Filtrado base por búsqueda
  const searched = useMemo(() => {
    const q = search.toLowerCase();
    return materials.filter(m =>
      !q || m.title.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q)
    );
  }, [materials, search]);

  // Grupos separados
  const grupos = useMemo(() => ({
    visibles:    searched.filter(m => m.is_visible),
    ocultas:     searched.filter(m => !m.is_visible && !!m.file_url),
    sin_archivo: searched.filter(m => !m.file_url),
  }), [searched]);

  // Filtrado por tab
  const filtered = useMemo(() => {
    if (filter === "visibles")    return grupos.visibles;
    if (filter === "ocultas")     return grupos.ocultas;
    if (filter === "sin_archivo") return grupos.sin_archivo;
    return searched;
  }, [filter, grupos, searched]);

  const stats = {
    total:      materials.length,
    visible:    materials.filter(m => m.is_visible).length,
    hidden:     materials.filter(m => !m.is_visible && !!m.file_url).length,
    sinArchivo: materials.filter(m => !m.file_url).length,
  };

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: "todas",       label: "Todas",        count: materials.length          },
    { key: "visibles",    label: "Visibles",      count: stats.visible             },
    { key: "ocultas",     label: "Ocultas",       count: stats.hidden              },
    { key: "sin_archivo", label: "Sin archivo",   count: stats.sinArchivo          },
  ];

  // Determinar qué secciones mostrar
  const showSections = filter === "todas";

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">Mis publicaciones</span>
        <div className="topbar-actions">
          <button className="btn-ghost" onClick={() => setShowPublish(true)}>
            Publicar datos
          </button>
          <button className="btn-orange-sm" onClick={() => { setUploadForId(null); setShowUpload(true); }}>
            <PlusIcon /> Subir archivo
          </button>
          <button className="btn-signout" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <div className="dash-content">

        {/* ── Stats ── */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Total",       value: stats.total,      sub: "publicaciones" },
            { label: "Visibles",    value: stats.visible,    sub: "activas"       },
            { label: "Ocultas",     value: stats.hidden,     sub: "con archivo"   },
            { label: "Sin archivo", value: stats.sinArchivo, sub: "pendientes"    },
          ].map(c => (
            <div className="stat-card" key={c.label}>
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-value">{c.value}</div>
              <div className="stat-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Buscador ── */}
        <div className="search-filters" style={{ marginBottom: 12 }}>
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

        {/* ── Filtros tab ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
                background: filter === f.key ? "var(--orange)" : "var(--gray-100)",
                color:      filter === f.key ? "white"          : "var(--gray-600)",
                border:     filter === f.key ? "1px solid var(--orange)" : "1px solid var(--gray-200)",
              }}
            >
              {f.label}
              <span style={{
                marginLeft: 6, fontSize: 10,
                background: filter === f.key ? "rgba(255,255,255,0.25)" : "var(--gray-200)",
                color:      filter === f.key ? "white" : "var(--gray-500)",
                borderRadius: 10, padding: "1px 6px",
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Contenido ── */}
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--gray-400)" }}>Cargando…</p>
        ) : showSections ? (
          // Vista con secciones separadas
          <>
            <Section
              title="Publicaciones visibles"
              color="#166534"
              bg="#dcfce7"
              items={grupos.visibles}
              emptyMsg="No tienes publicaciones visibles"
              onEdit={m => setEditMat(m)}
              onToggle={toggleVisibility}
              onDelete={id => setConfirmId(id)}
              onUpload={id => { setUploadForId(id); setShowUpload(true); }}
            />
            <Section
              title="Ocultas con archivo"
              color="#92400e"
              bg="#fef3c7"
              items={grupos.ocultas}
              emptyMsg="No tienes publicaciones ocultas"
              onEdit={m => setEditMat(m)}
              onToggle={toggleVisibility}
              onDelete={id => setConfirmId(id)}
              onUpload={id => { setUploadForId(id); setShowUpload(true); }}
            />
            <Section
              title="Sin archivo — pendientes"
              color="#991b1b"
              bg="#fee2e2"
              items={grupos.sin_archivo}
              emptyMsg="¡Todo tiene archivo subido!"
              onEdit={m => setEditMat(m)}
              onToggle={toggleVisibility}
              onDelete={id => setConfirmId(id)}
              onUpload={id => { setUploadForId(id); setShowUpload(true); }}
            />
          </>
        ) : (
          // Vista filtrada simple
          <>
            <div className="section-header">
              <span className="section-title">Resultados</span>
              <span className="section-count">
                {filtered.length} material{filtered.length !== 1 ? "es" : ""}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                Sin resultados
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {filtered.map(m => (
                  <MyMaterialRow
                    key={m.id}
                    material={m}
                    onEdit={()   => setEditMat(m)}
                    onToggle={()  => toggleVisibility(m)}
                    onDelete={()  => setConfirmId(m.id)}
                    onUpload={()  => { setUploadForId(m.id); setShowUpload(true); }}
                  />
                ))}
              </div>
            )}
          </>
        )}
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
          preselectedId={uploadForId ?? undefined}
          onClose={() => { setShowUpload(false); setUploadForId(null); }}
          onUploaded={() => {
            setShowUpload(false);
            setUploadForId(null);
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

// ── Sección agrupada ──────────────────────────────────────
function Section({ title, color, bg, items, emptyMsg, onEdit, onToggle, onDelete, onUpload }: {
  title:    string;
  color:    string;
  bg:       string;
  items:    Material[];
  emptyMsg: string;
  onEdit:   (m: Material) => void;
  onToggle: (m: Material) => void;
  onDelete: (id: string)  => void;
  onUpload: (id: string)  => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.05em", background: bg, color,
          borderRadius: 4, padding: "3px 8px",
        }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
          {items.length} {items.length === 1 ? "material" : "materiales"}
        </span>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--gray-400)", paddingLeft: 4 }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(m => (
            <MyMaterialRow
              key={m.id}
              material={m}
              onEdit={()   => onEdit(m)}
              onToggle={()  => onToggle(m)}
              onDelete={()  => onDelete(m.id)}
              onUpload={()  => onUpload(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fila de material ──────────────────────────────────────
function MyMaterialRow({ material: m, onEdit, onToggle, onDelete, onUpload }: {
  material: Material;
  onEdit:   () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpload: () => void;
}) {
  const thumbCls   = FILE_TYPE_THUMB[m.file_type ?? "PDF"] ?? "thumb-pdf";
  const sinArchivo = !m.file_url;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--white)", border: "1px solid var(--gray-200)",
      borderRadius: 10, padding: "12px 16px",
      opacity: m.is_visible ? 1 : 0.75,
    }}>
      <div className={`mat-thumb ${thumbCls}`} style={{ width: 40, height: 40, flexShrink: 0 }}>
        <FileIcon />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Título — clickeable si no tiene archivo */}
          <p
            onClick={sinArchivo ? onUpload : undefined}
            title={sinArchivo ? "Clic para subir archivo" : undefined}
            style={{
              fontSize: 13, fontWeight: 600, color: sinArchivo ? "var(--orange)" : "var(--gray-900)",
              margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300,
              cursor: sinArchivo ? "pointer" : "default",
              textDecoration: sinArchivo ? "underline dotted" : "none",
            }}
          >
            {m.title}
          </p>
          <span className="badge badge-subj">{m.subject ?? "—"}</span>
          {sinArchivo && (
            <span
              onClick={onUpload}
              style={{
                fontSize: 10, background: "#fef9c3", color: "#854d0e",
                borderRadius: 4, padding: "2px 6px", fontWeight: 600,
                cursor: "pointer",
              }}
              title="Clic para subir archivo"
            >
              Sin archivo — subir ↑
            </span>
          )}
          {!sinArchivo && (
            <span style={{
              fontSize: 10,
              background: m.is_visible ? "#dcfce7" : "var(--gray-100)",
              color:      m.is_visible ? "#166534"  : "var(--gray-500)",
              borderRadius: 4, padding: "2px 6px", fontWeight: 600,
            }}>
              {m.is_visible ? "Visible" : "Oculto"}
            </span>
          )}
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
        {sinArchivo ? (
          <ActionBtn onClick={onUpload} title="Subir archivo" color="var(--orange)">
            <UploadIcon />
          </ActionBtn>
        ) : (
          <ActionBtn
            onClick={onToggle}
            title={m.is_visible ? "Ocultar" : "Mostrar"}
            color="var(--gray-600)"
          >
            {m.is_visible ? <EyeOffIcon /> : <EyeIcon />}
          </ActionBtn>
        )}
        <ActionBtn onClick={onDelete} title="Eliminar" color="#ef4444">
          <TrashIcon />
        </ActionBtn>
      </div>
    </div>
  );
}

// ── ActionBtn ─────────────────────────────────────────────
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
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>;
}
function FileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>;
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>;
}
function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>;
}
function EyeOffIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>;
}
function UploadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>;
}