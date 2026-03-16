"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTeam } from "@/context/TeamContext";
import { manageFetch } from "@/lib/manageFetch";
import { MatchDetailModal } from "@/components/MatchDetailModal";

const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

export default function MatchRecordsPage() {
  const { user } = useAuth();
  const { currentTeam, isLeader } = useTeam();
  const authClubId = user?.teamId ?? user?.teamIds?.[0] ?? null;

  const [authMatches, setAuthMatches] = useState<any[]>([]);
  const [manageMatches, setManageMatches] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [filterResult, setFilterResult] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [matchDetail, setMatchDetail] = useState<any>(null);

  // Auth API 매치 로드
  useEffect(() => {
    if (!authClubId) return;
    fetch(`${AUTH_API}/matches?clubId=${authClubId}`)
      .then(r => r.json())
      .then(d => setAuthMatches((d.matches || []).filter((m: any) => m.status === "confirmed")))
      .catch(() => {});
    fetch(`${AUTH_API}/clubs`)
      .then(r => r.json())
      .then(d => setAllClubs(d.clubs || []))
      .catch(() => {});
  }, [authClubId]);

  // Manage API 매치 로드
  useEffect(() => {
    if (!currentTeam?.id) return;
    manageFetch(`/schedule/matches?teamId=${currentTeam.id}`)
      .then(data => {
        if (Array.isArray(data)) {
          setManageMatches(data.filter((m: any) => m.status === "completed"));
        }
      })
      .catch(() => {});
  }, [currentTeam?.id]);

  // 멤버 로드 (모달용)
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    if (!currentTeam?.id) return;
    fetch(`${AUTH_API}/club-members/${currentTeam.id}`)
      .then(r => r.json())
      .then(data => setMembers(data.members || data || []))
      .catch(() => {});
  }, [currentTeam?.id]);

  const memberNames: Record<string, string> = {};
  members.forEach((mb: any) => { if (mb.email || mb.userId) memberNames[mb.email || mb.userId] = mb.name || mb.email?.split('@')[0] || mb.userId; });

  const clubNameMap: Record<string, string> = {};
  allClubs.forEach((c: any) => { clubNameMap[c.clubId] = c.name; });

  // 모든 경기 합산
  const manageConfirmed = manageMatches.map((m: any) => ({
    ...m,
    matchId: m.id,
    status: "confirmed",
    confirmedAt: m.updatedAt || m.createdAt || "",
    homeScore: m.ourScore,
    awayScore: m.theirScore,
    homeClubId: authClubId,
    _fromManage: true,
  }));

  let allMatches = [...authMatches, ...manageConfirmed];

  // 필터링
  if (filterResult !== "all") {
    allMatches = allMatches.filter((m: any) => {
      const isHome = m.homeClubId === authClubId;
      const ourScore = m._fromManage ? m.ourScore : (isHome ? m.homeScore : m.awayScore);
      const theirScore = m._fromManage ? m.theirScore : (isHome ? m.awayScore : m.homeScore);
      const result = m._fromManage ? m.result : (ourScore > theirScore ? "win" : ourScore < theirScore ? "loss" : "draw");
      return result === filterResult;
    });
  }

  // 정렬
  allMatches.sort((a: any, b: any) => {
    if (sortBy === "latest") return (b.confirmedAt || "").localeCompare(a.confirmedAt || "");
    if (sortBy === "oldest") return (a.confirmedAt || "").localeCompare(b.confirmedAt || "");
    return 0;
  });

  // 통계 계산
  const allForStats = [...authMatches, ...manageConfirmed];
  const totalWins = allForStats.filter((m: any) => {
    const isHome = m.homeClubId === authClubId;
    if (m._fromManage) return m.result === "win";
    const ourScore = isHome ? m.homeScore : m.awayScore;
    const theirScore = isHome ? m.awayScore : m.homeScore;
    return ourScore > theirScore;
  }).length;
  const totalDraws = allForStats.filter((m: any) => {
    const isHome = m.homeClubId === authClubId;
    if (m._fromManage) return m.result === "draw";
    const ourScore = isHome ? m.homeScore : m.awayScore;
    const theirScore = isHome ? m.awayScore : m.homeScore;
    return ourScore === theirScore;
  }).length;
  const totalLosses = allForStats.length - totalWins - totalDraws;
  const totalGames = allForStats.length;
  const winRate = totalGames > 0 ? Math.round(totalWins / totalGames * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/team" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} style={{ color: "var(--text-primary)" }} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>경기 기록</h1>
          <p className="text-sm text-gray-500">{currentTeam?.name || "내 팀"} · 총 {totalGames}경기</p>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalGames}</p>
          <p className="text-xs text-gray-500 mt-1">총 경기</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalWins}</p>
          <p className="text-xs text-gray-500 mt-1">승리</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{totalDraws}</p>
          <p className="text-xs text-gray-500 mt-1">무승부</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalLosses}</p>
          <p className="text-xs text-gray-500 mt-1">패배</p>
        </div>
      </div>

      {/* 승률 */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">승률</span>
          <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{winRate}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
          {totalGames > 0 && (
            <>
              <div className="h-full bg-green-500" style={{ width: `${(totalWins / totalGames) * 100}%` }} />
              <div className="h-full bg-gray-500" style={{ width: `${(totalDraws / totalGames) * 100}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${(totalLosses / totalGames) * 100}%` }} />
            </>
          )}
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: "all", label: "전체" },
            { key: "win", label: "승리" },
            { key: "draw", label: "무승부" },
            { key: "loss", label: "패배" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterResult(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={filterResult === key
                ? { background: "rgba(255,255,255,0.15)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.2)" }
                : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[
            { key: "latest", label: "최신순" },
            { key: "oldest", label: "오래된순" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={sortBy === key
                ? { background: "rgba(255,255,255,0.15)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.2)" }
                : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 경기 목록 */}
      <div className="space-y-3">
        {allMatches.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
            <Swords size={32} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-sm">경기 기록이 없습니다</p>
          </div>
        ) : (
          allMatches.map((m: any) => {
            const isHome = m.homeClubId === authClubId;
            const opponentName = m._fromManage
              ? (m.awayTeamName || m.awayTeamId || "상대팀")
              : (clubNameMap?.[isHome ? m.awayClubId : m.homeClubId] || "상대팀");
            const ourScore = m._fromManage ? m.ourScore : (isHome ? m.homeScore : m.awayScore);
            const theirScore = m._fromManage ? m.theirScore : (isHome ? m.awayScore : m.homeScore);
            const result = m._fromManage
              ? (m.result === "win" ? "승" : m.result === "loss" ? "패" : "무")
              : (ourScore > theirScore ? "승" : ourScore < theirScore ? "패" : "무");
            const resultColor = result === "승" ? "text-green-400" : result === "패" ? "text-red-400" : "text-gray-400";
            const resultBg = result === "승" ? "bg-green-500/5 border-green-500/20" : result === "패" ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10";
            const myGoals = m._fromManage ? (m.scorers || []) : (m.goals || []).filter((g: any) => g.club === authClubId);
            const matchDate = m._fromManage
              ? (m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : m.confirmedAt?.slice(0, 10) || "")
              : (m.confirmedAt?.slice(0, 10) || "");
            const venue = m._fromManage ? (m.venue || "") : "";
            const matchType = m._fromManage ? (m.type || "") : "";
            const matchCards: any[] = m.cards || [];

            return (
              <div key={m.matchId ?? m.id} className={`border rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${resultBg}`} onClick={() => setMatchDetail(m)}>
                <div className="px-4 py-3 space-y-2">
                  {/* 메인 라인 */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-500 shrink-0">{matchDate}</span>
                      <span className="text-gray-600">·</span>
                      <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>vs {opponentName}</span>
                      {venue && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="text-xs text-gray-500 truncate">{venue}</span>
                        </>
                      )}
                      {matchType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-500 shrink-0">{matchType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{ourScore}:{theirScore}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${resultColor}`} style={{ background: "rgba(255,255,255,0.1)" }}>{result}</span>
                    </div>
                  </div>

                  {/* 득점자 + 카드 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {myGoals.filter((s: any) => s.goals > 0 || s.assists > 0 || s.count > 0).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m._fromManage
                          ? myGoals.filter((s: any) => s.goals > 0 || s.assists > 0).map((s: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {s.goals > 0 ? `${s.name} ${s.goals}G` : ""}{s.assists > 0 ? ` ${s.assists}A` : ""}
                              </span>
                            ))
                          : myGoals.map((g: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{g.scorerName || g.scorer?.split("@")[0]} x{g.count}</span>
                            ))
                        }
                      </div>
                    )}
                    {matchCards.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {matchCards.map((c: any, i: number) => (
                          <span key={`card-${i}`} className={`text-xs px-2 py-0.5 rounded ${c.type === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {c.type === 'red' ? '🟥' : '🟨'} {c.playerName}{c.minute ? ` ${c.minute}'` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 경기 상세 모달 */}
      {matchDetail && (
        <MatchDetailModal
          m={matchDetail}
          authClubId={authClubId}
          clubNameMap={clubNameMap}
          isLeaderUser={isLeader}
          isManagerUser={false}
          members={members}
          memberNames={memberNames}
          onClose={() => setMatchDetail(null)}
          onUpdate={(updated: any) => {
            setMatchDetail(updated);
            if (updated._fromManage) {
              setManageMatches(prev => prev.map(x => (x.id || x.matchId) === (updated.id || updated.matchId) ? { ...x, ...updated } : x));
            }
          }}
        />
      )}
    </div>
  );
}
