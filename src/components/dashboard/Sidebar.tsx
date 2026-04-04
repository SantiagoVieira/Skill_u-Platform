"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/UserContext";

type NavItem = {
  label:       string;
  href:        string;
  icon:        React.ReactNode;
  isModal?:    boolean;
  sellerOnly?: boolean;
};

type NavGroup = {
  section: string;
  items:   NavItem[];
};

const NAV: NavGroup[] = [
  {
    section: "General",
    items: [
      {
        label: "Materiales",
        href:  "/materiales",
        icon: (
          <svg viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
      },
      {
        label:       "Mis publicaciones",
        href:        "/mis-publicaciones",
        sellerOnly:  true,
        icon: (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Cuenta",
    items: [
      {
        label:   "Configuración",
        href:    "#config",
        isModal: true,
        icon: (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useUser();

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const name     = profile ? `${profile.first_name} ${profile.last_name}` : "...";
  const program  = profile?.program ?? "...";
  const isSeller = profile?.is_seller ?? false;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo-area">
        <Link href="/materiales" className="sidebar-logo" style={{ textDecoration: "none" }}>
          <div className="sidebar-logo-icon">
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="white"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="sidebar-logo-name">Skill<span>_u</span></span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="nav-section-label">{group.section}</p>
            {group.items
              .filter(item => !item.sellerOnly || isSeller)
              .map((item) =>
                item.isModal ? (
                  <button
                    key={item.label}
                    className="nav-item nav-item-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-config"))}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${
                      pathname === item.href || pathname.startsWith(item.href + "/")
                        ? "active" : ""
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initials}</div>
        <div>
          <div className="sidebar-user-name">{name}</div>
          <div className="sidebar-user-role">{program}</div>
        </div>
      </div>
    </aside>
  );
}