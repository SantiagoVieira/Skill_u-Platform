"use client";

import type { Material } from "@/types/material";

interface Props {
  material: Material;
  onClose:  () => void;
}

export function MaterialDetailModal({ material: m, onClose }: Props) {
  const rows: [string, string][] = [
    ["Tipo de archivo", m.file_type ?? "—"],
    ["Tamaño",          m.file_size ?? "—"],
    ["Materia",         m.subject   ?? "—"],
    ["Precio",          m.price === 0 ? "Gratis" : `$${m.price.toLocaleString("es-CO")} COP`],
    ["Publicado",       new Date(m.created_at).toLocaleDateString("es-CO")],
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{m.title}</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 12, color: "var(--gray-500)", lineHeight: 1.6 }}>{m.description}</p>

          <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 12 }}>
            {rows.map(([label, value]) => (
              <div key={label} className="detail-row">
                <span className="detail-row-lbl">{label}</span>
                <span className="detail-row-val">{value}</span>
              </div>
            ))}
          </div>

          {m.author && (
            <p style={{ fontSize: 11, color: "var(--gray-400)" }}>Publicado por {m.author}</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cerrar</button>
          {m.file_url && (
            <a href={m.file_url} target="_blank" rel="noreferrer" className="modal-btn-submit" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              Descargar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}