"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { regionData } from "./regions";

const API = process.env.NEXT_PUBLIC_API_URL;

const sports = ["축구", "풋살", "농구", "야구", "배구", "배드민턴", "아이스하키", "스노보드", "러닝크루", "기타"];

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", gender: "", birth: "", id: "", password: "", passwordConfirm: "", regionSido: "", regionSigungu: "" });
  const [activeAreas, setActiveAreas] = useState([
    { sido: "", sigungu: "" },
    { sido: "", sigungu: "" },
    { sido: "", sigungu: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);
  const [teamSport, setTeamSport] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamPosition, setTeamPosition] = useState("");
  const [apiClubs, setApiClubs] = useState<any[]>([]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggleSport = (s: string) =>
    setSelectedSports((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  // 종목 선택 시 해당 종목 클럽 목록 불러오기
  useEffect(() => {
    if (!teamSport) { setApiClubs([]); return; }
    fetch(`${API}/clubs?sport=${encodeURIComponent(teamSport)}`)
      .then(r => r.json())
      .then(d => setApiClubs(d.clubs || []))
      .catch(() => setApiClubs([]));
  }, [teamSport]);

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "white",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    fontSize: "14px",
  };

  const updateActiveArea = (idx: number, field: "sido" | "sigungu", value: string) => {
    setActiveAreas((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value, ...(field === "sido" ? { sigungu: "" } : {}) } : a));
  };

  const isDuplicateArea = (idx: number, sido: string, sigungu: string) => {
    if (!sido || !sigungu) return false;
    return activeAreas.some((a, i) => i !== idx && a.sido === sido && a.sigungu === sigungu);
  };

  const handleAreaSigungu = (idx: number, value: string) => {
    const sido = activeAreas[idx].sido;
    if (isDuplicateArea(idx, sido, value)) return;
    updateActiveArea(idx, "sigungu", value);
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
          <span style={{ color: value ? "white" : "#6b7280" }}>{value || placeholder}</span>
          <span style={{ color: "#6b7280", fontSize: "10px" }}>▼</span>
        </button>
        {open && items.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: "4px", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", maxHeight: "200px", overflowY: "auto" }}>
            {items.map((item) => (
              <div key={item} onClick={() => { onChange(item); setOpen(false); }}
                style={{ padding: "10px 16px", fontSize: "14px", color: item === value ? "#c084fc" : "white", cursor: "pointer", background: item === value ? "rgba(192,132,252,0.1)" : "transparent" }}
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
  const chipInactive = { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" };

  const handleSignup = async () => {
    setError("");
    if (form.password !== form.passwordConfirm) { setError("비밀번호가 일치하지 않습니다"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.id,
          password: form.password,
          name: form.name,
          gender: form.gender === "남성" ? "male" : "female",
          birthdate: form.birth,
          regionSido: form.regionSido,
          regionSigungu: form.regionSigungu,
          activeAreas: activeAreas.filter((a) => a.sido),
          sports: selectedSports,
          hasTeam: hasTeam || false,
          teamSport: teamSport || "",
          teamId: teamId || null,
          position: teamPosition || "",
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

        {/* 거주지 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">거주지</p>
          <div className="flex gap-2">
            <Dropdown value={form.regionSido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => setForm((p) => ({ ...p, regionSido: v, regionSigungu: "" }))} />
            <Dropdown value={form.regionSigungu} placeholder="시/군/구" items={getSigunguItems(form.regionSido)} onChange={(v) => setForm((p) => ({ ...p, regionSigungu: v }))} disabled={!form.regionSido} />
          </div>
        </div>

        {/* 활동 가능 지역 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">활동 가능 지역 (최대 3개)</p>
          <div className="space-y-2">
            {activeAreas.map((area, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}</span>
                <Dropdown value={area.sido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => updateActiveArea(i, "sido", v)} />
                <Dropdown value={area.sigungu} placeholder="시/군/구"
                  items={getSigunguItems(area.sido).filter((sg) => !isDuplicateArea(i, area.sido, sg))}
                  onChange={(v) => handleAreaSigungu(i, v)} disabled={!area.sido} />
              </div>
            ))}
          </div>
        </div>

        {/* 관심 스포츠 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">관심 스포츠 * (복수 선택 가능)</p>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <button key={s} type="button" onClick={() => toggleSport(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={selectedSports.includes(s) ? chipActive : chipInactive}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* 소속팀 여부 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">소속된 팀이 있으신가요?</p>
          <div className="flex gap-2">
            {[{ label: "있어요", val: true }, { label: "없어요", val: false }].map(({ label, val }) => (
              <button key={label} type="button"
                onClick={() => { setHasTeam(val); setTeamSport(""); setTeamId(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={hasTeam === val ? chipActive : chipInactive}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* 종목 선택 */}
        {hasTeam === true && (
          <div>
            <p className="text-xs text-gray-500 mb-2">종목 선택</p>
            <div className="flex flex-wrap gap-2">
              {sports.map((s) => (
                <button key={s} type="button"
                  onClick={() => { setTeamSport(s); setTeamId(null); setTeamPosition(""); }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={teamSport === s ? chipActive : chipInactive}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* 팀 선택 */}
        {hasTeam === true && teamSport && (
          <div>
            <p className="text-xs text-gray-500 mb-2">소속 팀 선택 {apiClubs.length > 0 && `(${apiClubs.length}개)`}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {apiClubs.map((c: any) => (
                <button key={c.clubId} type="button"
                  onClick={() => setTeamId(c.clubId)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
                  style={teamId === c.clubId ? { ...chipActive, borderRadius: "12px" } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs opacity-60">{c.areas?.[0]?.sido} {c.areas?.[0]?.sigungu}</span>
                </button>
              ))}
              {apiClubs.length === 0 && <p className="text-xs text-gray-600 text-center py-2">해당 종목 클럽이 없습니다</p>}
            </div>
          </div>
        )}

        {/* 포지션 선택 */}
        {hasTeam === true && teamId && (
          <div>
            <p className="text-xs text-gray-500 mb-2">포지션</p>
            <div className="flex flex-wrap gap-2">
              {["GK","DF","MF","FW","C","PG","SG","SF","PF","투수","포수","내야수","외야수","세터","리베로","공격수","기타"].map((p) => (
                <button key={p} type="button"
                  onClick={() => setTeamPosition(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={teamPosition === p ? chipActive : chipInactive}
                >{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
        >
          {loading ? "가입 중..." : "가입하기"}
        </button>
        <p className="text-center text-xs text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors">로그인</Link>
        </p>
      </div>

      <p className="text-center text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400 transition-colors">← 메인으로 돌아가기</Link>
      </p>
    </div>
  );
}
