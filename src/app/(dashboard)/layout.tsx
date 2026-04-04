import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UserProvider } from "@/lib/UserContext";

export const metadata: Metadata = {
  title: "Skill_u — Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="dash-shell">
        <Sidebar />
        <div className="dash-main">{children}</div>
      </div>
    </UserProvider>
  );
}
