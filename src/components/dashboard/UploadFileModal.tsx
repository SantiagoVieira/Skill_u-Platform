"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Material } from "@/types/material";

interface Props {
  onClose:   () => void;
  onUploaded: () => void;
}

export function UploadFileModal({ onClose, onUploaded }: Props) {
  const [myPubs,    setMyPubs]    = useState<Material[]>([]);
  const [mode,      setMode]      = useState<"select" | "new">("select");
  const [selId,     setSelId]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const [fileObj,   setFileObj]   = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    async function loadMyPubs() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", session.user.id)
        .is("file_url", null)
        .order("created_at", { ascending: false });
      if (data) setMyPubs(data as Material[]);
    }
    loadMyPubs();
  }, []);

  function handleFile(file: File) {
    setFileObj(file);
    setFileName(file.name);
  }

  async function handleUpload() {
    if (!fileObj)       { setError("Selecciona un archivo"); return; }
    if (!selId && mode === "select") { setError("Selecciona una publicación"); return; }
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const ext   = fileObj.name.split(".").pop()?.toUpperCase() ?? "PDF";
    const path  = `${session.user.id}/${Date.now()}_${fileObj.name}`;
    const size  = (fileObj.size / 1_048_576).toFixed(1) + " MB";

    
    const { error: upErr } = await supabase.storage
      .from("materials")
      .upload(path, fileObj);

    if (upErr) { setError(upErr.message); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);


    await supabase
      .from("materials")
      .update({
        file_url:   urlData.publicUrl,
        file_type:  ["PDF","DOC","DOCX"].includes(ext) ? (ext === "PDF" ? "PDF" : "DOC")
                    : ["JPG","PNG","WEBP"].includes(ext) ? "IMG"
                    : ["MP4","MOV"].includes(ext) ? "VID" : "PDF",
        file_size:  size,
        is_visible: true,
      })
      .eq("id", selId);

    onUploaded();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Subir archivo</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Seleccionar publicación o crear nueva */}
          <div>
            <label className="field-label" style={{ marginBottom: 8 }}>¿A qué publicación corresponde?</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                className={mode === "select" ? "btn-orange-sm" : "btn-ghost"}
                onClick={() => setMode("select")}
              >
                Publicación existente
              </button>
              <button
                className={mode === "new" ? "btn-orange-sm" : "btn-ghost"}
                onClick={() => setMode("new")}
              >
                + Nueva publicación
              </button>
            </div>

            {mode === "select" && (
              myPubs.length === 0
                ? <p style={{ fontSize: 12, color: "var(--gray-400)" }}>No tienes publicaciones sin archivo. Crea una primero.</p>
                : <div className="select-wrap">
                    <select className="field-select" value={selId} onChange={e => setSelId(e.target.value)}>
                      <option value="">Selecciona una publicación…</option>
                      {myPubs.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
            )}

            {mode === "new" && (
              <p style={{ fontSize: 12, color: "var(--gray-400)" }}>
                Primero usa <strong>"Publicar datos"</strong> para crear la publicación, luego vuelve aquí a subir el archivo.
              </p>
            )}
          </div>

          {/* Drop zone */}
          <div
            className="drop-zone"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("over"); }}
            onDragLeave={e => e.currentTarget.classList.remove("over")}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("over"); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("file-inp")?.click()}
          >
            <div className="drop-zone-icon">
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-zone-text">
              <strong>Haz clic o arrastra</strong> tu archivo aquí<br />
              PDF, DOC, JPG, PNG, MP4 · Máx 50 MB
            </p>
            <input id="file-inp" type="file" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {fileName && (
            <div className="file-chip">
              <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              <span className="file-chip-name">{fileName}</span>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-btn-submit" onClick={handleUpload} disabled={loading || mode === "new"}>
            {loading ? "Subiendo…" : "Publicar archivo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
