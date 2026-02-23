"use client";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Shield, Trophy, Crosshair, Pencil, X, User, Mail, Calendar, Activity, Globe, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { regionData } from "@/app/signup/regions";
import RatingBadge from "@/components/RatingBadge";

const API = process.env.NEXT_PUBLIC_API_URL;
const allSports = ["축구", "풋살", "농구", "야구", "배구", "배드민턴", "아이스하키", "스노보드", "러닝크루", "기타"];

export default function MyPage() {
  const { user, loading, refresh } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ sport: "", teamId: "" as string | null, position: "" });
  const [teamClubs, setTeamClubs] = useState<any[]>([]);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 개인정보 편집
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: "", gender: "", birthdate: "",
    regionSido: "", regionSigungu: "",
    activeAreas: [{ sido: "", sigungu: "" }, { sido: "", sigungu: "" }, { sido: "", sigungu: "" }],
    sports: [] as string[],
  });

  // 활동 가능 지역 편집
  const [areaEditing, setAreaEditing] = useState(false);
  const [areaDraft, setAreaDraft] = useState([{ sido: "", sigungu: "" }, { sido: "", sigungu: "" }, { sido: "", sigungu: "" }]);
  const [areaSaving, setAreaSaving] = useState(false);

  // 관심 스포츠 편집
  const [sportsEditing, setSportsEditing] = useState(false);
  const [sportsDraft, setSportsDraft] = useState<string[]>([]);
  const [sportsSaving, setSportsSaving] = useState(false);

  function Dropdown({ value, placeholder, items, onChange, disabled }: { value: string; placeholder: string; items: string[]; onChange: (v: string) => void; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
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

  useEffect(() => {
    const ids = user?.teamIds || (user?.teamId ? [user.teamId] : []);
    if (ids.length === 0) { setClub(null); setMyClubs([]); return; }
    fetch(`${API}/clubs`)
      .then(r => r.json())
      .then(d => {
        const allClubs = d.clubs || [];
        const matched = allClubs.filter((c: any) => ids.includes(c.clubId));
        setMyClubs(matched);
        const found = allClubs.find((c: any) => c.clubId === user?.teamId);
        setClub(found || matched[0] || null);
      })
      .catch(() => {});
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("accessToken");
      // 1. presigned URL 받기
      const urlRes = await fetch(`${API}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "avatars", fileName: file.name, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("업로드 URL 생성 실패");
      const { uploadUrl, publicUrl } = await urlRes.json();
      // 2. S3에 업로드
      const upRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upRes.ok) throw new Error("이미지 업로드 실패");
      // 3. DB에 avatar URL 저장
      const saveRes = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: publicUrl }),
      });
      if (!saveRes.ok) throw new Error("프로필 저장 실패");
      await refresh();
    } catch (err: any) {
      alert(err.message || "프로필 사진 변경에 실패했습니다");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openProfileEdit() {
    if (!user) return;
    const areas = user.activeAreas && user.activeAreas.length > 0
      ? [...user.activeAreas, ...Array(3)].slice(0, 3).map((a: any) => ({ sido: a?.sido || "", sigungu: a?.sigungu || "" }))
      : [{ sido: "", sigungu: "" }, { sido: "", sigungu: "" }, { sido: "", sigungu: "" }];
    setProfileDraft({
      name: user.name || "",
      gender: user.gender || "",
      birthdate: user.birthdate || "",
      regionSido: user.regionSido || "",
      regionSigungu: user.regionSigungu || "",
      activeAreas: areas,
      sports: user.sports || [],
    });
    setProfileEditing(true);
  }

  async function saveProfile() {
    setProfileSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const r = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profileDraft.name,
          gender: profileDraft.gender,
          birthdate: profileDraft.birthdate,
          regionSido: profileDraft.regionSido,
          regionSigungu: profileDraft.regionSigungu,
        }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.message || `프로필 저장 실패 (${r.status})`);
      }
      await refresh();
      setProfileEditing(false);
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다");
    } finally {
      setProfileSaving(false);
    }
  }

  function openAreaEdit() {
    if (!user) return;
    const areas = user.activeAreas && user.activeAreas.length > 0
      ? [...user.activeAreas, ...Array(3)].slice(0, 3).map((a: any) => ({ sido: a?.sido || "", sigungu: a?.sigungu || "" }))
      : [{ sido: "", sigungu: "" }, { sido: "", sigungu: "" }, { sido: "", sigungu: "" }];
    setAreaDraft(areas);
    setAreaEditing(true);
  }

  async function saveAreas() {
    setAreaSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const r = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activeAreas: areaDraft.filter(a => a.sido) }),
      });
      if (!r.ok) throw new Error("저장 실패");
      await refresh();
      setAreaEditing(false);
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다");
    } finally {
      setAreaSaving(false);
    }
  }

  function openSportsEdit() {
    if (!user) return;
    setSportsDraft(user.sports || []);
    setSportsEditing(true);
  }

  async function saveSports() {
    setSportsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const r = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sports: sportsDraft }),
      });
      if (!r.ok) throw new Error("저장 실패");
      await refresh();
      setSportsEditing(false);
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다");
    } finally {
      setSportsSaving(false);
    }
  }

  // 소속 편집 시 종목별 클럽 불러오기
  useEffect(() => {
    if (!teamDraft.sport) { setTeamClubs([]); return; }
    fetch(`${API}/clubs?sport=${encodeURIComponent(teamDraft.sport)}`)
      .then(r => r.json())
      .then(d => setTeamClubs(d.clubs || []))
      .catch(() => setTeamClubs([]));
  }, [teamDraft.sport]);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  function openTeamEdit() {
    // 팀이 여러개면 먼저 선택 화면, 하나면 바로 편집
    const ids = user?.teamIds || (user?.teamId ? [user.teamId] : []);
    if (ids.length === 0) {
      // 소속 없으면 새 팀 가입 모드
      setEditingTeamId(null);
      setTeamDraft({ sport: "", teamId: null, position: "" });
    } else {
      setEditingTeamId("__select__");
    }
    setLeaveConfirm(false);
    setEditing(true);
  }

  function selectTeamForEdit(clubId: string) {
    const c = myClubs.find((cl: any) => cl.clubId === clubId);
    setEditingTeamId(clubId);
    setTeamDraft({
      sport: c?.sport || user?.teamSport || "",
      teamId: clubId,
      position: user?.position || "",
    });
    setLeaveConfirm(false);
  }

  function startNewTeamJoin() {
    setEditingTeamId(null);
    setTeamDraft({ sport: "", teamId: null, position: "" });
    setLeaveConfirm(false);
    setEditing(true);
  }

  async function saveTeam() {
    setTeamSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const existingTeamIds = user?.teamIds || (user?.teamId ? [user.teamId] : []);
      const newTeamIds = teamDraft.teamId && !existingTeamIds.includes(teamDraft.teamId)
        ? [...existingTeamIds, teamDraft.teamId]
        : existingTeamIds;
      const r = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hasTeam: newTeamIds.length > 0,
          teamSport: teamDraft.sport,
          teamId: teamDraft.teamId,
          teamIds: newTeamIds,
          position: teamDraft.position,
        }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.message || `프로필 저장 실패 (${r.status})`);
      }
      // 클럽 멤버 등록
      if (teamDraft.teamId && user) {
        const mr = await fetch(`${API}/club-members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clubId: teamDraft.teamId,
            email: user.email,
            name: user.name,
            position: teamDraft.position,
          }),
        });
        if (!mr.ok) {
          const errData = await mr.json().catch(() => ({}));
          throw new Error(errData.message || `멤버 등록 실패 (${mr.status})`);
        }
      }
      // 팀 엠블럼 즉시 반영
      if (teamDraft.teamId) {
        const found = teamClubs.find((c: any) => c.clubId === teamDraft.teamId);
        setClub(found || null);
      } else {
        setClub(null);
      }
      await refresh();
      setEditing(false);
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다");
    } finally {
      setTeamSaving(false);
    }
  }

  async function leaveTeam() {
    if (!editingTeamId) return;
    setTeamSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const existingTeamIds = user?.teamIds || (user?.teamId ? [user.teamId] : []);
      const newTeamIds = existingTeamIds.filter((id: string) => id !== editingTeamId);
      await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hasTeam: newTeamIds.length > 0, teamSport: newTeamIds.length > 0 ? user?.teamSport : "", teamId: newTeamIds[0] || null, teamIds: newTeamIds, position: newTeamIds.length > 0 ? user?.position : "" }),
      });
      // 클럽 멤버에서도 삭제
      await fetch(`${API}/club-members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: editingTeamId, email: user?.email }),
      }).catch(() => {});
      await refresh();
      setEditing(false);
    } catch {
      alert("탈퇴에 실패했습니다");
    } finally {
      setTeamSaving(false);
    }
  }

  function closeTeamEdit() { setEditing(false); setLeaveConfirm(false); }

  const record = user?.record || { games: 0, goals: 0, assists: 0 };
  const recentGoals = user?.recentGoals || [];
  const region = [user?.regionSido, user?.regionSigungu].filter(Boolean).join(" ") || "";

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center">
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
        <p className="text-gray-400 text-sm">로그인이 필요합니다</p>
        <Link href="/login" className="inline-block px-6 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="relative bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center gap-4 overflow-hidden min-h-[280px] justify-center">
        {club?.image && (
          <Image src={club.image} alt="emblem" fill className="object-cover opacity-10 scale-125" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="relative w-24 h-24 rounded-full overflow-hidden shrink-0 border-2 border-fuchsia-500/40 bg-white/5 flex items-center justify-center cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}>
            {avatarUploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-fuchsia-400 border-t-transparent rounded-full" />
            ) : user.avatar ? (
              <Image src={user.avatar} alt={user.name} fill className="object-cover" />
            ) : (
              <User size={40} className="text-gray-600" />
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-white text-2xl font-bold">{user.name}</p>
            {user.position && (
              <span className="text-xs px-2 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400 font-semibold">{user.position}</span>
            )}
            {club ? (
              <Link href="/team" className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1 hover:text-fuchsia-400 transition-colors">
                <Shield size={11} className="text-fuchsia-400" />
                {club.name}
              </Link>
            ) : (
              <p className="text-xs text-gray-600 mt-1">소속팀 없음</p>
            )}
            {region ? (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <MapPin size={11} className="text-gray-500" />
                {region}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                <MapPin size={11} className="text-gray-600" />
                지역 미설정
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 개인 정보 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={14} className="text-fuchsia-400" />
            <span className="text-sm font-semibold text-gray-300">개인 정보</span>
          </div>
          <button onClick={openProfileEdit} className="text-gray-500 hover:text-white transition-colors">
            <Pencil size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Mail size={12} className="text-gray-500" />, label: "이메일", value: user.email || "-" },
            { icon: <Calendar size={12} className="text-gray-500" />, label: "생년월일", value: user.birthdate || "-" },
            { icon: <User size={12} className="text-gray-500" />, label: "성별", value: user.gender === "male" ? "남성" : user.gender === "female" ? "여성" : user.gender || "-" },
            { icon: <MapPin size={12} className="text-gray-500" />, label: "거주지", value: region || "-" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white/5 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1 mb-1">{icon}<p className="text-gray-500 text-xs">{label}</p></div>
              <p className="text-white text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 활동 가능 지역 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-fuchsia-400" />
            <span className="text-sm font-semibold text-gray-300">활동 가능 지역</span>
          </div>
          <button onClick={openAreaEdit} className="text-gray-500 hover:text-white transition-colors"><Pencil size={14} /></button>
        </div>
        {user.activeAreas && user.activeAreas.filter((a: any) => a.sido).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.activeAreas.filter((a: any) => a.sido).map((a: any, i: number) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                {[a.sido, a.sigungu].filter(Boolean).join(" ")}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">아직 설정되지 않았습니다</p>
        )}
      </div>

      {/* 관심 스포츠 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-fuchsia-400" />
            <span className="text-sm font-semibold text-gray-300">관심 스포츠</span>
          </div>
          <button onClick={openSportsEdit} className="text-gray-500 hover:text-white transition-colors"><Pencil size={14} /></button>
        </div>
        {user.sports && user.sports.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.sports.map((s: string) => (
              <span key={s} className="text-xs px-3 py-1.5 rounded-full font-medium text-fuchsia-300" style={{ background: "linear-gradient(to right, rgba(192,38,211,0.15), rgba(124,58,237,0.15))" }}>
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">아직 설정되지 않았습니다</p>
        )}
      </div>

      {/* 개인 등급 */}
      {(user as any).ratings && Object.keys((user as any).ratings).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={14} className="text-fuchsia-400" />
            <span className="text-sm font-semibold text-gray-300">개인 등급</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries((user as any).ratings as Record<string, any>).map(([sport, data]: [string, any]) => (
              <div key={sport} className="bg-white/5 rounded-lg px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{sport}</span>
                  <RatingBadge tier={data.tier || "B"} type="player" size="sm" />
                </div>
                <p className="text-gray-500 text-xs">{data.points || 0}pt · {data.games || 0}경기 · {data.wins || 0}승</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 활동 기록 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-fuchsia-400" />
          <span className="text-sm font-semibold text-gray-300">활동 기록</span>
        </div>
        <p className="text-white text-sm">
          {record.games || record.goals || record.assists
            ? `${record.games}경기 · ${record.goals}골 · ${record.assists}도움`
            : "아직 기록이 없습니다"}
        </p>
      </div>

      {/* 소속 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-fuchsia-400" />
            <span className="text-sm font-semibold text-gray-300">소속</span>
          </div>
          <button onClick={startNewTeamJoin} className="text-xs px-2.5 py-1 rounded-full text-fuchsia-400 hover:bg-fuchsia-500/10 transition-colors" style={{ border: "1px solid rgba(192,38,211,0.3)" }}>
            + 새 팀
          </button>
        </div>
        {myClubs.length > 0 ? myClubs.map((c: any) => (
          <div key={c.clubId} className="bg-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {c.image && <img src={c.image} alt={c.name} className="w-6 h-6 rounded-full object-cover" />}
                <span className="text-white text-sm font-semibold">{c.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400">{c.sport}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>포지션: {user.position || "-"}</span>
                <span>멤버 {c.members}명</span>
                <span>승률 {c.winRate}%</span>
              </div>
            </div>
            <button onClick={() => { selectTeamForEdit(c.clubId); setEditing(true); }} className="text-gray-500 hover:text-white transition-colors">
              <Pencil size={14} />
            </button>
          </div>
        )) : (
          <p className="text-xs text-gray-500">소속팀이 없습니다</p>
        )}
      </div>

      {/* 소속 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={closeTeamEdit}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">
                {editingTeamId ? "소속 편집" : "새 팀 가입"}
              </span>
              <button onClick={closeTeamEdit} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            {/* 편집/가입 화면 */}
            {editingTeamId && (
              <button type="button" onClick={() => { setEditingTeamId(null); setTeamDraft({ sport: "", teamId: null, position: "" }); }} className="text-xs text-gray-500 hover:text-white">← 새 팀 가입으로 전환</button>
            )}

            {/* 기존 팀 편집: 팀 정보 표시 */}
            {editingTeamId && (() => {
              const c = myClubs.find((cl: any) => cl.clubId === editingTeamId);
              return c ? (
                <div className="bg-white/5 rounded-lg px-4 py-3 flex items-center gap-3">
                  {c.image && <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full object-cover" />}
                  <div>
                    <span className="text-white text-sm font-semibold">{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400 ml-2">{c.sport}</span>
                  </div>
                </div>
              ) : null;
            })()}

            {/* 새 팀 가입: 종목 선택 */}
            {!editingTeamId && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">종목 선택</label>
              <div className="flex flex-wrap gap-2">
                {allSports.map(s => (
                  <button key={s} type="button"
                    onClick={() => setTeamDraft(p => ({ ...p, sport: s, teamId: null, position: "" }))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={teamDraft.sport === s
                      ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                      : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* 새 팀 가입: 팀 선택 */}
            {!editingTeamId && teamDraft.sport && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400">소속 팀 선택 {teamClubs.length > 0 && `(${teamClubs.length}개)`}</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {teamClubs.map((c: any) => (
                    <button key={c.clubId} type="button"
                      onClick={() => setTeamDraft(p => ({ ...p, teamId: c.clubId }))}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
                      style={teamDraft.teamId === c.clubId
                        ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white", borderRadius: "12px" }
                        : { background: "var(--chip-inactive-bg)", border: "1px solid var(--chip-inactive-border)" }}>
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs opacity-60">{c.areas?.[0]?.sido} {c.areas?.[0]?.sigungu}</span>
                    </button>
                  ))}
                  {teamClubs.length === 0 && <p className="text-xs text-gray-600 text-center py-2">해당 종목 클럽이 없습니다</p>}
                </div>
              </div>
            )}

            {/* 포지션 선택 */}
            {teamDraft.teamId && (() => {
              const selectedClub = myClubs.find((c: any) => c.clubId === teamDraft.teamId) || teamClubs.find((c: any) => c.clubId === teamDraft.teamId);
              const sport = selectedClub?.sport || teamDraft.sport;
              const positionsBySport: Record<string, string[]> = {
                "축구": ["GK", "DF", "MF", "FW"],
                "풋살": ["GK", "DF", "MF", "FW"],
                "농구": ["PG", "SG", "SF", "PF", "C"],
                "야구": ["투수", "포수", "내야수", "외야수"],
                "배구": ["세터", "리베로", "공격수"],
                "아이스하키": ["GK", "DF", "FW"],
                "배드민턴": ["단식", "복식"],
                "스노보드": ["프리스타일", "알파인", "보더크로스"],
                "러닝크루": ["페이스메이커", "러너"],
              };
              const positions = [...(positionsBySport[sport] || []), "기타"];
              return (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">포지션</label>
                  <div className="flex flex-wrap gap-2">
                    {positions.map(p => (
                      <button key={p} type="button"
                        onClick={() => setTeamDraft(prev => ({ ...prev, position: p }))}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={teamDraft.position === p
                          ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                          : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button onClick={saveTeam} disabled={teamSaving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              {teamSaving ? "저장 중..." : "저장"}
            </button>

            {editingTeamId && (
              !leaveConfirm
                ? <button onClick={() => setLeaveConfirm(true)} className="w-full py-2 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">팀 탈퇴</button>
                : <div className="space-y-2">
                    <p className="text-xs text-gray-400 text-center">정말 탈퇴하시겠어요?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setLeaveConfirm(false)} className="flex-1 py-2 rounded-lg text-sm bg-white/5 text-gray-400">취소</button>
                      <button onClick={leaveTeam} disabled={teamSaving} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white disabled:opacity-50">탈퇴</button>
                    </div>
                  </div>
            )}
          </div>
        </div>
      )}

      {/* 개인정보 편집 모달 */}
      {profileEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setProfileEditing(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">개인정보 수정</span>
              <button onClick={() => setProfileEditing(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            {/* 이름 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">이름</label>
              <input type="text" value={profileDraft.name}
                onChange={e => setProfileDraft(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50" />
            </div>

            {/* 성별 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">성별</label>
              <div className="flex gap-2">
                {[{ label: "남성", val: "male" }, { label: "여성", val: "female" }].map(({ label, val }) => (
                  <button key={val} type="button" onClick={() => setProfileDraft(p => ({ ...p, gender: val }))}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={profileDraft.gender === val
                      ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                      : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 생년월일 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">생년월일</label>
              <input type="date" value={profileDraft.birthdate}
                onChange={e => setProfileDraft(p => ({ ...p, birthdate: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-fuchsia-500/50"
                style={{ colorScheme: "dark" }} />
            </div>

            {/* 거주지 */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400">거주지</label>
              <div className="flex gap-2">
                <Dropdown value={profileDraft.regionSido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => setProfileDraft(p => ({ ...p, regionSido: v, regionSigungu: "" }))} />
                <Dropdown value={profileDraft.regionSigungu} placeholder="시/군/구" items={profileDraft.regionSido ? ["전체", ...(regionData[profileDraft.regionSido] || [])] : []} onChange={(v) => setProfileDraft(p => ({ ...p, regionSigungu: v }))} disabled={!profileDraft.regionSido} />
              </div>
            </div>

            <button onClick={saveProfile} disabled={profileSaving}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }}>
              {profileSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 활동 가능 지역 편집 모달 */}
      {areaEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setAreaEditing(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">활동 가능 지역 수정</span>
              <button onClick={() => setAreaEditing(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-2">
              {areaDraft.map((area, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}</span>
                  <Dropdown value={area.sido} placeholder="시/도" items={Object.keys(regionData)} onChange={(v) => {
                    const next = [...areaDraft];
                    next[i] = { sido: v, sigungu: "" };
                    setAreaDraft(next);
                  }} />
                  <Dropdown value={area.sigungu} placeholder="시/군/구"
                    items={area.sido ? ["전체", ...(regionData[area.sido] || [])] : []}
                    onChange={(v) => {
                      const next = [...areaDraft];
                      next[i] = { ...next[i], sigungu: v };
                      setAreaDraft(next);
                    }} disabled={!area.sido} />
                </div>
              ))}
            </div>
            <button onClick={saveAreas} disabled={areaSaving}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }}>
              {areaSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 관심 스포츠 편집 모달 */}
      {sportsEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "var(--modal-overlay)" }} onClick={() => setSportsEditing(false)}>
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold">관심 스포츠 수정</span>
              <button onClick={() => setSportsEditing(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSports.map(s => (
                <button key={s} type="button"
                  onClick={() => setSportsDraft(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={sportsDraft.includes(s)
                    ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                    : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={saveSports} disabled={sportsSaving}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }}>
              {sportsSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 최근 골 기록 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Crosshair size={14} className="text-fuchsia-400" />
          <span className="text-sm font-semibold text-gray-300">최근 골 기록</span>
        </div>
        {recentGoals.length > 0 ? (
          recentGoals.map((g: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
              <span className="text-gray-500 text-xs w-24">{g.date}</span>
              <span className="text-white text-sm flex-1">{g.opponent}</span>
              <span className="text-gray-400 text-xs w-12 text-center">{g.minute}&apos;</span>
              <span className="text-fuchsia-400 text-sm font-bold w-12 text-right">{g.score}</span>
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-sm text-center py-2">아직 골 기록이 없습니다</p>
        )}
      </div>
    </div>
  );
}
