"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id:         string;
  first_name: string;
  last_name:  string;
  program:    string;
  is_seller:  boolean;
};

type UserContextType = {
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  refresh: () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setProfile(null); setLoading(false); return; }

    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, program, is_seller")
      .eq("id", session.user.id)
      .maybeSingle();

    setProfile(data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());

    const onSellerActivated = () => load();
    window.addEventListener("seller-activated", onSellerActivated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("seller-activated", onSellerActivated);
    };
  }, []);

  async function signOut() {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject("timeout"), 1000)),
      ]);
    } catch (e) {
      console.warn("signOut:", e);
    }
    window.location.href = "/login";
  }

  return (
    <UserContext.Provider value={{ profile, loading, refresh: load, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);