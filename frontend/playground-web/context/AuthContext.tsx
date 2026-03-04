"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { tryRefreshTokens, clearTokens, isTokenExpiredOrNearExpiry } from "@/lib/tokenRefresh";

const API = process.env.NEXT_PUBLIC_API_URL;

interface User {
  username: string;
  name: string;
  email: string;
  gender?: string;
  birthdate?: string;
  regionSido?: string;
  regionSigungu?: string;
  activeAreas?: { sido: string; sigungu: string }[];
  sports?: string[];
  hasTeam?: boolean;
  teamSport?: string;
  teamId?: string | null;
  teamIds?: string[];
  position?: string;
  avatar?: string;
  number?: number;
  role?: string;
  record?: { games: number; goals: number; assists: number };
  recentGoals?: { date: string; opponent: string; minute: number; score: string }[];
  createdAt?: string;
  ratings?: Record<string, { tier: string; points: number; games: number; wins: number; winStreak: number }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setUser(null); setLoading(false); return; }

    // 토큰이 만료됐거나 5분 이내 만료 예정이면 먼저 갱신 시도
    if (isTokenExpiredOrNearExpiry(token)) {
      const refreshed = await tryRefreshTokens();
      if (!refreshed) {
        clearTokens();
        setUser(null);
        setLoading(false);
        return;
      }
    }

    try {
      const currentToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.status === 401) {
        // 갱신 시도 후 재요청
        const refreshed = await tryRefreshTokens();
        if (!refreshed) {
          clearTokens();
          setUser(null);
          setLoading(false);
          return;
        }
        const retryToken = localStorage.getItem("accessToken");
        const retryRes = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${retryToken}` },
        });
        if (!retryRes.ok) throw new Error();
        const data = await retryRes.json();
        setUser(data);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  // 토큰 자동 갱신: 30분마다 만료 여부 확인
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem("accessToken");
      if (token && isTokenExpiredOrNearExpiry(token)) {
        await tryRefreshTokens();
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
