"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { toast } from "sonner";

const INACTIVITY_MS = 3 * 60 * 60 * 1000; // 3 hours
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: "Admin" | "Rep" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockInDone = useRef(false); // prevent double clock-in on StrictMode double-invoke

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile((data as Profile | null) ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // ── Auto clock-in whenever user logs in and is clocked out ──────
  useEffect(() => {
    if (!user) {
      clockInDone.current = false; // reset so next login can clock in
      return;
    }
    if (clockInDone.current) return;
    clockInDone.current = true;

    async function autoClockIn() {
      const res = await fetch("/api/hr/clock");
      if (!res.ok) return;
      const data = await res.json() as { status: string };
      if (data.status !== "clocked_out") return; // already clocked in

      const clockRes = await fetch("/api/hr/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clock_in" }),
      });
      if (clockRes.ok) {
        toast.success("כניסה נרשמה — שיהיה יום עבודה מוצלח! ☀️");
      }
    }

    void autoClockIn();
  }, [user]);

  const signOut = useCallback(async () => {
    // Clock out before signing out (best-effort)
    await fetch("/api/hr/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clock_out" }),
    }).catch(() => {});
    await supabase.auth.signOut();
  }, [supabase]);

  // ── Global 3-hour inactivity auto-logout ─────────────────────────
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(async () => {
        toast.info("נותקת אוטומטית עקב חוסר פעילות של 3 שעות");
        await fetch("/api/hr/clock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clock_out" }),
        }).catch(() => {});
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, INACTIVITY_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user, supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: (profile?.role as "Admin" | "Rep") ?? null,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
