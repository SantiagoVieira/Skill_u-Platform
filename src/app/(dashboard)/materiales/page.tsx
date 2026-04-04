"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/UserContext";
import {
  StatsGrid,
  SearchFilters,
  MaterialGrid,
} from "@/components/dashboard/dashboardComponents";
import { PublishMetaModal }    from "@/components/dashboard/PublishMetaModal";
import { UploadFileModal }     from "@/components/dashboard/UploadFileModal";
import { SellerModal }         from "@/components/dashboard/SellerModal";
import { ConfigModal }         from "@/components/dashboard/ConfigModal";
import { MaterialDetailModal } from "@/components/dashboard/MaterialDetailModal";
import { Toast }               from "@/components/ui/Toast";
import type { Material }       from "@/types/material";

export default function MaterialesPage() {
  const router = useRouter();
  const { profile, signOut, loading: profileLoading } = useUser();

  const isSeller = profile?.is_seller ?? false;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [search,     setSearch]     = useState("");
  const [filterSubj, setFilterSubj] = useState("");
  const [filterType, setFilterType] = useState("");

  const [selectedMat, setSelectedMat] = useState<Material | null>(null);
  const [showPublish, setShowPublish]  = useState(false);
  const [showUpload,  setShowUpload]   = useState(false);
  const [showSeller,  setShowSeller]   = useState(false);
  const [showConfig,  setShowConfig]   = useState(false);
  const [toast,       setToast]        = useState("");

  useEffect(() => {
    const handler = () => setShowConfig(true);
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.replace("/login");
      return;
    }
    if (!profileLoading) loadMaterials();
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
          <button className="btn-signout" onClick={signOut}>
            Salir
          </button>
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
              {loading ? "Cargando…" : `${filtered.length} material${filtered.length !== 1 ? "es" : ""}`}
            </span>
          </div>
          <MaterialGrid
            materials={filtered}
            selectedId={null}
            onSelect={id => setSelectedMat(filtered.find(m => m.id === id) ?? null)}
          />
        </div>
      </div>

      {selectedMat && (
        <MaterialDetailModal material={selectedMat} onClose={() => setSelectedMat(null)} />
      )}

      {showPublish && (
        <PublishMetaModal
          onClose={() => setShowPublish(false)}
          onSaved={() => { setShowPublish(false); showToast("Publicación guardada. Ahora sube el archivo."); }}
        />
      )}

      {showUpload && (
        <UploadFileModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); showToast("¡Archivo publicado exitosamente!"); loadMaterials(); }}
        />
      )}

      {showSeller && (
        <SellerModal
          onClose={() => setShowSeller(false)}
          onAccepted={() => { setShowSeller(false); showToast("¡Ya eres vendedor!"); }}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {toast      && <Toast message={toast} />}
    </>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}
