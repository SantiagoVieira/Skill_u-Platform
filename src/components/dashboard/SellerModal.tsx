"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose:    () => void;
  onAccepted: () => void;
}

export function SellerModal({ onClose, onAccepted }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("profiles")
      .update({ is_seller: true })
      .eq("id", session.user.id);

    // Notificar al Sidebar para que aparezca "Mis publicaciones" sin recargar
    window.dispatchEvent(new CustomEvent("seller-activated"));

    onAccepted();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Términos para vendedores</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{
            background: "var(--gray-50)", border: "1px solid var(--gray-200)",
            borderRadius: 8, padding: "16px", fontSize: 12,
            color: "var(--gray-600)", lineHeight: 1.7, maxHeight: 280, overflowY: "auto"
          }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Términos y condiciones para vendedores en Skill_u</p>
            <p>Al activar tu cuenta como vendedor en Skill_u, aceptas los siguientes términos:</p>
            <br />
            <p><strong>1. Contenido propio:</strong> Solo puedes publicar material académico de tu autoría o sobre el que tengas derechos de distribución.</p>
            <br />
            <p><strong>2. Calidad del contenido:</strong> El material debe ser relevante, estar bien organizado y cumplir con estándares académicos básicos.</p>
            <br />
            <p><strong>3. Precios justos:</strong> Los precios deben ser razonables. Skill_u se reserva el derecho de revisar materiales con precios abusivos.</p>
            <br />
            <p><strong>4. Comisión:</strong> Skill_u retiene el 15% de cada venta como comisión por la plataforma.</p>
            <br />
            <p><strong>5. Restricciones:</strong> Queda prohibido publicar material con derechos de autor de terceros, contenido engañoso o de baja calidad.</p>
            <br />
            <p><strong>6. Suspensión:</strong> El incumplimiento de estos términos puede resultar en la suspensión de tu cuenta de vendedor.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-btn-submit" onClick={handleAccept} disabled={loading}>
            {loading ? "Activando…" : "Acepto — Quiero vender"}
          </button>
        </div>
      </div>
    </div>
  );
}