"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function KakaoCallbackPage() {
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
          // 신규 회원 → 회원가입 페이지로 카카오 정보 전달
          const params = new URLSearchParams({
            kakaoId: data.kakaoId,
            email: data.email,
            name: data.name,
          });
          window.location.href = `/signup?${params}`;
        } else if (data.accessToken) {
          // 기존 회원 → 로그인 완료
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

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
