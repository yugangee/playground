"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
        <h1 className="text-2xl font-black text-white">로그인</h1>
        <p className="text-gray-500 text-sm">PLAYGROUND에 오신 걸 환영해요</p>
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
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
        {/* <div className="space-y-3">
        <button
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: "#FEE500", color: "#191919" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919"><path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.632 1.553 4.963 3.918 6.318L4.5 21l4.918-2.618A11.3 11.3 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/></svg>
          카카오로 로그인
        </button>
        <button
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: "white", color: "#333" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Google로 로그인
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-600 text-xs">또는 이메일로 로그인</span>
        <div className="flex-1 h-px bg-white/10" />
      </div> */}
        <Link
          href="/signup"
          className="block w-full py-3 rounded-xl font-semibold text-sm text-gray-300 text-center border border-white/10 hover:border-white/30 transition-colors"
        >
          회원가입
        </Link>
      </div>

      <p className="text-center text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400 transition-colors">← 메인으로 돌아가기</Link>
      </p>
    </div>
  );
}
