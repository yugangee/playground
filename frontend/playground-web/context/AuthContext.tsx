"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data);
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("idToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("idToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
