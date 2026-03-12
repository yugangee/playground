"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isNativeApp } from "@/lib/platform";

const API = process.env.NEXT_PUBLIC_API_URL;
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (isNativeApp()) setIsNative(true);
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("idToken", data.idToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    fontSize: "14px",
  };

  return (
    <div className="max-w-sm mx-auto pt-16 space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>로그인</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>PLAYGROUND에 오신 걸 환영해요</p>
      </div>

      <div className="space-y-3">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div className="space-y-3">
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>또는</span>
        <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            const baseUrl = window.location.hostname === 'localhost'
              ? 'http://localhost:3000'
              : 'https://fun.sedaily.ai';
            const redirect = encodeURIComponent(`${baseUrl}/auth/google/callback`);
            window.location.href = `https://${COGNITO_DOMAIN}/oauth2/authorize?identity_provider=Google&response_type=code&client_id=${COGNITO_CLIENT_ID}&redirect_uri=${redirect}&scope=openid+email+profile`;
          }}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: "white", color: "#333" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google로 시작하기
        </button>

        <Link
          href="/signup"
          className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-colors"
          style={{ color: "var(--text-secondary)", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          이메일로 시작하기
        </Link>
      </div>

      {!isNative && (
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:opacity-70 transition-opacity">← 메인으로 돌아가기</Link>
        </p>
      )}
    </div>
  );
}
