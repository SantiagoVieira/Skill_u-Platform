"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/types/material";

interface Props {
  onClose: () => void;
  onSaved: (id: string) => void;
}

export function PublishMetaModal({ onClose, onSaved }: Props) {
  const [title,   setTitle]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]); // ← tipo explícito
  const [price,   setPrice]   = useState("0");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error: err } = await supabase
      .from("materials")
      .insert({
        user_id:     session.user.id,
        title:       title.trim(),
        description: desc.trim(),
        subject,
        price:       parseFloat(price) || 0,
        is_visible:  false,
      })
      .select("id")
      .single();

    if (err) { setError(err.message); setLoading(false); return; }
    onSaved(data.id);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Nueva publicación</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Título *</label>
            <input
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Apuntes Cálculo Diferencial 2024-1"
            />
          </div>

          <div className="field-group">
            <label className="field-label">Descripción</label>
            <textarea
              className="field-textarea"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe brevemente el contenido..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">Materia</label>
              <div className="select-wrap">
                <select
                  className="field-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)} 
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Precio (COP)</label>
              <input
                className="field-input"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 = gratis"
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <p style={{ fontSize: 11, color: "var(--gray-400)", lineHeight: 1.5 }}>
            💡 La publicación quedará guardada pero no será visible hasta que subas el archivo.
          </p>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-btn-submit" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar publicación →"}
          </button>
        </div>
      </div>
    </div>
  );
}
