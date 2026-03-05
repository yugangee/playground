"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import HeaderAuth from "@/components/layout/HeaderAuth";
import TodayBanner from "@/components/layout/TodayBannerNew";
import ScrollToTop from "@/components/ScrollToTop";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobilePath = pathname.startsWith("/m/");

  // 모바일 경로면 children만 렌더링 (모바일 레이아웃이 처리)
  if (isMobilePath) {
    return <>{children}</>;
  }

  // 웹 버전 레이아웃
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <HeaderAuth />
        <TodayBanner />
        <main className="flex-1 px-4 xs:px-8 pt-4 xs:pt-8 pb-20 xs:pb-8">
          <ScrollToTop />
          {children}
        </main>
      </div>
    </div>
  );
}