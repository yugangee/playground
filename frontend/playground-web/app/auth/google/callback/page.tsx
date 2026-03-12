"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const API = process.env.NEXT_PUBLIC_API_URL;

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function GoogleCallbackInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("초기화 중...");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) { window.location.href = "/login"; return; }

    // 환경변수 체크
    if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) {
      setError(`환경변수 누락: DOMAIN=${COGNITO_DOMAIN}, CLIENT_ID=${COGNITO_CLIENT_ID}`);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    setStatus("Cognito 토큰 교환 중...");

    (async () => {
      try {
        // 1) Cognito 토큰 교환
        const tokenRes = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: COGNITO_CLIENT_ID!,
            redirect_uri: redirectUri,
            code,
          }),
        });

        const data = await tokenRes.json();
        if (data.error) {
          setError(`토큰 교환 실패: ${data.error_description || data.error}`);
          return;
        }

        if (!data.access_token || !data.id_token) {
          setError(`토큰 응답 이상: ${JSON.stringify(data).slice(0, 200)}`);
          return;
        }

        // 토큰 저장
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("idToken", data.id_token);
        if (data.refresh_token) localStorage.setItem("refreshToken", data.refresh_token);

        setStatus("프로필 확인 중...");

        // 2) 기존 회원인지 확인
        let isExisting = false;
        try {
          const meRes = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            if (me.email && me.createdAt) {
              isExisting = true;
            }
          }
        } catch {
          // /auth/me 실패 → 신규 회원으로 간주
        }

        if (isExisting) {
          window.location.href = "/";
        } else {
          // 신규 회원 → 회원가입 페이지로
          const payload = JSON.parse(atob(data.id_token.split(".")[1]));
          const params = new URLSearchParams({
            email: payload.email || "",
            googleId: payload.sub || "",
            cognito: "true",
          });
          window.location.href = `/signup?${params}`;
        }
      } catch (e: any) {
        setError(`요청 실패: ${e.message}`);
      }
    })();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4 px-6">
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.href = "/login"}
          className="text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }}
        >
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-3">
      <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-400">{status}</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
