"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import HeaderAuth from "./HeaderAuth";
import TodayBanner from "./TodayBannerNew";
import ScrollToTop from "@/components/ScrollToTop";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  // 비로그인 상태이고 메인 페이지일 때는 풀스크린 레이아웃
  const isLandingPage = !user && !loading && pathname === "/";
  
  if (isLandingPage) {
    // 랜딩 페이지: 헤더 없음
    return (
      <div className="min-h-screen flex flex-col">
        <ScrollToTop />
        {children}
      </div>
    );
  }

  // 로그인 상태 또는 다른 페이지: 상단 네비게이션 레이아웃
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderAuth />
      {user && <TodayBanner />}
      <main className="flex-1 px-8 pt-8 pb-8 max-w-7xl mx-auto w-full">
        <ScrollToTop />
        {children}
      </main>
    </div>
  );
}
