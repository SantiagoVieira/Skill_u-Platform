"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase }  from "@/lib/supabase";
import { useUser }   from "@/lib/UserContext";
import { ConfigModal }        from "@/components/dashboard/ConfigModal";
import { Toast }              from "@/components/ui/Toast";
import { MyReputationModal } from "@/components/reputation/Myreputationmodal";
import { NotificationBell } from "@/components/dashboard/NotificationBell";


type Sale = {
  order_id:       string;
  material_id:    string;
  material_title: string;
  buyer_name:     string;
  price:          number;
  sold_at:        string;
};

export default function MisVentasPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();

  const [sales,           setSales]           = useState<Sale[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showConfig,      setShowConfig]      = useState(false);
  const [showReputation,  setShowReputation]  = useState(false);
  const [toast,           setToast]           = useState("");

  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) { router.replace("/login"); return; }
    if (!profile.is_seller) { router.replace("/materiales"); return; }
    loadSales();
  }, [profileLoading, profile]);

  async function loadSales() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_sales", {
      seller_id: profile!.id,
    });
    if (error) console.error(error);
    if (data) setSales(data as Sale[]);
    setLoading(false);
  }

  const totalIngresos = sales.reduce((s, v) => s + (v.price ?? 0), 0);
  const materialesMap = sales.reduce((acc, v) => {
    acc[v.material_title] = (acc[v.material_title] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const masVendido = Object.entries(materialesMap)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">Mis ventas</span>
        <div className="topbar-actions">
          {/* Botón mi reputación */}
          <button
            onClick={() => setShowReputation(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 36, padding: "0 14px",
              background: "#fff8e1", color: "#92400e",
              border: "1px solid #f59e0b",
              borderRadius: "var(--radius-md)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff8e1"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Mi reputación
          </button>
          <NotificationBell />
          <button className="btn-signout" onClick={signOut}>Salir</button>
        </div>
      </header>

      <div className="dash-content">

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Total ventas",   value: sales.length,                                sub: "transacciones"  },
            { label: "Ingresos",       value: `$${totalIngresos.toLocaleString("es-CO")}`, sub: "COP generados"  },
            { label: "Más vendido",    value: masVendido,                                  sub: "material top"   },
            { label: "Compradores",    value: new Set(sales.map(s => s.buyer_name)).size,   sub: "únicos"         },
          ].map(c => (
            <div className="stat-card" key={c.label}>
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-value" style={{
                fontSize: typeof c.value === "string" && c.value.length > 10 ? 13 : undefined,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {c.value}
              </div>
              <div className="stat-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div className="section-header">
          <span className="section-title">Historial de ventas</span>
          <span className="section-count">
            {loading ? "Cargando…" : `${sales.length} venta${sales.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {!loading && sales.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24">
              <line x1="12" y1="1"  x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Aún no tienes ventas registradas
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {sales.map((s, i) => (
            <SaleRow key={`${s.order_id}-${i}`} sale={s} />
          ))}
        </div>
      </div>

      {/* Modal mi reputación */}
      {showReputation && profile && (
        <MyReputationModal
          sellerId={profile.id}
          onClose={() => setShowReputation(false)}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {toast      && <Toast message={toast} />}
    </>
  );
}

function SaleRow({ sale: s }: { sale: Sale }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--white)", border: "1px solid var(--gray-200)",
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: "#f0fdf4",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#16a34a",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5">
          <line x1="12" y1="1"  x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: "var(--gray-900)", margin: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {s.material_title}
        </p>
        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "3px 0 0" }}>
          Comprado por <strong>{s.buyer_name}</strong>
          {" · "}
          {new Date(s.sold_at).toLocaleDateString("es-CO", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </p>
      </div>

      <span style={{ fontSize: 14, fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>
        +${s.price.toLocaleString("es-CO")} COP
      </span>
    </div>
  );
}