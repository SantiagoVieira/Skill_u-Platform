"use client";

import { useState, useEffect } from "react";
import { useRouter }  from "next/navigation";
import Link           from "next/link";
import { supabase }   from "@/lib/supabase";
import { useUser }    from "@/lib/UserContext";
import { ConfigModal } from "@/components/dashboard/ConfigModal";
import { Toast }       from "@/components/ui/Toast";

type Purchase = {
  purchase_id:  string;
  material_id:  string;
  title:        string;
  subject:      string;
  file_url:     string;
  file_type:    string;
  file_size:    string;
  author:       string;
  price:        number;
  purchased_at: string;
  seller_id:    string;
};

export default function MisComprasPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();

  const [purchases,   setPurchases]   = useState<Purchase[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [viewing,     setViewing]     = useState<Purchase | null>(null);
  const [showConfig,  setShowConfig]  = useState(false);
  const [toast,       setToast]       = useState("");

  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) { router.replace("/login"); return; }
    loadPurchases();
  }, [profileLoading, profile]);

  async function loadPurchases() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_purchases", {
      buyer_id: profile!.id,
    });
    if (error) console.error(error);
    if (data) setPurchases(data as Purchase[]);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  const totalGastado = purchases.reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">Mis compras</span>
        <div className="topbar-actions">
          <button className="btn-signout" onClick={signOut}>Salir</button>
        </div>
      </header>

      <div className="dash-content">

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Materiales",    value: purchases.length,                            sub: "adquiridos" },
            { label: "Total gastado", value: `$${totalGastado.toLocaleString("es-CO")}`,  sub: "COP"        },
            { label: "Gratuitos",     value: purchases.filter(p => p.price === 0).length, sub: "obtenidos"  },
            { label: "De pago",       value: purchases.filter(p => p.price > 0).length,   sub: "comprados"  },
          ].map(c => (
            <div className="stat-card" key={c.label}>
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-value">{c.value}</div>
              <div className="stat-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Visor de documento */}
        {viewing && (
          <div style={{
            background: "var(--white)", border: "1px solid var(--gray-200)",
            borderRadius: 12, marginBottom: 24, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--gray-200)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)" }}>
                {viewing.title}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={viewing.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12, fontWeight: 600, color: "white",
                    background: "var(--orange)", borderRadius: 6,
                    padding: "5px 12px", textDecoration: "none",
                  }}
                >
                  Descargar
                </a>
                <button
                  onClick={() => setViewing(null)}
                  style={{
                    background: "var(--gray-100)", border: "1px solid var(--gray-200)",
                    borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                    fontSize: 12, color: "var(--gray-600)",
                  }}
                >
                  Cerrar visor
                </button>
              </div>
            </div>

            {viewing.file_type === "PDF" ? (
              <iframe
                src={viewing.file_url}
                style={{ width: "100%", height: 600, border: "none" }}
                title={viewing.title}
              />
            ) : viewing.file_type === "IMG" ? (
              <div style={{ padding: 24, textAlign: "center", background: "var(--gray-50)" }}>
                <img
                  src={viewing.file_url}
                  alt={viewing.title}
                  style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 8 }}
                />
              </div>
            ) : viewing.file_type === "VID" ? (
              <div style={{ padding: 24, background: "var(--gray-50)" }}>
                <video
                  src={viewing.file_url}
                  controls
                  style={{ width: "100%", borderRadius: 8 }}
                />
              </div>
            ) : (
              <div style={{
                padding: 40, textAlign: "center",
                background: "var(--gray-50)", color: "var(--gray-500)",
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <p style={{ fontSize: 13, marginBottom: 12 }}>
                  Este tipo de archivo no se puede previsualizar.<br />
                  Descárgalo para abrirlo.
                </p>
                <a
                  href={viewing.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 13, fontWeight: 600, color: "white",
                    background: "var(--orange)", borderRadius: 8,
                    padding: "8px 20px", textDecoration: "none",
                  }}
                >
                  Descargar archivo
                </a>
              </div>
            )}
          </div>
        )}

        {/* Lista */}
        <div className="section-header">
          <span className="section-title">Historial</span>
          <span className="section-count">
            {loading ? "Cargando…" : `${purchases.length} material${purchases.length !== 1 ? "es" : ""}`}
          </span>
        </div>

        {!loading && purchases.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24">
              <circle cx="9"  cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Aún no has comprado ningún material
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {purchases.map(p => (
            <PurchaseRow
              key={p.purchase_id}
              purchase={p}
              isViewing={viewing?.purchase_id === p.purchase_id}
              onView={() => setViewing(prev =>
                prev?.purchase_id === p.purchase_id ? null : p
              )}
            />
          ))}
        </div>
      </div>

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {toast      && <Toast message={toast} />}
    </>
  );
}

function PurchaseRow({
  purchase: p,
  isViewing,
  onView,
}: {
  purchase:  Purchase;
  isViewing: boolean;
  onView:    () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--white)", border: `1px solid ${isViewing ? "var(--orange)" : "var(--gray-200)"}`,
      borderRadius: 10, padding: "12px 16px",
      transition: "border-color 0.15s",
    }}>
      {/* Icono tipo */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: p.file_type === "PDF" ? "#fff1e6"
          : p.file_type === "IMG" ? "#e0f2fe"
          : p.file_type === "VID" ? "#fce7f3"
          : "#f0fdf4",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: p.file_type === "PDF" ? "var(--orange)"
          : p.file_type === "IMG" ? "#0284c7"
          : p.file_type === "VID" ? "#db2777"
          : "#16a34a",
      }}>
        <FileTypeIcon type={p.file_type} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: "var(--gray-900)", margin: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {p.title}
        </p>
        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "3px 0 0" }}>
          {p.subject ?? "—"} ·{" "}
          <Link
            href={`/vendedor/${p.seller_id}`}
            style={{ color: "var(--orange)", fontWeight: 600, textDecoration: "none" }}
          >
            {p.author}
          </Link>
          {" · "}
          {new Date(p.purchased_at).toLocaleDateString("es-CO")}
        </p>
      </div>

      {/* Precio */}
      <span style={{
        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
        color: p.price === 0 ? "#16a34a" : "var(--orange)",
      }}>
        {p.price === 0 ? "Gratis" : `$${p.price.toLocaleString("es-CO")}`}
      </span>

      {/* Acciones */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={onView}
          style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px",
            borderRadius: 6, cursor: "pointer", border: "1px solid",
            borderColor: isViewing ? "var(--orange)" : "var(--gray-200)",
            background:  isViewing ? "#fff1e6"       : "var(--gray-50)",
            color:       isViewing ? "var(--orange)"  : "var(--gray-600)",
          }}
        >
          {isViewing ? "Cerrar" : "Ver"}
        </button>
        <a
          href={p.file_url}
          download
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px",
            borderRadius: 6, cursor: "pointer",
            border: "1px solid var(--orange)",
            background: "var(--orange)", color: "white",
            textDecoration: "none",
          }}
        >
          Descargar
        </a>
      </div>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "IMG") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (type === "VID") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}