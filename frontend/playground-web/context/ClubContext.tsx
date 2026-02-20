"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type MyClub = {
  name: string;
  sido: string;
  sigungu: string;
  style: string;
  image: string; // object URL or ""
};

type ClubCtx = {
  myClub: MyClub | null;
  setMyClub: (c: MyClub) => void;
  updateMyClub: (c: Partial<MyClub>) => void;
};

const ClubContext = createContext<ClubCtx | null>(null);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [myClub, setMyClub] = useState<MyClub | null>(null);
  function updateMyClub(c: Partial<MyClub>) {
    setMyClub(prev => prev ? { ...prev, ...c } : null);
  }
  return <ClubContext.Provider value={{ myClub, setMyClub, updateMyClub }}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within ClubProvider");
  return ctx;
}
