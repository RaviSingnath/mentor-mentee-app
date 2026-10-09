"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/supabase/client";
import { getCurrentUser } from "../auth/getCurrentUser";
import type { AuthContextType, AuthUser } from "../types";

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  const [loading, setLoading] = useState(!initialUser);

  const refreshUser = useCallback(async () => {
    const profile = await getCurrentUser();

    setUser(profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (initialUser) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getCurrentUser();

        if (!mounted) return;

        setUser(profile);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" && initialUser) {
        return;
      }

      if (!session) {
        setUser(null);
        return;
      }

      const profile = await getCurrentUser();

      setUser(profile);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const setData = (data: AuthUser | null) => {
      setUser(data);
    };
    setData(initialUser);
  }, [initialUser]);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user?.role) return false;

      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,

      refreshUser,

      isAuthenticated: !!user,

      hasRole,
    }),
    [user, loading, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
