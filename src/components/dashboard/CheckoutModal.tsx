"use client";

import { useState, useEffect } from "react";
import { loadStripe }          from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import { useCart }  from "@/lib/CartContext";
import { useUser }  from "@/lib/UserContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Props {
  onClose: () => void;
  onPaid:  () => void;
}

export function CheckoutModal({ onClose, onPaid }: Props) {
  const { items, total } = useCart();
  const { profile }      = useUser();

  const [clientSecret,  setClientSecret]  = useState("");
  const [orderId,       setOrderId]       = useState("");
  const [loadingSecret, setLoadingSecret] = useState(true);
  const [error,         setError]         = useState("");

  useEffect(() => {
    async function prepare() {
      if (!profile) return;

      const reference = `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({ user_id: profile.id, status: "pending", total, reference })
        .select("id")
        .single();

      if (orderErr) { setError(orderErr.message); setLoadingSecret(false); return; }

      await supabase.from("order_items").insert(
        items.map(i => ({
          order_id:    order.id,
          material_id: i.material.id,
          price:       i.material.price,
        }))
      );

      setOrderId(order.id);

      if (total === 0) { setLoadingSecret(false); return; }

      const res  = await fetch("/api/create-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: total, orderId: order.id }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoadingSecret(false); return; }

      setClientSecret(data.clientSecret);
      setLoadingSecret(false);
    }
    prepare();
  }, []);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
      }}
    >
      <div style={{
        background: "var(--white)", borderRadius: 12,
        width: "100%", maxWidth: 480,
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Header fijo */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--gray-200)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gray-900)" }}>
            Finalizar compra
          </span>
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

        {/* Body scrolleable */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {/* Resumen */}
          <div style={{ marginBottom: 20 }}>
            {items.map(({ material: m }) => (
              <div key={m.id} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 13, padding: "6px 0",
                borderBottom: "1px solid var(--gray-100)",
              }}>
                <span style={{ color: "var(--gray-700)", flex: 1, marginRight: 12 }}>
                  {m.title}
                </span>
                <span style={{ fontWeight: 600, color: "var(--gray-900)", whiteSpace: "nowrap" }}>
                  {m.price === 0 ? "Gratis" : `$${m.price.toLocaleString("es-CO")}`}
                </span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 15, fontWeight: 700, marginTop: 12,
              color: "var(--gray-900)",
            }}>
              <span>Total</span>
              <span style={{ color: "var(--orange)" }}>
                ${total.toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 12 }}>{error}</p>
          )}

          {loadingSecret ? (
            <p style={{
              fontSize: 13, color: "var(--gray-400)",
              textAlign: "center", padding: "20px 0",
            }}>
              Preparando pago…
            </p>
          ) : total === 0 ? (
            <FreeCheckout orderId={orderId} onPaid={onPaid} />
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, locale: "es" }}>
              <StripeForm orderId={orderId} onPaid={onPaid} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Checkout gratis ───────────────────────────────────────
function FreeCheckout({ orderId, onPaid }: { orderId: string; onPaid: () => void }) {
  const { items, clear } = useCart();
  const { profile }      = useUser();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!profile) return;
    setLoading(true);
    await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
    await supabase.from("purchases").insert(
      items.map(i => ({
        user_id:     profile.id,
        material_id: i.material.id,
        order_id:    orderId,
      }))
    );
    clear();
    onPaid();
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      style={{
        width: "100%", background: "#16a34a", color: "white",
        border: "none", borderRadius: 8, padding: "13px 0",
        fontSize: 14, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1, marginTop: 8,
      }}
    >
      {loading ? "Procesando…" : "Obtener gratis →"}
    </button>
  );
}

// ── Formulario Stripe ─────────────────────────────────────
function StripeForm({ orderId, onPaid }: { orderId: string; onPaid: () => void }) {
  const stripe         = useStripe();
  const elements       = useElements();
  const { items, clear } = useCart();
  const { profile }    = useUser();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handlePay() {
    if (!stripe || !elements || !profile) return;
    setLoading(true);
    setError("");

    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (stripeErr) {
      setError(stripeErr.message ?? "Error al procesar el pago");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
      await supabase.from("purchases").insert(
        items.map(i => ({
          user_id:     profile.id,
          material_id: i.material.id,
          order_id:    orderId,
        }))
      );
      clear();
      onPaid();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PaymentElement />
      {error && (
        <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>
      )}
      <button
        onClick={handlePay}
        disabled={loading || !stripe}
        style={{
          width: "100%", background: "var(--orange)", color: "white",
          border: "none", borderRadius: 8, padding: "13px 0",
          fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Procesando…" : "Pagar →"}
      </button>
      <p style={{ fontSize: 10, color: "var(--gray-400)", textAlign: "center" }}>
        Tarjeta de prueba: 4242 4242 4242 4242 · 12/26 · 123
      </p>
    </div>
  );
}