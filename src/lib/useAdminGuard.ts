"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAdminGuard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, is_admin")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!data?.is_admin) {
        router.replace("/login");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    check();
  }, [router]);

  const isAdmin = !loading && profile?.is_admin === true;
  return { profile, loading, isAdmin };
}