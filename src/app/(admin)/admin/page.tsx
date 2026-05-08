"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function AdminPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/curator/materials", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin test</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}