"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowLeftRight, Search, Trophy, Users, Swords, Target, TrendingUp, Shield, ChevronDown } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import RatingBadge from "@/components/RatingBadge";
import { tryRefreshTokens, clearTokens } from "@/lib/tokenRefresh";

const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

// Auth API fetch (team/page.tsx 패턴 동일)
async function authFetch(path: string, options: RequestInit = {}) {
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const buildReq = () => ({
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  let res = await fetch(`${AUTH_API}${path}`, buildReq());
  if (res.status === 401) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      res = await fetch(`${AUTH_API}${path}`, buildReq());
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("세션이 만료되었습니다.");
    }
  }
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const sportTypeLabel: Record<string, string> = {
  soccer: "축구", futsal: "풋살", basketball: "농구", baseball: "야구",
  volleyball: "배구", ice_hockey: "아이스하키",
  running: "러닝크루", snowboard: "스노보드", badminton: "배드민턴",
};

const positionColor: Record<string, string> = {
  GK: "bg-yellow-500/20 text-yellow-400",
  DF: "bg-blue-500/20 text-blue-400",
  MF: "bg-green-500/20 text-green-400",
  FW: "bg-red-500/20 text-red-400",
  C: "bg-purple-500/20 text-purple-400",
  PG: "bg-green-500/20 text-green-400",
  SG: "bg-green-500/20 text-green-400",
  SF: "bg-blue-500/20 text-blue-400",
  PF: "bg-blue-500/20 text-blue-400",
};

// 이름 기반 시드 생성 (report/page.tsx의 generateStats 패턴)
function generatePlayerStats(name: string, position: string) {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = ((seed << 5) - seed + name.charCodeAt(i)) | 0;
  const rand = (min: number, max: number) => {
    seed = (seed * 16807 + 0) % 2147483647;
    return min + Math.abs(seed) % (max - min + 1);
  };
  const base: Record<string, Record<string, [number, number]>> = {
    GK: { 스피드: [50, 70], 슈팅: [30, 50], 패스: [60, 80], 체력: [65, 80], 수비: [75, 95] },
    DF: { 스피드: [60, 80], 슈팅: [25, 50], 패스: [55, 75], 체력: [70, 85], 수비: [75, 95] },
    MF: { 스피드: [70, 88], 슈팅: [55, 80], 패스: [70, 95], 체력: [75, 90], 수비: [45, 70] },
    FW: { 스피드: [78, 95], 슈팅: [75, 95], 패스: [55, 78], 체력: [70, 88], 수비: [30, 55] },
  };
  const ranges = base[position] || base.MF;
  const stats: Record<string, number> = {};
  for (const [k, [lo, hi]] of Object.entries(ranges)) stats[k] = rand(lo, hi);
  return stats;
}

type ClubData = {
  clubId: string;
  name: string;
  sport: string;
  members: number;
  winRate: number;
  teamRating?: { tier: string; tp: number; games: number; wins: number; winStreak: number };
  areas?: { sido: string; sigungu: string }[];
  image?: string;
};

type MemberData = {
  email: string;
  name: string;
  position: string;
  role: string;
  number?: number;
  jerseyNumber?: number;
};

type MatchData = {
  matchId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  status: string;
  confirmedAt?: string;
  scheduledAt?: string;
  goals?: { scorer: string; assist?: string; minute?: number }[];
};

export default function TeamComparePage() {
  const { user, loading: authLoading } = useAuth();
  const authClubId = user?.teamId ?? user?.teamIds?.[0] ?? null;

  // 데이터 로딩 상태
  const [allClubs, setAllClubs] = useState<ClubData[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(() => !!authClubId);

  // 내 팀 데이터
  const [myClub, setMyClub] = useState<ClubData | null>(null);
  const [myMembers, setMyMembers] = useState<MemberData[]>([]);
  const [myMatches, setMyMatches] = useState<MatchData[]>([]);

  // 상대 팀 선택
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponentMembers, setOpponentMembers] = useState<MemberData[]>([]);
  const [opponentMatches, setOpponentMatches] = useState<MatchData[]>([]);

  // 선수 비교 (opponentId를 키로 사용해 자동 초기화)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [opPlayerIds, setOpPlayerIds] = useState<string | null>(null);

  // 상대팀 변경 시 선수 선택 & 이전 데이터 초기화
  const selectOpponent = (id: string | null) => {
    setOpponentId(id);
    setMyPlayerId(null);
    setOpPlayerIds(null);
    if (!id) {
      setOpponentMembers([]);
      setOpponentMatches([]);
    }
  };

  // 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 탭
  const [activeTab, setActiveTab] = useState<"team" | "player" | "h2h">("team");

  // 전체 클럽 + 내 팀 데이터 로드
  useEffect(() => {
    if (!authClubId) return;

    Promise.all([
      authFetch("/clubs"),
      authFetch(`/club-members/${authClubId}`),
      authFetch(`/matches?clubId=${authClubId}`),
    ]).then(([clubsRes, membersRes, matchesRes]) => {
      const clubs: ClubData[] = clubsRes?.clubs || [];
      setAllClubs(clubs);

      const mine = clubs.find(c => c.clubId === authClubId) || null;
      setMyClub(mine);

      const mList = membersRes?.members || [];
      setMyMembers(mList);

      const mMatches: MatchData[] = (matchesRes?.matches || []).filter(
        (m: MatchData) => m.status === "confirmed"
      );
      setMyMatches(mMatches);
    }).catch(() => {}).finally(() => setLoadingClubs(false));
  }, [authClubId]);

  // opponentClub을 state 대신 파생값으로 계산
  const opponentClub = opponentId ? (allClubs.find(c => c.clubId === opponentId) || null) : null;

  // 상대팀 선택 시 멤버/매치 데이터 로드
  useEffect(() => {
    if (!opponentId) return;

    Promise.all([
      authFetch(`/club-members/${opponentId}`),
      authFetch(`/matches?clubId=${opponentId}`),
    ]).then(([membersRes, matchesRes]) => {
      setOpponentMembers(membersRes?.members || []);
      setOpponentMatches(
        (matchesRes?.matches || []).filter((m: MatchData) => m.status === "confirmed")
      );
    }).catch(() => {
      setOpponentMembers([]);
      setOpponentMatches([]);
    });
  }, [opponentId]);

  // 내 팀 제외한 클럽 필터링
  const filteredClubs = useMemo(() => {
    return allClubs
      .filter(c => c.clubId !== authClubId)
      .filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
          (c.sport && sportTypeLabel[c.sport]?.includes(q));
      });
  }, [allClubs, authClubId, searchQuery]);

  // 팀 전적 계산 함수
  function calcRecord(matches: MatchData[], clubId: string) {
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    for (const m of matches) {
      const isHome = m.homeClubId === clubId;
      const our = isHome ? m.homeScore : m.awayScore;
      const their = isHome ? m.awayScore : m.homeScore;
      goalsFor += our || 0;
      goalsAgainst += their || 0;
      if (our > their) wins++;
      else if (our === their) draws++;
      else losses++;
    }
    const total = wins + draws + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { wins, draws, losses, total, winRate, goalsFor, goalsAgainst };
  }

  // 상대 전적 (Head-to-Head)
  const h2hMatches = useMemo(() => {
    if (!authClubId || !opponentId) return [];
    return myMatches.filter(m =>
      (m.homeClubId === authClubId && m.awayClubId === opponentId) ||
      (m.homeClubId === opponentId && m.awayClubId === authClubId)
    ).sort((a, b) => (b.confirmedAt || b.scheduledAt || "").localeCompare(a.confirmedAt || a.scheduledAt || ""));
  }, [myMatches, authClubId, opponentId]);

  const myRecord = authClubId ? calcRecord(myMatches, authClubId) : null;
  const opRecord = opponentId ? calcRecord(opponentMatches, opponentId) : null;
  const h2hRecord = authClubId ? calcRecord(h2hMatches, authClubId) : null;

  // 선수 비교 데이터
  const selectedMyPlayer = myMembers.find(m => (m.email || m.name) === myPlayerId) || null;
  const selectedOpPlayer = opponentMembers.find(m => (m.email || m.name) === opPlayerIds) || null;

  const myPlayerStats = selectedMyPlayer
    ? generatePlayerStats(selectedMyPlayer.name || selectedMyPlayer.email, selectedMyPlayer.position || "MF")
    : null;
  const opPlayerStats = selectedOpPlayer
    ? generatePlayerStats(selectedOpPlayer.name || selectedOpPlayer.email, selectedOpPlayer.position || "MF")
    : null;

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (!myPlayerStats && !opPlayerStats) return [];
    const keys = ["스피드", "슈팅", "패스", "체력", "수비"];
    return keys.map(k => ({
      stat: k,
      ...(myPlayerStats ? { 우리팀: myPlayerStats[k] } : {}),
      ...(opPlayerStats ? { 상대팀: opPlayerStats[k] } : {}),
    }));
  }, [myPlayerStats, opPlayerStats]);

  // 로딩 / 비로그인
  if (authLoading || loadingClubs) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!user || !authClubId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "var(--bg)" }}>
        <Shield size={48} style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-muted)" }}>팀에 소속되어야 비교 기능을 사용할 수 있습니다.</p>
        <Link href="/team" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--accent)", color: "#fff" }}>
          팀 페이지로 이동
        </Link>
      </div>
    );
  }

  const clubNameMap: Record<string, string> = {};
  allClubs.forEach(c => { clubNameMap[c.clubId] = c.name; });

  return (
    <div className="min-h-screen pb-32 md:pb-8" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/team" className="p-1 rounded-lg transition-colors hover:bg-white/10">
            <ArrowLeft size={20} style={{ color: "var(--text-primary)" }} />
          </Link>
          <ArrowLeftRight size={20} style={{ color: "var(--accent)" }} />
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>팀 비교</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 팀 선택 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* 내 팀 */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>우리 팀</div>
            <div className="flex items-center gap-3">
              {myClub?.image ? (
                <img src={myClub.image} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--accent)", opacity: 0.2 }}>
                  <Shield size={24} style={{ color: "var(--accent)" }} />
                </div>
              )}
              <div>
                <div className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{myClub?.name || "내 팀"}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {sportTypeLabel[myClub?.sport || ""] || myClub?.sport || ""}
                  </span>
                  {myClub?.teamRating?.tier && (
                    <RatingBadge tier={myClub.teamRating.tier} type="team" size="sm" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 font-black text-lg" style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
              VS
            </div>
          </div>

          {/* 상대 팀 선택 */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>상대 팀</div>
            {opponentClub ? (
              <div className="flex items-center gap-3">
                {opponentClub.image ? (
                  <img src={opponentClub.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/20">
                    <Shield size={24} className="text-red-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{opponentClub.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {sportTypeLabel[opponentClub.sport] || opponentClub.sport}
                    </span>
                    {opponentClub.teamRating?.tier && (
                      <RatingBadge tier={opponentClub.teamRating.tier} type="team" size="sm" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { selectOpponent(null); setSearchQuery(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5" style={{ borderColor: "var(--card-border)", background: "var(--bg)" }}>
                  <Search size={16} style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="상대 팀 이름 검색..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "var(--text-primary)" }}
                  />
                </div>
                {showDropdown && filteredClubs.length > 0 && (
                  <div
                    className="absolute z-50 top-full mt-1 left-0 right-0 border rounded-lg overflow-y-auto max-h-60"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    {filteredClubs.slice(0, 20).map(club => (
                      <button
                        key={club.clubId}
                        onClick={() => { selectOpponent(club.clubId); setShowDropdown(false); setSearchQuery(""); }}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-white/5"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                          <Shield size={14} style={{ color: "var(--text-muted)" }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{club.name}</div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {sportTypeLabel[club.sport] || club.sport} · {club.members || 0}명
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 탭 */}
        {opponentClub && (
          <>
            <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--card-bg)" }}>
              {([
                { id: "team" as const, label: "팀 스탯", icon: Trophy },
                { id: "player" as const, label: "선수 비교", icon: Users },
                { id: "h2h" as const, label: "상대 전적", icon: Swords },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "shadow-sm" : ""}`}
                  style={{
                    background: activeTab === tab.id ? "var(--accent)" : "transparent",
                    color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
                  }}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 팀 스탯 비교 */}
            {activeTab === "team" && myRecord && opRecord && (
              <div className="space-y-4">
                {/* 주요 지표 바 */}
                <div className="rounded-2xl border p-5 space-y-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>팀 성적 비교</h3>

                  <CompareBar label="승률" myVal={myRecord.winRate} opVal={opRecord.winRate} unit="%" />
                  <CompareBar label="경기 수" myVal={myRecord.total} opVal={opRecord.total} />
                  <CompareBar label="승리" myVal={myRecord.wins} opVal={opRecord.wins} />
                  <CompareBar label="무승부" myVal={myRecord.draws} opVal={opRecord.draws} />
                  <CompareBar label="패배" myVal={myRecord.losses} opVal={opRecord.losses} reverse />
                  <CompareBar label="득점" myVal={myRecord.goalsFor} opVal={opRecord.goalsFor} />
                  <CompareBar label="실점" myVal={myRecord.goalsAgainst} opVal={opRecord.goalsAgainst} reverse />
                </div>

                {/* 팀 상세 정보 카드 */}
                <div className="grid grid-cols-2 gap-4">
                  <TeamInfoCard club={myClub} record={myRecord} label="우리 팀" accent />
                  <TeamInfoCard club={opponentClub} record={opRecord} label="상대 팀" />
                </div>
              </div>
            )}

            {/* 선수 비교 */}
            {activeTab === "player" && (
              <div className="space-y-4">
                {/* 선수 선택 */}
                <div className="grid grid-cols-2 gap-4">
                  <PlayerSelect
                    label="우리 팀 선수"
                    members={myMembers}
                    selectedId={myPlayerId}
                    onSelect={setMyPlayerId}
                  />
                  <PlayerSelect
                    label="상대 팀 선수"
                    members={opponentMembers}
                    selectedId={opPlayerIds}
                    onSelect={setOpPlayerIds}
                  />
                </div>

                {/* 레이더 차트 비교 */}
                {(selectedMyPlayer || selectedOpPlayer) && radarData.length > 0 && (
                  <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>능력치 비교</h3>
                    <div className="flex justify-center gap-6 mb-2">
                      {selectedMyPlayer && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span style={{ color: "var(--text-muted)" }}>{selectedMyPlayer.name}</span>
                        </div>
                      )}
                      {selectedOpPlayer && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span style={{ color: "var(--text-muted)" }}>{selectedOpPlayer.name}</span>
                        </div>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                        {selectedMyPlayer && (
                          <Radar name="우리팀" dataKey="우리팀" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        )}
                        {selectedOpPlayer && (
                          <Radar name="상대팀" dataKey="상대팀" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                        )}
                      </RadarChart>
                    </ResponsiveContainer>

                    {/* 스탯 수치 비교 */}
                    {myPlayerStats && opPlayerStats && (
                      <div className="mt-4 space-y-3">
                        {Object.keys(myPlayerStats).map(key => (
                          <CompareBar
                            key={key}
                            label={key}
                            myVal={myPlayerStats[key]}
                            opVal={opPlayerStats[key]}
                            max={100}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 선수 포지션 분포 */}
                <div className="grid grid-cols-2 gap-4">
                  <PositionDistribution members={myMembers} label="우리 팀" />
                  <PositionDistribution members={opponentMembers} label="상대 팀" />
                </div>
              </div>
            )}

            {/* 상대 전적 */}
            {activeTab === "h2h" && (
              <div className="space-y-4">
                {/* H2H 요약 */}
                {h2hRecord && h2hMatches.length > 0 && (
                  <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>상대 전적 요약</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-black text-blue-400">{h2hRecord.wins}</div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>승</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black" style={{ color: "var(--text-muted)" }}>{h2hRecord.draws}</div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>무</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-red-400">{h2hRecord.losses}</div>
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>패</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>득점 {h2hRecord.goalsFor}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: h2hRecord.goalsFor + h2hRecord.goalsAgainst > 0
                              ? `${(h2hRecord.goalsFor / (h2hRecord.goalsFor + h2hRecord.goalsAgainst)) * 100}%`
                              : "50%"
                          }}
                        />
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{h2hRecord.goalsAgainst} 실점</div>
                    </div>
                  </div>
                )}

                {/* H2H 경기 목록 */}
                {h2hMatches.length > 0 ? (
                  <div className="space-y-3">
                    {h2hMatches.map((match, idx) => {
                      const isHome = match.homeClubId === authClubId;
                      const ourScore = isHome ? match.homeScore : match.awayScore;
                      const theirScore = isHome ? match.awayScore : match.homeScore;
                      const result = ourScore > theirScore ? "win" : ourScore < theirScore ? "loss" : "draw";
                      const resultLabel = result === "win" ? "승" : result === "loss" ? "패" : "무";
                      const resultColor = result === "win" ? "text-blue-400" : result === "loss" ? "text-red-400" : "text-gray-400";
                      const date = match.confirmedAt || match.scheduledAt || "";

                      return (
                        <div key={match.matchId || idx} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                          <div className={`text-lg font-black ${resultColor}`}>{resultLabel}</div>
                          <div className="flex-1">
                            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {ourScore} : {theirScore}
                            </div>
                            {date && (
                              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {new Date(date).toLocaleDateString("ko-KR")}
                              </div>
                            )}
                          </div>
                          {match.goals && match.goals.length > 0 && (
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              <Target size={12} className="inline mr-1" />
                              {match.goals.length}골
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                    <Swords size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {opponentClub?.name}과(와)의 경기 기록이 없습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 상대팀 미선택 시 안내 */}
        {!opponentClub && (
          <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <ArrowLeftRight size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>상대 팀을 선택하세요</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>팀 스탯, 선수 능력치, 상대 전적을 비교할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 하위 컴포넌트 ───────────────────────────────────

function CompareBar({ label, myVal, opVal, unit = "", max, reverse = false }: {
  label: string;
  myVal: number;
  opVal: number;
  unit?: string;
  max?: number;
  reverse?: boolean;
}) {
  const effectiveMax = max || Math.max(myVal, opVal, 1);
  const myPct = (myVal / effectiveMax) * 100;
  const opPct = (opVal / effectiveMax) * 100;

  // reverse: 낮을수록 좋은 지표 (패배, 실점)
  const myWins = reverse ? myVal < opVal : myVal > opVal;
  const opWins = reverse ? opVal < myVal : opVal > myVal;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs" style={{ color: "var(--text-muted)" }}>
        <span className={`font-bold ${myWins ? "text-blue-400" : ""}`}>{myVal}{unit}</span>
        <span className="font-medium">{label}</span>
        <span className={`font-bold ${opWins ? "text-red-400" : ""}`}>{opVal}{unit}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 flex justify-end rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
          <div
            className={`h-full rounded-full transition-all ${myWins ? "bg-blue-500" : "bg-blue-500/40"}`}
            style={{ width: `${myPct}%` }}
          />
        </div>
        <div className="flex-1 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
          <div
            className={`h-full rounded-full transition-all ${opWins ? "bg-red-500" : "bg-red-500/40"}`}
            style={{ width: `${opPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TeamInfoCard({ club, record, label, accent = false }: {
  club: ClubData | null;
  record: { wins: number; draws: number; losses: number; total: number; winRate: number; goalsFor: number; goalsAgainst: number } | null;
  label: string;
  accent?: boolean;
}) {
  if (!club || !record) return null;
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--card-bg)", borderColor: accent ? "var(--accent)" : "var(--card-border)" }}>
      <div className="text-xs font-medium" style={{ color: accent ? "var(--accent)" : "var(--text-muted)" }}>{label}</div>
      <div className="space-y-2">
        <StatRow icon={<Trophy size={13} />} label="전적" value={`${record.wins}승 ${record.draws}무 ${record.losses}패`} />
        <StatRow icon={<TrendingUp size={13} />} label="승률" value={`${record.winRate}%`} />
        <StatRow icon={<Target size={13} />} label="득실" value={`${record.goalsFor} / ${record.goalsAgainst}`} />
        <StatRow icon={<Users size={13} />} label="멤버" value={`${club.members || 0}명`} />
        {club.teamRating?.tp !== undefined && (
          <StatRow icon={<TrendingUp size={13} />} label="포인트" value={`${club.teamRating.tp}TP`} />
        )}
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="ml-auto font-semibold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function PlayerSelect({ label, members, selectedId, onSelect }: {
  label: string;
  members: MemberData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = members.find(m => (m.email || m.name) === selectedId) || null;

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
        >
          <span>{selected ? `${selected.name} (${selected.position || "—"})` : "선수 선택..."}</span>
          <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
        </button>
        {open && (
          <div
            className="absolute z-50 top-full mt-1 left-0 right-0 border rounded-lg overflow-y-auto max-h-48"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            {members.map((m, i) => (
              <button
                key={m.email || m.name || i}
                onClick={() => { onSelect(m.email || m.name); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left flex items-center gap-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: "var(--text-primary)" }}
              >
                {m.position && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${positionColor[m.position] || "bg-gray-500/20 text-gray-400"}`}>
                    {m.position}
                  </span>
                )}
                <span>{m.name || m.email}</span>
                {(m.number || m.jerseyNumber) && (
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>#{m.number || m.jerseyNumber}</span>
                )}
              </button>
            ))}
            {members.length === 0 && (
              <div className="px-3 py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>멤버 없음</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PositionDistribution({ members, label }: { members: MemberData[]; label: string }) {
  const counts: Record<string, number> = {};
  members.forEach(m => {
    const pos = m.position || "기타";
    counts[pos] = (counts[pos] || 0) + 1;
  });
  const total = members.length || 1;
  const positions = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>{label} 포지션 분포</div>
      <div className="space-y-2">
        {positions.map(([pos, count]) => (
          <div key={pos} className="flex items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${positionColor[pos] || "bg-gray-500/20 text-gray-400"}`}>
              {pos}
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
              <div className="h-full rounded-full bg-white/20" style={{ width: `${(count / total) * 100}%` }} />
            </div>
            <span style={{ color: "var(--text-muted)" }}>{count}명</span>
          </div>
        ))}
      </div>
    </div>
  );
}
