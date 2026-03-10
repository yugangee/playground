 "use client";

import Image from "next/image";
import { MapPin, Trophy, Users, X, Swords, Send, Plus, ImageIcon, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useClub } from "@/context/ClubContext";
import { useAuth } from "@/context/AuthContext";
import { regionData } from "../signup/regions";
import RatingBadge from "@/components/RatingBadge";
import { manageFetch } from "@/lib/manageFetch";

const API = process.env.NEXT_PUBLIC_API_URL;

const sportTypeLabel: Record<string, string> = {
  soccer: "축구", futsal: "풋살", basketball: "농구", baseball: "야구",
  volleyball: "배구", ice_hockey: "아이스하키",
  running: "러닝크루", snowboard: "스노보드", badminton: "배드민턴",
};

interface Toast { id: number; message: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return { toasts, show };
}

type DbClub = {
  clubId: string;
  name: string;
  sport: string;
  areas: { sido: string; sigungu: string }[];
  members: number;
  styles: string[];
  image: string;
  record: string;
  winRate: number;
  recruiting?: boolean;
  createdAt: string;
};

const sidoList = ["전체", ...Object.keys(regionData)];

export default function ClubsPage() {
  const { setMyClub } = useClub();
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [allClubs, setAllClubs] = useState<DbClub[]>([]);
  const [sido, setSido] = useState("전체");
  const [sigungu, setSigungu] = useState("전체");
  const [filterSport, setFilterSport] = useState("전체");
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DbClub | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [proposed, setProposed] = useState<string[]>([]);
  const [aiPool, setAiPool] = useState<DbClub[]>([]);
  const [creating, setCreating] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", sido: "", sigungu: "", image: "", imagePreview: "", members: "" });
  const [clubStyles, setClubStyles] = useState<string[]>([]);
  const [clubSport, setClubSport] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clubAreas, setClubAreas] = useState([
    { sido: "", sigungu: "" },
    { sido: "", sigungu: "" },
    { sido: "", sigungu: "" },
  ]);
  const [joining, setJoining] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts, show } = useToast();
  const PER_PAGE = 8;

  // URL 파라미터에서 sport 필터 읽기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sportParam = params.get('sport');
      if (sportParam) {
        setFilterSport(sportParam);
      }
    }
  }, []);

  // 가입 신청 상태 관리
  const [joinRequestStatus, setJoinRequestStatus] = useState<Record<string, string>>({});

  // 유저가 이미 가입한 클럽인지 확인
  const isAlreadyMember = (clubId: string) => {
    if (!user) return false;
    if (user.teamIds?.includes(clubId)) return true;
    if (user.teamId === clubId) return true;
    return false;
  };

  // 가입 신청 상태 확인
  const checkJoinRequestStatus = async (clubId: string) => {
    if (!user) return null;
    try {
      const r = await fetch(`${API}/join-requests/user?clubId=${clubId}&email=${encodeURIComponent(user.email)}`);
      const d = await r.json();
      if (d.status) {
        setJoinRequestStatus(prev => ({ ...prev, [clubId]: d.status }));
      }
      return d.status;
    } catch {
      return null;
    }
  };

  // 클럽 가입 신청
  const handleJoinRequest = async (club: DbClub) => {
    if (!user) { show("로그인이 필요합니다", "error"); return; }
    if (isAlreadyMember(club.clubId)) { show("이미 가입한 클럽입니다", "error"); return; }
    if (joinRequestStatus[club.clubId] === "pending") { show("이미 가입 신청 중입니다", "error"); return; }
    
    setJoining(club.clubId);
    try {
      const r = await fetch(`${API}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clubId: club.clubId, 
          email: user.email, 
          name: user.name, 
          position: user.position || "" 
        }),
      });
      const d = await r.json();
      if (!r.ok) { show(d.message || "가입 신청 실패", "error"); return; }
      
      setJoinRequestStatus(prev => ({ ...prev, [club.clubId]: "pending" }));
      show(`${club.name}에 가입 신청했습니다! 관리자 승인을 기다려주세요 📝`, "success");
      setSelected(null);
    } catch (e) {
      console.error(e);
      show("가입 신청 중 오류가 발생했습니다", "error");
    } finally {
      setJoining(null);
    }
  };

  // 가입 버튼 상태 텍스트
  const getJoinButtonText = (clubId: string) => {
    if (isAlreadyMember(clubId)) return "가입됨";
    if (joinRequestStatus[clubId] === "pending") return "승인 대기중...";
    if (joining === clubId) return "신청 중...";
    return "가입 신청";
  };

  // API에서 클럽 목록 불러오기 (Auth API만 사용)
  useEffect(() => {
    const loadAuthClubs = fetch(`${API}/clubs`).then(r => r.json()).then(d => d.clubs || []).catch(() => []);
    const loadManageTeams = manageFetch('/discover/teams').then((teams: any[]) =>
      (teams || []).map((t: any): DbClub & { isManageTeam: boolean } => ({
        clubId: t.id,
        name: t.name,
        sport: sportTypeLabel[t.sportType] ?? t.sportType ?? '-',
        areas: t.region ? [{ sido: t.region, sigungu: '' }] : [],
        members: t.memberCount ?? 0,
        styles: [],
        image: t.logoUrl ?? '',
        record: '-',
        winRate: 0,
        recruiting: t.hasOpenRecruitment ?? false,
        createdAt: t.createdAt ?? '',
        isManageTeam: true,
      }))
    ).catch(() => []);
    Promise.all([loadAuthClubs, loadManageTeams]).then(([authClubs, manageTeams]) => {
      const list = [...authClubs, ...manageTeams];
      setAllClubs(list);
      setAiPool([...authClubs].sort(() => Math.random() - 0.5).slice(0, 4));
    });
  }, []);

  const aiMatches = aiPool.filter((c) => !dismissed.includes(c.clubId));

  const handleSido = (s: string) => { setSido(s); setSigungu("전체"); setPage(1); };

  // 시/도에 해당하는 시/군/구 목록 (데이터 기반)
  const sigunguList = sido !== "전체"
    ? ["전체", ...Array.from(new Set(allClubs.filter(c => c.areas?.some(a => a.sido === sido)).flatMap(c => c.areas.filter(a => a.sido === sido).map(a => a.sigungu))))]
    : [];

  const filtered = allClubs.filter((c) => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterSport !== "전체" && c.sport !== filterSport) return false;
    if (sido !== "전체" && !c.areas?.some(a => a.sido === sido)) return false;
    if (sigungu !== "전체" && !c.areas?.some(a => a.sigungu === sigungu)) return false;
    if (sortBy === "recruiting" && !c.recruiting) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "winRate") return b.winRate - a.winRate;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const chipStyle = (active: boolean) =>
    active
      ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }
      : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" };

  const modalInputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: "10px",
    color: "var(--text-primary)",
    padding: "10px 14px",
    width: "100%",
    outline: "none",
    fontSize: "13px",
  };

  function ModalDropdown({ value, placeholder, items, onChange, disabled }: { value: string; placeholder: string; items: string[]; onChange: (v: string) => void; disabled?: boolean }) {
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
          style={{ ...modalInputStyle, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)", fontSize: "13px" }}>{value || placeholder}</span>
          <span style={{ color: "#6b7280", fontSize: "10px" }}>▼</span>
        </button>
        {open && items.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, marginTop: "4px", background: "var(--dropdown-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", maxHeight: "200px", overflowY: "auto" }}>
            {items.map((item) => (
              <div key={item} onClick={() => { onChange(item); setOpen(false); }}
                style={{ padding: "8px 14px", fontSize: "13px", color: item === value ? "#c084fc" : "var(--text-primary)", cursor: "pointer", background: item === value ? "rgba(192,132,252,0.1)" : "transparent" }}
                onMouseEnter={(e) => { if (item !== value) (e.target as HTMLDivElement).style.background = "var(--card-bg)"; }}
                onMouseLeave={(e) => { (e.target as HTMLDivElement).style.background = item === value ? "rgba(192,132,252,0.1)" : "transparent"; }}>
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const updateClubArea = (idx: number, field: "sido" | "sigungu", value: string) => {
    setClubAreas((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value, ...(field === "sido" ? { sigungu: "" } : {}) } : a));
  };

  const getClubSigunguItems = (sido: string) => sido ? ["전체", ...(regionData[sido] || [])] : [];

  const isClubDuplicateArea = (idx: number, sido: string, sigungu: string) => {
    if (!sido || !sigungu) return false;
    return clubAreas.some((a, i) => i !== idx && a.sido === sido && a.sigungu === sigungu);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast 알림 */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-xl border animate-toast-in"
            style={{
              background: t.type === 'success'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.15))',
              borderColor: t.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              color: t.type === 'success' ? '#10b981' : '#ef4444',
              backdropFilter: 'blur(8px)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>클럽 탐색</h1>
        </div>
        <button onClick={() => { if (!user) { show("로그인이 필요합니다", "error"); return; } setCreating(true); }} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
          <Plus size={18} />
        </button>
      </div>

      {/* 검색창 */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="클럽 이름으로 검색..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {["전체", "축구", "풋살", "농구", "야구", "배구", "배드민턴", "아이스하키", "스노보드", "러닝크루", "기타"].map((s) => (
            <button key={s} onClick={() => { setFilterSport(s); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={chipStyle(filterSport === s)}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {sidoList.map((s) => (
            <button key={s} onClick={() => handleSido(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={chipStyle(sido === s)}
            >{s}</button>
          ))}
        </div>
        {sido !== "전체" && sigunguList.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {sigunguList.map((g) => (
              <button key={g} onClick={() => setSigungu(g)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={sigungu === g
                  ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }
                  : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
                }
              >{g}</button>
            ))}
          </div>
        )}
      </div>

      {/* 정렬 */}
      <div className="flex justify-end gap-2">
        {[{ key: "latest", label: "최신등록순" }, { key: "winRate", label: "승률순" }, { key: "recruiting", label: "모집중" }].map(({ key, label }) => (
          <button key={key} onClick={() => setSortBy(key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={sortBy === key ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" } : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }}
          >{label}</button>
        ))}
      </div>

      {/* AI 라이벌 매칭 */}
      {aiMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Swords size={15} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI가 찾은 오늘의 라이벌</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aiMatches.map((r) => (
              <div key={r.clubId} className="rounded-xl p-4 space-y-3 relative flex flex-col overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                {r.image && <Image src={r.image} alt={r.name} fill className="object-cover opacity-20 scale-[1.2]" />}
                <button onClick={() => setDismissed((p) => [...p, r.clubId])} className="absolute top-3 right-3 z-10 transition-colors" style={{ color: "var(--text-muted)" }}>
                  <X size={14} />
                </button>
                <div className="relative z-10">
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.areas?.[0]?.sido} {r.areas?.[0]?.sigungu}</p>
                </div>
                <div className="relative z-10 mt-auto space-y-3">
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{r.record}</span>
                    <span style={{ color: "var(--text-primary)" }}>승률 {r.winRate}%</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!user) { show("로그인이 필요합니다", "error"); return; }
                      if (!user.teamId) { show("소속 팀이 필요합니다", "error"); return; }
                      if (user.teamId === r.clubId) return;
                      try {
                        const res = await fetch(`${API}/matches`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ homeClubId: user.teamId, awayClubId: r.clubId, sport: r.sport, createdBy: user.email }),
                        });
                        if (res.ok) { setProposed((p) => [...p, r.clubId]); show("경기를 제안했습니다! ⚔️", "success"); }
                        else { const d = await res.json(); show(d.message || "경기 제안 실패", "error"); }
                      } catch { show("경기 제안 실패", "error"); }
                    }}
                    disabled={proposed.includes(r.clubId)}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    style={proposed.includes(r.clubId)
                      ? { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)" }
                      : { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                    }
                  >
                    <Send size={12} />
                    {proposed.includes(r.clubId) ? "제안 완료 ✓" : "경기 제안"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {paginated.map((c) => (
          <div key={c.clubId} onClick={() => setSelected(c)}
            className="relative rounded-xl overflow-hidden flex flex-col transition-colors group text-left cursor-pointer"
            style={{ minHeight: "calc((100vh - 280px) / 2)", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            {c.image && <Image src={c.image} alt={c.name} fill className="object-cover opacity-20 group-hover:opacity-30 transition-opacity" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 p-4 flex flex-col h-full">
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {(c as any).isManageTeam && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#ffffff" }}>팀</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#ffffff" }}>{c.sport}</span>
                  {(c as any).teamRating && <RatingBadge tier={(c as any).teamRating.tier} type="team" size="sm" />}
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#ffffff" }}>
                    <MapPin size={10} />
                    {c.areas?.[0]?.sido} {c.areas?.[0]?.sigungu}
                  </span>
                </div>
              </div>
              <div className="mt-auto space-y-2">
                <div className="flex items-center gap-1 text-xs" style={{ color: "#ffffff" }}>
                  <Trophy size={10} />
                  <span>{c.record}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#ffffff" }}>멤버 {c.members}명</span>
                  <span style={{ color: "#ffffff" }}>승률 {c.winRate}%</span>
                </div>
                {c.recruiting && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleJoinRequest(c); }}
                    disabled={isAlreadyMember(c.clubId) || joinRequestStatus[c.clubId] === "pending" || joining === c.clubId}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-1"
                    style={isAlreadyMember(c.clubId) || joinRequestStatus[c.clubId] === "pending"
                      ? { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--card-border)" }
                      : { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                    }
                  >
                    <Users size={12} />
                    {getJoinButtonText(c.clubId)}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className="w-8 h-8 rounded-lg text-xs font-semibold transition-colors"
              style={page === p
                ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                : { background: "var(--card-bg)", color: "var(--text-muted)" }
              }
            >{p}</button>
          ))}
        </div>
      )}

      {/* 클럽 생성 모달 */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setCreating(false)}>
          <div className="border rounded-xl p-6 w-full max-w-sm space-y-4" style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">클럽 생성</span>
              <button onClick={() => setCreating(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            {/* 이미지 업로드 */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  const url = URL.createObjectURL(file);
                  setNewClub(p => ({ ...p, image: url, imagePreview: url }));
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-32 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-fuchsia-500/40 transition-colors overflow-hidden relative">
                {newClub.imagePreview
                  ? <Image src={newClub.imagePreview} alt="preview" fill className="object-cover" />
                  : <><ImageIcon size={24} className="text-gray-600" /><span className="text-xs text-gray-500">클럽 이미지 업로드</span></>}
              </button>
            </div>

            {/* 종목 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">종목</label>
              <div className="flex flex-wrap gap-2">
                {["축구", "풋살", "농구", "야구", "배구", "배드민턴", "아이스하키", "스노보드"].map((s) => (
                  <button key={s} type="button"
                    onClick={() => setClubSport(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={clubSport === s ? chipStyle(true) : chipStyle(false)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {([
              { label: "클럽명", key: "name", placeholder: "예) 서울 FC 썬더" },
            ] as { label: string; key: keyof typeof newClub; placeholder: string }[]).map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-gray-400">{label}</label>
                <input
                  value={newClub[key]}
                  onChange={e => setNewClub(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600"
                />
              </div>
            ))}

            {/* 현재 멤버 수 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">현재 멤버 수</label>
              <input
                type="number" min="1" placeholder="예) 15"
                value={newClub.members}
                onChange={e => setNewClub(p => ({ ...p, members: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50 placeholder:text-gray-600"
              />
            </div>

            {/* 플레이 스타일 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">플레이 스타일 (복수 선택)</label>
              <div className="flex flex-wrap gap-2">
                {["공격형", "수비형", "역습형", "점유형", "압박형", "측면공격", "세트피스", "균형형"].map((s) => (
                  <button key={s} type="button"
                    onClick={() => setClubStyles((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={clubStyles.includes(s) ? chipStyle(true) : chipStyle(false)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* 활동 지역 3개 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">활동 지역 (최대 3개)</label>
              <div className="space-y-2">
                {clubAreas.map((area, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-600 w-3 shrink-0">{i + 1}</span>
                    <ModalDropdown value={area.sido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => updateClubArea(i, "sido", v)} />
                    <ModalDropdown value={area.sigungu} placeholder="시/군/구"
                      items={getClubSigunguItems(area.sido).filter((sg) => !isClubDuplicateArea(i, area.sido, sg))}
                      onChange={(v) => { if (!isClubDuplicateArea(i, area.sido, v)) updateClubArea(i, "sigungu", v); }}
                      disabled={!area.sido} />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={async () => {
                const areas = clubAreas.filter(a => a.sido);
                let imageUrl = "";
                // S3에 이미지 업로드
                if (imageFile) {
                  try {
                    const urlRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload-url`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ folder: "clubs", fileName: imageFile.name, contentType: imageFile.type }),
                    });
                    const { uploadUrl, publicUrl } = await urlRes.json();
                    await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": imageFile.type }, body: imageFile });
                    imageUrl = publicUrl;
                  } catch (e) { console.error("이미지 업로드 실패", e); }
                }
                try {
                  const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clubs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: newClub.name,
                      sport: clubSport,
                      areas,
                      members: parseInt(newClub.members) || 1,
                      styles: clubStyles,
                      image: imageUrl,
                      creatorEmail: user?.email || "",
                      recruiting: true,
                    }),
                  });
                  const createData = await createRes.json();
                  const newClubId = createData.clubId || createData.club?.clubId;

                  if (newClubId && user) {
                    // 1) 멤버로 등록 (생성자는 관리자)
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/club-members`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clubId: newClubId, email: user.email, name: user.name, position: user.position || "", role: "manager" }),
                    }).catch(() => { });

                    // 2) 캡틴으로 설정
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clubs`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clubId: newClubId, captainEmail: user.email }),
                    }).catch(() => { });

                    // 3) 내 프로필에 팀 설정
                    const token = localStorage.getItem("accessToken");
                    if (token) {
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ hasTeam: true, teamSport: clubSport, teamId: newClubId, teamIds: [...(user.teamIds || (user.teamId ? [user.teamId] : [])), newClubId], position: user.position || "", role: "leader" }),
                      }).catch(() => { });
                      await refresh();
                    }

                    // 4) Manage API team members에도 등록 (팀관리 페이지 선수 명단용)
                    try {
                      const manageApi = process.env.NEXT_PUBLIC_MANAGE_API_URL;
                      if (manageApi) {
                        await fetch(`${manageApi}/team/${newClubId}/members`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ userId: user.username, name: user.name, email: user.email, position: user.position || "", roles: ["leader", "manager"] }),
                        });
                      }
                    } catch (e) { console.error("Manage API 멤버 등록 실패", e); }
                  }
                } catch (e) { console.error(e); }
                setMyClub({ name: newClub.name, sido: areas[0]?.sido || "", sigungu: areas[0]?.sigungu || "", style: clubStyles.join(", "), image: imageUrl || newClub.image });
                setCreating(false);
                // 목록 새로고침
                fetch(`${API}/clubs`).then(r => r.json()).then(d => setAllClubs(d.clubs || [])).catch(() => { });
                setNewClub({ name: "", sido: "", sigungu: "", image: "", imagePreview: "", members: "" });
                setClubStyles([]);
                setClubSport("");
                setImageFile(null);
                setClubAreas([{ sido: "", sigungu: "" }, { sido: "", sigungu: "" }, { sido: "", sigungu: "" }]);
              }}
              disabled={!newClub.name.trim()}
              className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40"
              style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}
            >클럽 생성</button>
          </div>
        </div>
      )}

      {/* 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}
        >
          <div className="rounded-xl p-6 w-full max-w-md space-y-4"
            style={{ background: "#ffffff", border: "1px solid #e5e5e5" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#000000" }}>{selected.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#000000", color: "#ffffff" }}>{selected.sport}</span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: "#f5f5f5", color: "#000000" }}>
                    <MapPin size={10} />
                    {selected.areas?.[0]?.sido} {selected.areas?.[0]?.sigungu}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.styles?.map((s) => (
                  <span key={s} className="text-xs px-2 py-1 rounded-full" style={{ background: "#f5f5f5", color: "#000000" }}>{s}</span>
                ))}
                <button onClick={() => setSelected(null)} className="transition-colors" style={{ color: "#000000" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Trophy, label: "전적", value: selected.record },
                { icon: Users, label: "멤버", value: `${selected.members}명` },
                { icon: Trophy, label: "승률", value: `${selected.winRate}%` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "#f5f5f5" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} style={{ color: "#666666" }} />
                    <span className="text-xs" style={{ color: "#666666" }}>{label}</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: "#000000" }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3" style={{ background: "#f5f5f5" }}>
              <p className="text-xs mb-2" style={{ color: "#666666" }}>활동 가능지역</p>
              <div className="flex gap-2 flex-wrap">
                {selected.areas?.map((area, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "#ffffff", color: "#000000", border: "1px solid #e5e5e5" }}>
                    <MapPin size={10} />
                    {area.sido} {area.sigungu}
                  </span>
                ))}
              </div>
            </div>

            {/* 가입 신청 버튼 */}
            {selected.recruiting && (
              <button
                onClick={() => handleJoinRequest(selected)}
                disabled={isAlreadyMember(selected.clubId) || joinRequestStatus[selected.clubId] === "pending" || joining === selected.clubId}
                className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                style={isAlreadyMember(selected.clubId) || joinRequestStatus[selected.clubId] === "pending"
                  ? { background: "#f5f5f5", color: "#666666" }
                  : { background: "#000000", color: "#ffffff" }
                }
              >
                {isAlreadyMember(selected.clubId) ? "이미 가입한 클럽입니다" : getJoinButtonText(selected.clubId)}
              </button>
            )}

            <button
              onClick={async () => {
                if (!user) { show("로그인이 필요합니다", "error"); return; }
                if (!user.teamId) { show("소속 팀이 필요합니다", "error"); return; }
                if (user.teamId === selected.clubId) { show("자기 팀에는 경기를 제안할 수 없습니다", "error"); return; }
                try {
                  const r = await fetch(`${API}/matches`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ homeClubId: user.teamId, awayClubId: selected.clubId, sport: selected.sport, createdBy: user.email }),
                  });
                  const data = await r.json();
                  if (!r.ok) { show(data.message || "경기 제안 실패", "error"); return; }
                  show("경기를 제안했습니다! ⚔️", "success");
                  setSelected(null);
                } catch { show("경기 제안 실패", "error"); }
              }}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: "#000000", color: "#ffffff" }}
            >
              경기 제안하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
