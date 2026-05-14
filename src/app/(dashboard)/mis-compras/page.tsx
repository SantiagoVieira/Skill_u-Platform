"use client";

import { useState, useEffect } from "react";
import { useRouter }       from "next/navigation";
import { supabase }        from "@/lib/supabase";
import { useUser }         from "@/lib/UserContext";
import { ConfigModal }     from "@/components/dashboard/ConfigModal";
import { Toast }           from "@/components/ui/Toast";
import { RateSellerModal } from "@/components/reputation/Ratesellermodal";
import { ReportModal }     from "@/components/dashboard/ReportModal";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

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

  const [purchases,        setPurchases]        = useState<Purchase[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [viewing,          setViewing]          = useState<Purchase | null>(null);
  const [showConfig,       setShowConfig]       = useState(false);
  const [toast,            setToast]            = useState("");
  const [rateTarget,       setRateTarget]       = useState<{ sellerId: string; sellerName: string } | null>(null);
  const [reportTarget,     setReportTarget]     = useState<Purchase | null>(null);
  const [reviewedSellers,  setReviewedSellers]  = useState<Set<string>>(new Set());
  const [reportedMaterials, setReportedMaterials] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) { router.replace("/login"); return; }
    loadPurchases();
    loadReviewedSellers();
    loadReportedMaterials();
  }, [profileLoading, profile]);

  async function loadPurchases() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_purchases", { buyer_id: profile!.id });
    if (error) console.error(error);
    if (data) setPurchases(data as Purchase[]);
    setLoading(false);
  }

  async function loadReviewedSellers() {
    if (!profile) return;
    const { data } = await supabase
      .from("seller_reviews")
      .select("seller_id")
      .eq("reviewer_id", profile.id);
    if (data) setReviewedSellers(new Set(data.map((r: any) => r.seller_id)));
  }

  async function loadReportedMaterials() {
    if (!profile) return;
    const { data } = await supabase
      .from("reports")
      .select("material_id")
      .eq("reporter_id", profile.id);
    if (data) setReportedMaterials(new Set(data.map((r: any) => r.material_id)));
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
          <NotificationBell />
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

        {/* Visor */}
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
                <a href={viewing.file_url} download target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, fontWeight: 600, color: "white", background: "var(--orange)", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>
                  Descargar
                </a>
                <button onClick={() => setViewing(null)}
                  style={{ background: "var(--gray-100)", border: "1px solid var(--gray-200)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: "var(--gray-600)" }}>
                  Cerrar visor
                </button>
              </div>
            </div>
            {viewing.file_type === "PDF" ? (
              <iframe src={viewing.file_url} style={{ width: "100%", height: 600, border: "none" }} title={viewing.title} />
            ) : viewing.file_type === "IMG" ? (
              <div style={{ padding: 24, textAlign: "center", background: "var(--gray-50)" }}>
                <img src={viewing.file_url} alt={viewing.title} style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 8 }} />
              </div>
            ) : viewing.file_type === "VID" ? (
              <div style={{ padding: 24, background: "var(--gray-50)" }}>
                <video src={viewing.file_url} controls style={{ width: "100%", borderRadius: 8 }} />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", background: "var(--gray-50)", color: "var(--gray-500)" }}>
                <p style={{ fontSize: 13, marginBottom: 12 }}>Este tipo de archivo no se puede previsualizar.</p>
                <a href={viewing.file_url} download target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: "white", background: "var(--orange)", borderRadius: 8, padding: "8px 20px", textDecoration: "none" }}>
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
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
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
              hasReviewed={reviewedSellers.has(p.seller_id)}
              hasReported={reportedMaterials.has(p.material_id)}
              onView={() => setViewing(prev => prev?.purchase_id === p.purchase_id ? null : p)}
              onRate={() => setRateTarget({ sellerId: p.seller_id, sellerName: p.author })}
              onReport={() => setReportTarget(p)}
            />
          ))}
        </div>
      </div>

      {rateTarget && (
        <RateSellerModal
          sellerId={rateTarget.sellerId}
          sellerName={rateTarget.sellerName}
          onClose={() => setRateTarget(null)}
          onReviewed={() => {
            setRateTarget(null);
            loadReviewedSellers();
            showToast("¡Reseña publicada!");
          }}
        />
      )}

      {reportTarget && (
        <ReportModal
          materialId={reportTarget.material_id}
          materialTitle={reportTarget.title}
          sellerId={reportTarget.seller_id}
          onClose={() => setReportTarget(null)}
          onReported={() => {
            setReportTarget(null);
            loadReportedMaterials();
            showToast("Reporte enviado. Lo revisaremos pronto.");
          }}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {toast      && <Toast message={toast} />}
    </>
  );
}

function PurchaseRow({
  purchase: p, isViewing, hasReviewed, hasReported, onView, onRate, onReport,
}: {
  purchase:    Purchase;
  isViewing:   boolean;
  hasReviewed: boolean;
  hasReported: boolean;
  onView:      () => void;
  onRate:      () => void;
  onReport:    () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "var(--white)",
      border: `1px solid ${isViewing ? "var(--orange)" : "var(--gray-200)"}`,
      borderRadius: 10, padding: "12px 16px", transition: "border-color 0.15s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: p.file_type === "PDF" ? "#fff1e6" : p.file_type === "IMG" ? "#e0f2fe" : p.file_type === "VID" ? "#fce7f3" : "#f0fdf4",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: p.file_type === "PDF" ? "var(--orange)" : p.file_type === "IMG" ? "#0284c7" : p.file_type === "VID" ? "#db2777" : "#16a34a",
      }}>
        <FileTypeIcon type={p.file_type} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-900)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.title}
        </p>
        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: "3px 0 0" }}>
          {p.subject ?? "—"} · <strong>{p.author}</strong> · {new Date(p.purchased_at).toLocaleDateString("es-CO")}
        </p>
      </div>

      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: p.price === 0 ? "#16a34a" : "var(--orange)" }}>
        {p.price === 0 ? "Gratis" : `$${p.price.toLocaleString("es-CO")}`}
      </span>

      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
        {/* Calificar */}
        {!hasReviewed ? (
          <button onClick={onRate}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid #f59e0b", background: "#fff8e1", color: "#92400e", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff8e1"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Calificar
          </button>
        ) : (
          <span onClick={onRate}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid #86efac", background: "#f0fdf4", color: "#16a34a", whiteSpace: "nowrap" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Calificado
          </span>
        )}

        {/* Reportar */}
        {!hasReported ? (
          <button onClick={onReport}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
            onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Reportar
          </button>
        ) : (
          <span style={{ fontSize: 11, color: "var(--gray-400)", padding: "5px 10px", whiteSpace: "nowrap" }}>
            Reportado
          </span>
        )}

        {/* Ver */}
        <button onClick={onView}
          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid", borderColor: isViewing ? "var(--orange)" : "var(--gray-200)", background: isViewing ? "#fff1e6" : "var(--gray-50)", color: isViewing ? "var(--orange)" : "var(--gray-600)" }}>
          {isViewing ? "Cerrar" : "Ver"}
        </button>

        {/* Descargar */}
        <a href={p.file_url} download target="_blank" rel="noreferrer"
          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--orange)", background: "var(--orange)", color: "white", textDecoration: "none" }}>
          Descargar
        </a>
      </div>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "IMG") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (type === "VID") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
}