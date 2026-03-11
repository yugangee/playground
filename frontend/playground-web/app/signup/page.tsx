"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { regionData } from "./regions";

const API = process.env.NEXT_PUBLIC_API_URL;

function SignupInner() {
  const searchParams = useSearchParams();
  const kakaoId = searchParams.get("kakaoId") || "";
  const googleId = searchParams.get("googleId") || "";

  const [form, setForm] = useState({
    name: searchParams.get("name") || "",
    gender: "", birth: "",
    id: searchParams.get("email") || "",
    password: "", passwordConfirm: "",
    regionSido: "", regionSigungu: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

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

  const getSigunguItems = (sido: string) => sido ? ["전체", ...(regionData[sido] || [])] : [];

  function Dropdown({ value, placeholder, items, onChange, disabled }: { value: string; placeholder: string; items: string[]; onChange: (v: string) => void; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    return (
      <div ref={ref} style={{ position: "relative", width: "100%" }}>
        <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)}
          style={{ ...inputStyle, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: value ? "var(--text-primary)" : "#6b7280" }}>{value || placeholder}</span>
          <span style={{ color: "#6b7280", fontSize: "10px" }}>▼</span>
        </button>
        {open && items.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: "4px", background: "var(--dropdown-bg)", border: "1px solid var(--input-border)", borderRadius: "10px", maxHeight: "200px", overflowY: "auto" }}>
            {items.map((item) => (
              <div key={item} onClick={() => { onChange(item); setOpen(false); }}
                style={{ padding: "10px 16px", fontSize: "14px", color: item === value ? "#c084fc" : "var(--text-primary)", cursor: "pointer", background: item === value ? "rgba(192,132,252,0.1)" : "transparent" }}
                onMouseEnter={(e) => { if (item !== value) (e.target as HTMLDivElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { (e.target as HTMLDivElement).style.background = item === value ? "rgba(192,132,252,0.1)" : "transparent"; }}>
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const chipActive = { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" };
  const chipInactive = { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" };

  const handleSignup = async () => {
    setError("");
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다"); return; }
    setLoading(true);
    try {
      // 소셜 로그인 비밀번호 생성
      let password = form.password;
      if (kakaoId) password = `Kakao#${kakaoId}`;
      else if (googleId) password = `Google#${googleId}`;

      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.id,
          password,
          name: form.name,
          gender: form.gender === "남성" ? "male" : "female",
          birthdate: form.birth,
          regionSido: form.regionSido,
          regionSigungu: form.regionSigungu,
          kakaoId: kakaoId || undefined,
          googleId: googleId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      router.push("/login");
    } catch (e: any) {
      setError(e.message || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto pt-12 pb-12 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-white">회원가입</h1>
        <p className="text-gray-500 text-sm">PLAYGROUND와 함께 시작하세요</p>
      </div>

      <div className="space-y-3">
        <input required type="text" placeholder="이름 *" value={form.name} onChange={set("name")} style={inputStyle} />

        <div>
          <p className="text-xs text-gray-500 mb-2">성별 *</p>
          <div className="flex gap-2">
            {["남성", "여성"].map((g) => (
              <button key={g} type="button"
                onClick={() => setForm((p) => ({ ...p, gender: g }))}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={form.gender === g ? chipActive : chipInactive}
              >{g}</button>
            ))}
          </div>
        </div>

        <input required type="date" value={form.birth} onChange={set("birth")}
          style={{ ...inputStyle, colorScheme: "dark" }} />

        <input required type="email" placeholder="이메일 *" value={form.id} onChange={set("id")} style={inputStyle} />
        <input required type="password" placeholder="비밀번호 *" value={form.password} onChange={set("password")} style={inputStyle} />
        <input required type="password" placeholder="비밀번호 확인 *" value={form.passwordConfirm} onChange={set("passwordConfirm")} style={inputStyle} />
        {form.passwordConfirm && form.password !== form.passwordConfirm && (
          <p className="text-red-400 text-xs">비밀번호가 일치하지 않습니다</p>
        )}
        {form.passwordConfirm && form.password === form.passwordConfirm && (
          <p className="text-green-400 text-xs">비밀번호가 일치합니다</p>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-2">거주지</p>
          <div className="flex gap-2">
            <Dropdown value={form.regionSido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => setForm((p) => ({ ...p, regionSido: v, regionSigungu: "" }))} />
            <Dropdown value={form.regionSigungu} placeholder="시/군/구" items={getSigunguItems(form.regionSido)} onChange={(v) => setForm((p) => ({ ...p, regionSigungu: v }))} disabled={!form.regionSido} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 border"
          style={{ background: "#000000", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
        <p className="text-center text-xs text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-white hover:text-gray-300 transition-colors">로그인</Link>
        </p>
      </div>

      <p className="text-center text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400 transition-colors">← 메인으로 돌아가기</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SignupInner />
    </Suspense>
  );
}
