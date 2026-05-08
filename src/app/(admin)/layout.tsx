import type { Metadata } from "next";
import { UserProvider } from "@/lib/UserContext";

export const metadata: Metadata = {
  title: "Skill_u — Administración",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="admin-shell">{children}</div>
    </UserProvider>
  );
}