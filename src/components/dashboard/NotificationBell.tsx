"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUser }  from "@/lib/UserContext";

type Notification = {
  id:         string;
  title:      string;
  message:    string;
  type:       string;
  read:       boolean;
  created_at: string;
};

export function NotificationBell() {
  const { profile }  = useUser();
  const [open,  setOpen]  = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    loadNotifs();

    // Suscripción en tiempo real
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadNotifs() {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifs(data as Notification[]);
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", profile.id)
      .eq("read", false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter(n => !n.read).length;

  const typeColor: Record<string, string> = {
    success: "#16a34a",
    error:   "#dc2626",
    warning: "#d97706",
    info:    "#2563eb",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Campana */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) loadNotifs(); }}
        style={{
          position: "relative",
          background: "var(--gray-100)",
          border: "1px solid var(--gray-200)",
          borderRadius: 8, padding: "6px 10px",
          cursor: "pointer", color: "var(--gray-700)",
          display: "flex", alignItems: "center",
        }}
      >
        <BellIcon />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            background: "#dc2626", color: "white",
            borderRadius: "50%", width: 17, height: 17,
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 340, maxHeight: 420,
          background: "var(--white)",
          border: "1px solid var(--gray-200)",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          zIndex: 200,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--gray-100)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-900)" }}>
              Notificaciones
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11, color: "var(--orange)", background: "none",
                  border: "none", cursor: "pointer", fontWeight: 600,
                }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{
                padding: "32px 16px", textAlign: "center",
                color: "var(--gray-400)", fontSize: 13,
              }}>
                Sin notificaciones
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--gray-50)",
                    background: n.read ? "transparent" : "#fafafa",
                    cursor: "pointer",
                    borderLeft: `3px solid ${n.read ? "transparent" : typeColor[n.type] ?? "#2563eb"}`,
                  }}
                >
                  <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 3,
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: typeColor[n.type] ?? "var(--gray-900)",
                    }}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: typeColor[n.type] ?? "#2563eb",
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <p style={{
                    fontSize: 11, color: "var(--gray-600)",
                    margin: 0, lineHeight: 1.5,
                  }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: 10, color: "var(--gray-400)", marginTop: 4, display: "block" }}>
                    {new Date(n.created_at).toLocaleString("es-CO", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}