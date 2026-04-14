"use client";

import { SUBJECTS, FILE_TYPE_THUMB } from "@/types/material";
import type { Material } from "@/types/material";

// ── Topbar ────────────────────────────────────────────────
export function Topbar({
  title, userName, isSeller,
  onSignOut, onWantSell, onPublishData, onUploadFile,
}: {
  title:         string;
  userName:      string;
  isSeller:      boolean;
  onSignOut:     () => void;
  onWantSell:    () => void;
  onPublishData: () => void;
  onUploadFile:  () => void;
}) {
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-actions">
        <span className="topbar-user">{userName}</span>
        {!isSeller ? (
          <button className="btn-want-sell" onClick={onWantSell}>
            ¿Quieres vender?
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={onPublishData}>Publicar datos</button>
            <button className="btn-orange-sm" onClick={onUploadFile}>
              <PlusIcon /> Subir archivo
            </button>
          </>
        )}
        <button className="btn-signout" onClick={onSignOut}>Salir</button>
      </div>
    </header>
  );
}

// ── StatsGrid ─────────────────────────────────────────────
export function StatsGrid({
  total, published, downloads, categories,
}: {
  total:      number;
  published:  number;
  downloads:  number;
  categories: number;
}) {
  const cards = [
    { label: "Total materiales", value: total,      sub: "En la plataforma"    },
    { label: "Publicados",       value: published,   sub: "Visibles para todos" },
    { label: "Descargas",        value: downloads,   sub: "Este mes"            },
    { label: "Materias",         value: categories,  sub: "Temas activos"       },
  ];
  return (
    <div className="stats-grid">
      {cards.map(c => (
        <div className="stat-card" key={c.label}>
          <div className="stat-card-label">{c.label}</div>
          <div className="stat-card-value">{c.value}</div>
          <div className="stat-card-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── SearchFilters ─────────────────────────────────────────
export function SearchFilters({
  search, onSearch, filterSubj, onFilterSubj, filterType, onFilterType,
}: {
  search:       string;
  onSearch:     (v: string) => void;
  filterSubj:   string;
  onFilterSubj: (v: string) => void;
  filterType:   string;
  onFilterType: (v: string) => void;
}) {
  return (
    <div className="search-filters">
      <div className="search-wrap">
        <svg className="search-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="search-input"
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por título o materia..."
        />
      </div>

      <div className="select-wrap">
        <select
          className="filter-select"
          value={filterSubj}
          onChange={e => onFilterSubj(e.target.value)}
        >
          <option value="">Todas las materias</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="select-wrap">
        <select
          className="filter-select"
          value={filterType}
          onChange={e => onFilterType(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="PDF">PDF</option>
          <option value="DOC">DOC</option>
          <option value="IMG">IMG</option>
          <option value="VID">VID</option>
        </select>
      </div>
    </div>
  );
}

// ── MaterialGrid ──────────────────────────────────────────
export function MaterialGrid({
  materials, selectedId, onSelect, myId, purchases,
}: {
  materials:  Material[];
  selectedId: string | null;
  onSelect:   (id: string) => void;
  myId?:      string;
  purchases?: Set<string>;
}) {
  if (!materials.length) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Sin resultados para esa búsqueda
      </div>
    );
  }

  return (
    <div className="materials-grid">
      {materials.map(m => {
        const thumbCls   = FILE_TYPE_THUMB[m.file_type ?? "PDF"] ?? "thumb-pdf";
        const isOwn      = !!myId && m.user_id === myId;
        const isPurchased = purchases?.has(m.id) ?? false;

        return (
          <div
            key={m.id}
            className={`mat-card ${selectedId === m.id ? "selected" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <div className={`mat-thumb ${thumbCls}`}>
              <TypeIcon type={m.file_type ?? "PDF"} />
            </div>

            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
              <span className="badge badge-subj">{m.subject ?? "—"}</span>
              {isOwn && (
                <span style={{
                  fontSize: 10, background: "#ede9fe", color: "#5b21b6",
                  borderRadius: 4, padding: "2px 6px", fontWeight: 600,
                }}>
                  Tuyo
                </span>
              )}
              {!isOwn && isPurchased && (
                <span style={{
                  fontSize: 10, background: "#dcfce7", color: "#166534",
                  borderRadius: 4, padding: "2px 6px", fontWeight: 600,
                }}>
                  Comprado
                </span>
              )}
            </div>

            <p className="mat-title">{m.title}</p>

            <div className="mat-meta">
              <UserIcon /> {m.author ?? "Anónimo"}
              {m.price > 0 && (
                <>
                  &nbsp;·&nbsp;
                  <span style={{ color: "var(--orange)", fontWeight: 500 }}>
                    ${m.price.toLocaleString("es-CO")}
                  </span>
                </>
              )}
              {m.price === 0 && (
                <>
                  &nbsp;·&nbsp;
                  <span style={{ color: "#16a34a", fontWeight: 500 }}>Gratis</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Icon helpers ──────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5"  x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "IMG") {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (type === "VID") {
    return (
      <svg viewBox="0 0 24 24">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}