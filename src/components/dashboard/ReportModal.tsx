"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser }  from "@/lib/UserContext";

interface Props {
  materialId:   string;
  materialTitle: string;
  sellerId:     string;
  onClose:      () => void;
  onReported:   () => void;
}

export function ReportModal({ materialId, materialTitle, sellerId, onClose, onReported }: Props) {
  const { profile } = useUser();
  const [reason,   setReason]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const REASONS = [
    "Contenido con derechos de autor",
    "Información incorrecta o engañosa",
    "Material de baja calidad",
    "Contenido inapropiado u ofensivo",
    "El archivo no abre o está dañado",
    "Otro motivo",
  ];

  async function handleSubmit() {
    if (!reason.trim()) { setError("Escribe el motivo del reporte"); return; }
    if (!profile) return;

    setLoading(true);
    const { error: err } = await supabase
      .from("reports")
      .insert({
        reporter_id: profile.id,
        material_id: materialId,
        seller_id:   sellerId,
        reason:      reason.trim(),
        status:      "pending",
      });

    if (err) {
      setError(err.code === "23505"
        ? "Ya reportaste este material anteriormente."
        : err.message
      );
      setLoading(false);
      return;
    }

    onReported();
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 300 }}
    >
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Reportar publicación</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 12, color: "var(--gray-600)", marginBottom: 14, lineHeight: 1.5 }}>
            Estás reportando: <strong>"{materialTitle}"</strong><br />
            Tu reporte será revisado por un administrador.
          </p>

          {/* Opciones rápidas */}
          <div style={{ marginBottom: 12 }}>
            <label className="field-label">Motivo</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    textAlign: "left", padding: "8px 12px",
                    borderRadius: 8, fontSize: 12, cursor: "pointer",
                    border: `1px solid ${reason === r ? "var(--orange)" : "var(--gray-200)"}`,
                    background: reason === r ? "#fff1e6" : "var(--gray-50)",
                    color: reason === r ? "var(--orange)" : "var(--gray-700)",
                    fontWeight: reason === r ? 600 : 400,
                    transition: "all 0.1s",
                  }}
                >
                  {reason === r ? "● " : "○ "}{r}
                </button>
              ))}
            </div>
          </div>

          {/* Detalle adicional */}
          <div className="field-group">
            <label className="field-label">Detalle adicional (opcional)</label>
            <textarea
              className="field-textarea"
              rows={3}
              value={reason === REASONS.find(r => r === reason) ? "" : reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe con más detalle el problema…"
            />
          </div>

          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a",
            borderRadius: 8, padding: "10px 12px",
            fontSize: 11, color: "#92400e", lineHeight: 1.5,
          }}>
            ⚠️ Los reportes falsos o malintencionados pueden resultar en la suspensión de tu cuenta.
          </div>

          {error && <p className="auth-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="modal-btn-submit"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            style={{ background: "#dc2626", border: "none" }}
          >
            {loading ? "Enviando…" : "Enviar reporte →"}
          </button>
        </div>
      </div>
    </div>
  );
}