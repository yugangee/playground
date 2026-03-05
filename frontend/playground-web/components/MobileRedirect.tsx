"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function MobileRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 이미 /m/ 경로에 있으면 리다이렉트 안 함
    if (pathname.startsWith("/m/")) return;
    
    // 모바일 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 640;

    if (isMobile) {
      // 현재 경로를 /m/ 경로로 변환
      const mobilePath = pathname === "/" ? "/m" : `/m${pathname}`;
      router.push(mobilePath);
    }
  }, [pathname, router]);

  return null;
}