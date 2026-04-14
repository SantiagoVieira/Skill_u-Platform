"use client";

import { useState }  from "react";
import { supabase }  from "@/lib/supabase";
import { useCart }   from "@/lib/CartContext";
import { useUser }   from "@/lib/UserContext";
import type { Material } from "@/types/material";

interface Props {
  material:      Material;
  myId?:         string;
  purchased:     boolean;
  onClose:       () => void;
  onAddedToCart: () => void;
  onGotFree:     () => void;
  onBuyNow:      () => void;
}

export function MaterialDetailModal({
  material: m,
  myId,
  purchased,
  onClose,
  onAddedToCart,
  onGotFree,
  onBuyNow,
}: Props) {
  const { add, has } = useCart();
  const { profile }  = useUser();
  const [loading, setLoading] = useState(false);

  const isOwn  = !!myId && myId === m.user_id;
  const inCart = has(m.id);
  const isFree = m.price === 0;

  async function handleGetFree() {
    if (!profile) return;
    setLoading(true);
    const reference = `FREE-${Date.now()}`;
    const { data: order } = await supabase
      .from("orders")
      .insert({ user_id: profile.id, status: "paid", total: 0, reference })
      .select("id")
      .single();
    if (order) {
      await supabase.from("order_items").insert({
        order_id: order.id, material_id: m.id, price: 0,
      });
      await supabase.from("purchases").insert({
        user_id: profile.id, material_id: m.id, order_id: order.id,
      });
    }
    setLoading(false);
    onGotFree();
  }

  const rows: [string, string][] = [
    ["Tipo de archivo", m.file_type ?? "—"],
    ["Tamaño",          m.file_size ?? "—"],
    ["Materia",         m.subject   ?? "—"],
    ["Precio",          m.price === 0 ? "Gratis" : `$${m.price.toLocaleString("es-CO")} COP`],
    ["Publicado",       new Date(m.created_at).toLocaleDateString("es-CO")],
  ];

  function renderAction() {
    // Publicación propia
    if (isOwn) {
      return (
        <span style={{
          fontSize: 12, color: "var(--gray-500)", fontStyle: "italic",
          display: "flex", alignItems: "center",
        }}>
          Tu publicación
        </span>
      );
    }

    // Ya comprado / descarga disponible
    if (purchased) {
      return (
        <a
          href={m.file_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="modal-btn-submit"
          style={{
            textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          Descargar
        </a>
      );
    }

    // Gratis
    if (isFree) {
      return (
        <button
          className="modal-btn-submit"
          onClick={handleGetFree}
          disabled={loading}
          style={{ background: "#16a34a", border: "none" }}
        >
          {loading ? "Procesando…" : "Obtener gratis →"}
        </button>
      );
    }

    // De pago — dos botones
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {inCart ? (
          <span style={{
            fontSize: 12, color: "var(--orange)", fontWeight: 600,
            display: "flex", alignItems: "center", whiteSpace: "nowrap",
          }}>
            ✓ En el carrito
          </span>
        ) : (
          <button
            className="modal-btn-cancel"
            onClick={() => { add(m); onAddedToCart(); }}
            style={{ whiteSpace: "nowrap" }}
          >
            + Carrito
          </button>
        )}
        <button
          className="modal-btn-submit"
          onClick={onBuyNow}
          style={{ whiteSpace: "nowrap" }}
        >
          Comprar ahora →
        </button>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{m.title}</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 12, color: "var(--gray-500)", lineHeight: 1.6 }}>
            {m.description}
          </p>

          <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 12 }}>
            {rows.map(([label, value]) => (
              <div key={label} className="detail-row">
                <span className="detail-row-lbl">{label}</span>
                <span className="detail-row-val">{value}</span>
              </div>
            ))}
          </div>

          {m.author && (
            <p style={{ fontSize: 11, color: "var(--gray-400)" }}>
              Publicado por {m.author}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cerrar</button>
          {renderAction()}
        </div>
      </div>
    </div>
  );
}