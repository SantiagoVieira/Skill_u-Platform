"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter }   from "next/navigation";
import { supabase }    from "@/lib/supabase";
import { useUser }     from "@/lib/UserContext";
import { useCart }     from "@/lib/CartContext";
import {
  StatsGrid, SearchFilters, MaterialGrid,
} from "@/components/dashboard/dashboardComponents";
import { PublishMetaModal }    from "@/components/dashboard/PublishMetaModal";
import { UploadFileModal }     from "@/components/dashboard/UploadFileModal";
import { SellerModal }         from "@/components/dashboard/SellerModal";
import { ConfigModal }         from "@/components/dashboard/ConfigModal";
import { MaterialDetailModal } from "@/components/dashboard/MaterialDetailModal";
import { CartDrawer }          from "@/components/dashboard/CartDrawer";
import { CheckoutModal }       from "@/components/dashboard/CheckoutModal";
import { Toast }               from "@/components/ui/Toast";
import type { Material }       from "@/types/material";

export default function MaterialesPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();
  const { count, buyNow } = useCart();

  const isSeller = profile?.is_seller ?? false;

  const [materials,    setMaterials]    = useState<Material[]>([]);
  const [purchases,    setPurchases]    = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterSubj,   setFilterSubj]   = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [selectedMat,  setSelectedMat]  = useState<Material | null>(null);
  const [showPublish,  setShowPublish]  = useState(false);
  const [showUpload,   setShowUpload]   = useState(false);
  const [showSeller,   setShowSeller]   = useState(false);
  const [showConfig,   setShowConfig]   = useState(false);
  const [showCart,     setShowCart]     = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast,        setToast]        = useState("");

  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (!profileLoading && !profile) { router.replace("/login"); return; }
    if (!profileLoading) { loadMaterials(); loadPurchases(); }
  }, [profileLoading, profile]);

  async function loadMaterials() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_visible_materials");
    if (error) console.error("Error:", error);
    if (data) {
      setMaterials(data.map((m: any) => ({
        ...m,
        author: m.author ?? "Anónimo",
      })));
    }
    setLoading(false);
  }

  async function loadPurchases() {
    if (!profile) return;
    const { data } = await supabase
      .from("purchases")
      .select("material_id")
      .eq("user_id", profile.id);
    if (data) setPurchases(new Set(data.map((p: any) => p.material_id)));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return materials.filter(m =>
      (!q || m.title.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q)) &&
      (!filterSubj || m.subject === filterSubj) &&
      (!filterType || m.file_type === filterType)
    );
  }, [materials, search, filterSubj, filterType]);

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">Material académico</span>
        <div className="topbar-actions">
          {!isSeller ? (
            <button className="btn-want-sell" onClick={() => setShowSeller(true)}>
              ¿Quieres vender?
            </button>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setShowPublish(true)}>
                Publicar datos
              </button>
              <button className="btn-orange-sm" onClick={() => setShowUpload(true)}>
                <PlusIcon /> Subir archivo
              </button>
            </>
          )}

          {/* Botón carrito */}
          <button
            onClick={() => setShowCart(true)}
            style={{
              position: "relative",
              background: "var(--gray-100)",
              border: "1px solid var(--gray-200)",
              borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", color: "var(--gray-700)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <CartIcon />
            {count > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                background: "var(--orange)", color: "white",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {count}
              </span>
            )}
          </button>

          <button className="btn-signout" onClick={signOut}>Salir</button>
        </div>
      </header>

      <div className="dash-content">
        <StatsGrid
          total={materials.length}
          published={materials.length}
          downloads={0}
          categories={new Set(materials.map(m => m.subject)).size}
        />
        <SearchFilters
          search={search}         onSearch={setSearch}
          filterSubj={filterSubj} onFilterSubj={setFilterSubj}
          filterType={filterType} onFilterType={setFilterType}
        />
        <div>
          <div className="section-header">
            <span className="section-title">Resultados</span>
            <span className="section-count">
              {loading
                ? "Cargando…"
                : `${filtered.length} material${filtered.length !== 1 ? "es" : ""}`}
            </span>
          </div>
          <MaterialGrid
            materials={filtered}
            selectedId={null}
            onSelect={id => setSelectedMat(filtered.find(m => m.id === id) ?? null)}
            myId={profile?.id}
            purchases={purchases}
          />
        </div>
      </div>

      {selectedMat && (
        <MaterialDetailModal
          material={selectedMat}
          myId={profile?.id}
          purchased={purchases.has(selectedMat.id)}
          onClose={() => setSelectedMat(null)}
          onAddedToCart={() => {
            setSelectedMat(null);
            showToast("Añadido al carrito");
          }}
          onGotFree={() => {
            setSelectedMat(null);
            showToast("¡Material obtenido!");
            loadPurchases();
          }}
          onBuyNow={() => {
            buyNow(selectedMat);
            setSelectedMat(null);
            setShowCheckout(true);
          }}
        />
      )}

      {showPublish && (
        <PublishMetaModal
          onClose={() => setShowPublish(false)}
          onSaved={() => {
            setShowPublish(false);
            showToast("Publicación guardada. Ahora sube el archivo.");
          }}
        />
      )}

      {showUpload && (
        <UploadFileModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            showToast("¡Archivo publicado exitosamente!");
            loadMaterials();
          }}
        />
      )}

      {showSeller && (
        <SellerModal
          onClose={() => setShowSeller(false)}
          onAccepted={() => {
            setShowSeller(false);
            showToast("¡Ya eres vendedor!");
          }}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
      />

      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onPaid={() => {
            setShowCheckout(false);
            showToast("🎉 ¡Compra exitosa! Ya puedes descargar tus materiales.");
            loadPurchases();
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5"  x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9"  cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
