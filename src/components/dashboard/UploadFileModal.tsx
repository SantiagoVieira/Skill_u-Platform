"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/types/material";
import type { Material } from "@/types/material";

interface Props {
  onClose:        () => void;
  onUploaded:     () => void;
  preselectedId?: string;
}

export function UploadFileModal({ onClose, onUploaded, preselectedId }: Props) {
  const [myPubs,   setMyPubs]   = useState<Material[]>([]);
  const [mode,     setMode]     = useState<"select" | "new">("select");
  const [selId,    setSelId]    = useState(preselectedId ?? "");
  const [fileName, setFileName] = useState("");
  const [fileObj,  setFileObj]  = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Campos nueva publicación
  const [title,   setTitle]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [price,   setPrice]   = useState("0");

  useEffect(() => {
    loadMyPubs();
  }, []);

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

  function handleFile(file: File) {
    setFileObj(file);
    setFileName(file.name);
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) setPrice(raw);
  }

  function handlePriceBlur() {
    if (price === "") setPrice("0");
  }

  async function handleUpload() {
    if (!fileObj) { setError("Selecciona un archivo"); return; }
    if (mode === "select" && !selId) { setError("Selecciona una publicación"); return; }
    if (mode === "new" && !title.trim()) { setError("El título es obligatorio"); return; }

    setLoading(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    let materialId = selId;

    // Si es nueva publicación, crearla primero
    if (mode === "new") {
      const parsedPrice = parseInt(price, 10) || 0;
      const { data: newMat, error: insertErr } = await supabase
        .from("materials")
        .insert({
          user_id:     session.user.id,
          title:       title.trim(),
          description: desc.trim(),
          subject,
          price:       parsedPrice,
          is_visible:  false,
        })
        .select("id")
        .single();

      if (insertErr) { setError(insertErr.message); setLoading(false); return; }
      materialId = newMat.id;
    }

    // Sanitizar nombre del archivo
    const safeName = fileObj.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const ext  = safeName.split(".").pop()?.toUpperCase() ?? "PDF";
    const path = `${session.user.id}/${Date.now()}_${safeName}`;
    const size = (fileObj.size / 1_048_576).toFixed(1) + " MB";

    // Subir archivo
    const { error: upErr } = await supabase.storage
      .from("materials")
      .upload(path, fileObj);

    if (upErr) { setError(upErr.message); setLoading(false); return; }

    const { data: urlData } = supabase.storage.from("materials").getPublicUrl(path);

    // Actualizar material
    const { error: updateErr } = await supabase
      .from("materials")
      .update({
        file_url:  urlData.publicUrl,
        file_type: ["PDF", "DOC", "DOCX"].includes(ext)
          ? ext === "PDF" ? "PDF" : "DOC"
          : ["JPG", "PNG", "WEBP"].includes(ext) ? "IMG"
          : ["MP4", "MOV"].includes(ext) ? "VID" : "PDF",
        file_size:  size,
        is_visible: true,
      })
      .eq("id", materialId);

    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    onUploaded();
  }

  // Si viene preselectedId, buscar el título para mostrarlo
  const preselectedTitle = myPubs.find(p => p.id === preselectedId)?.title;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Subir archivo</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ── Si viene preseleccionado, mostrar a qué publicación va ── */}
          {preselectedId ? (
            <div style={{
              background: "var(--gray-50)", border: "1px solid var(--gray-200)",
              borderRadius: 8, padding: "10px 14px", marginBottom: 4,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--orange)" strokeWidth="2" strokeLinecap="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span style={{ fontSize: 12, color: "var(--gray-700)" }}>
                Subiendo archivo para:{" "}
                <strong>{preselectedTitle ?? "Cargando…"}</strong>
              </span>
            </div>
          ) : (
            /* ── Selector de modo ── */
            <div>
              <label className="field-label" style={{ marginBottom: 8 }}>
                ¿A qué publicación corresponde?
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  className={mode === "select" ? "btn-orange-sm" : "btn-ghost"}
                  onClick={() => { setMode("select"); setError(""); }}
                >
                  Publicación existente
                </button>
                <button
                  className={mode === "new" ? "btn-orange-sm" : "btn-ghost"}
                  onClick={() => { setMode("new"); setError(""); }}
                >
                  + Nueva publicación
                </button>
              </div>

              {/* ── Modo: seleccionar existente ── */}
              {mode === "select" && (
                myPubs.length === 0
                  ? <p style={{ fontSize: 12, color: "var(--gray-400)" }}>
                      No tienes publicaciones sin archivo. Crea una nueva.
                    </p>
                  : <div className="select-wrap">
                      <select
                        className="field-select"
                        value={selId}
                        onChange={e => setSelId(e.target.value)}
                      >
                        <option value="">Selecciona una publicación…</option>
                        {myPubs.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
              )}

              {/* ── Modo: nueva publicación ── */}
              {mode === "new" && (
                <div style={{
                  background: "var(--gray-50)", border: "1px solid var(--gray-200)",
                  borderRadius: 8, padding: 14,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div className="field-group" style={{ margin: 0 }}>
                    <label className="field-label">Título *</label>
                    <input
                      className="field-input"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ej: Apuntes Cálculo Diferencial 2024-1"
                    />
                  </div>

                  <div className="field-group" style={{ margin: 0 }}>
                    <label className="field-label">Descripción</label>
                    <textarea
                      className="field-textarea"
                      rows={2}
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Describe brevemente el contenido..."
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">Materia</label>
                      <div className="select-wrap">
                        <select
                          className="field-select"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                        >
                          {SUBJECTS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="field-group" style={{ margin: 0 }}>
                      <label className="field-label">
                        Precio (COP)
                        {price !== "0" && price !== "" && (
                          <span style={{ color: "var(--orange)", fontWeight: 400, marginLeft: 6 }}>
                            ${parseInt(price || "0").toLocaleString("es-CO")}
                          </span>
                        )}
                      </label>
                      <input
                        className="field-input"
                        type="text"
                        inputMode="numeric"
                        value={price}
                        onChange={handlePriceChange}
                        onBlur={handlePriceBlur}
                        placeholder="0 = gratis"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Drop zone ── */}
          <div
            className="drop-zone"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("over"); }}
            onDragLeave={e => e.currentTarget.classList.remove("over")}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove("over");
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
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
            <input
              id="file-inp"
              type="file"
              style={{ display: "none" }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {fileName && (
            <div className="file-chip">
              <svg viewBox="0 0 24 24">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span className="file-chip-name">{fileName}</span>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="modal-btn-submit"
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? "Publicando…" : "Publicar archivo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
