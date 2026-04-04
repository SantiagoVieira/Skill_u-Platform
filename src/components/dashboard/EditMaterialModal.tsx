"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/types/material";
import type { Material } from "@/types/material";

interface Props {
  material: Material;
  onClose:  () => void;
  onSaved:  () => void;
}

export function EditMaterialModal({ material: m, onClose, onSaved }: Props) {
  const [title,   setTitle]   = useState(m.title);
  const [desc,    setDesc]    = useState(m.description ?? "");
  const [subject, setSubject] = useState(m.subject ?? SUBJECTS[0]);
  const [price,   setPrice]   = useState(String(m.price ?? 0));
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    setLoading(true);

    const { error: err } = await supabase
      .from("materials")
      .update({
        title:       title.trim(),
        description: desc.trim(),
        subject,
        price:       parseFloat(price) || 0,
      })
      .eq("id", m.id);

    if (err) { setError(err.message); setLoading(false); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Editar publicación</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Título *</label>
            <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Descripción</label>
            <textarea className="field-textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">Materia</label>
              <div className="select-wrap">
                <select className="field-select" value={subject} onChange={e => setSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Precio (COP)</label>
              <input className="field-input" type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-btn-submit" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}