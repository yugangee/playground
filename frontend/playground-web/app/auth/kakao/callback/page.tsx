"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
);

function KakaoCallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) { window.location.href = "/login"; return; }

    fetch(`${API}/auth/kakao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri: "https://fun.sedaily.ai/auth/kakao/callback" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.isNewUser) {
          const params = new URLSearchParams({
            kakaoId: data.kakaoId,
            email: data.email,
            name: data.name,
          });
          window.location.href = `/signup?${params}`;
        } else if (data.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("idToken", data.idToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          window.location.href = "/";
        } else {
          window.location.href = "/login";
        }
      })
      .catch(() => { window.location.href = "/login"; });
  }, [searchParams]);

  return <Spinner />;
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <KakaoCallbackInner />
    </Suspense>
  );
}
