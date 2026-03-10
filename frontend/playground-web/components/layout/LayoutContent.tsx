"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HeaderAuth from "./HeaderAuth";
import TodayBanner from "./TodayBannerNew";
import ScrollToTop from "@/components/ScrollToTop";
import SplashScreen from "@/components/app/SplashScreen";
import { isNativeApp } from "@/lib/platform";

/** 앱 로그인 게이트에서 제외할 경로 */
const AUTH_PAGES = ["/login", "/signup"];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (isNativeApp()) {
      setIsNative(true);
      setShowSplash(true);
    }
  }, []);

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // 앱: 스플래시 끝난 후 비로그인 → /login 리다이렉트
  useEffect(() => {
    if (!isNative || showSplash || loading) return;
    const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
    if (!user && !isAuthPage) {
      router.replace("/login");
    }
  }, [isNative, showSplash, loading, user, pathname, router]);

  // 모든 페이지: 상단 네비게이션 레이아웃
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <HeaderAuth />
      {user && <TodayBanner />}
      <main className="flex-1 px-4 sm:px-6 md:px-8 pt-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        <ScrollToTop />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        {children}
      </main>
    </div>
  );
}
