"use client";

import { useEffect, useState } from "react";

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // iOS Safari에서만, 홈 화면 앱으로 실행 중이 아닐 때만 표시
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem("pwa-banner-dismissed");

    if (isIOS && !isStandalone && !dismissed) {
      // 첫 방문 3초 후 표시
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border px-4 py-3 shadow-2xl"
      style={{
        background: "rgba(15,15,20,0.96)",
        borderColor: "rgba(124,58,237,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg"
          style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3)" }}
        >
          ⚽
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">홈 화면에 추가</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            Safari 하단{" "}
            <span className="font-bold text-violet-400">공유</span>{" "}
            버튼 → <span className="font-bold text-violet-400">홈 화면에 추가</span>
            하면 앱처럼 사용할 수 있어요
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="닫기"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
