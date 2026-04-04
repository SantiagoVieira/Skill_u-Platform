"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
}

export function ConfigModal({ onClose }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [program,   setProgram]   = useState("");
  const [email,     setEmail]     = useState("");
  const [newPass,   setNewPass]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, program")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name  ?? "");
        setProgram(data.program     ?? "");
      }
    }
    load();
  }, []);

  async function handleSave() {
    setLoading(true);
    setMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, program })
      .eq("id", session.user.id);

    if (newPass.length >= 8) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) { setMsg("Error al cambiar contraseña: " + error.message); setLoading(false); return; }
    }

    setMsg("¡Perfil actualizado!");
    setLoading(false);
    setNewPass("");
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Configuración de perfil</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">Nombre</label>
              <input className="field-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Apellido</label>
              <input className="field-input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Correo electrónico</label>
            <input className="field-input" value={email} disabled style={{ opacity: 0.6 }} />
          </div>

          <div className="field-group">
            <label className="field-label">Carrera / Programa</label>
            <input className="field-input" value={program} onChange={e => setProgram(e.target.value)} placeholder="Ingeniería de Sistemas" />
          </div>

          <div className="field-group">
            <label className="field-label">Nueva contraseña (dejar vacío para no cambiar)</label>
            <input className="field-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>

          {msg && <p style={{ fontSize: 12, color: msg.startsWith("Error") ? "#ef4444" : "#16a34a" }}>{msg}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cerrar</button>
          <button className="modal-btn-submit" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}