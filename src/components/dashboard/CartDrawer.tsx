"use client";

import { useCart } from "@/lib/CartContext";

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, onClose, onCheckout }: Props) {
  const { items, remove, total, count } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 380, background: "var(--white)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
        zIndex: 50, display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--gray-200)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CartIcon />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-900)" }}>
              Carrito
            </span>
            {count > 0 && (
              <span style={{
                background: "var(--orange)", color: "white",
                borderRadius: 20, fontSize: 11, fontWeight: 700,
                padding: "2px 8px",
              }}>
                {count}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--gray-500)", fontSize: 18, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {items.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 12,
              color: "var(--gray-400)",
            }}>
              <CartIcon size={40} />
              <p style={{ fontSize: 13 }}>Tu carrito está vacío</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(({ material: m }) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--gray-50)", borderRadius: 8,
                    padding: "10px 12px", border: "1px solid var(--gray-200)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: "var(--gray-900)",
                      margin: 0, whiteSpace: "nowrap", overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {m.title}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "3px 0 0" }}>
                      {m.subject ?? "—"}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "var(--orange)",
                    whiteSpace: "nowrap",
                  }}>
                    ${m.price.toLocaleString("es-CO")}
                  </span>
                  <button
                    onClick={() => remove(m.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--gray-400)", fontSize: 16, lineHeight: 1,
                      padding: 0, flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            padding: "16px 24px", borderTop: "1px solid var(--gray-200)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--gray-600)" }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--gray-900)" }}>
                ${total.toLocaleString("es-CO")} COP
              </span>
            </div>
            <button
              onClick={onCheckout}
              style={{
                background: "var(--orange)", color: "white",
                border: "none", borderRadius: 8, padding: "12px 0",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                width: "100%",
              }}
            >
              Ir a pagar →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9"  cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}