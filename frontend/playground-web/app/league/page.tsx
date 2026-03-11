"use client";

import { Trophy, MapPin, Calendar, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { manageFetch } from "@/lib/manageFetch";
import { useTeam } from "@/context/TeamContext";
import Link from "next/link";
import type { League } from "@/types/manage";

const statusLabel: Record<string, string> = {
  recruiting: "모집중",
  ongoing: "진행중",
  finished: "종료",
};

const typeLabel: Record<string, string> = {
  league: "리그",
  tournament: "토너먼트",
};

const statusColor = (s: string) => {
  if (s === "recruiting") return { bg: "var(--card-bg)", color: "var(--text-primary)" };
  if (s === "ongoing") return { bg: "var(--card-bg)", color: "var(--text-primary)" };
  return { bg: "var(--card-bg)", color: "var(--text-muted)" };
};

const chipStyle = (active: boolean) =>
  active
    ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }
    : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" };

export default function LeaguePage() {
  const { currentTeam } = useTeam();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [filterRegion, setFilterRegion] = useState("전체");

  // 참가 중인 리그 (서버 동기화)
  const [participatedLeagues, setParticipatedLeagues] = useState<League[]>([]);
  const [loadingParticipated, setLoadingParticipated] = useState(false);

  const participatedIds = new Set(participatedLeagues.map(l => l.id));

  // 참가 중인 리그 로드
  const loadParticipated = async () => {
    if (!currentTeam?.id) return;
    setLoadingParticipated(true);
    try {
      const data: League[] = await manageFetch(`/league?participantTeamId=${currentTeam.id}`);
      setParticipatedLeagues(data ?? []);
    } catch {
      setParticipatedLeagues([]);
    } finally {
      setLoadingParticipated(false);
    }
  };

  const joinLeague = async (leagueId: string) => {
    if (!currentTeam) { alert("먼저 팀을 만들거나 팀에 가입하세요"); return; }
    setJoining(leagueId);
    try {
      await manageFetch(`/league/${leagueId}/teams`, { method: "POST", body: JSON.stringify({ teamId: currentTeam.id }) });
      await loadParticipated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "참가 신청 실패");
    } finally { setJoining(null); }
  };

  // 공개 리그 로드
  useEffect(() => {
    manageFetch("/league")
      .then((data) => setLeagues(data ?? []))
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false));
  }, []);

  // 참가 리그 로드
  useEffect(() => {
    if (currentTeam?.id) loadParticipated();
  }, [currentTeam?.id]);

  const regions = ["전체", ...Array.from(new Set(leagues.map((l) => l.region).filter(Boolean) as string[]))];
  const types = ["전체", "league", "tournament"];
  const statuses = ["전체", "recruiting", "ongoing", "finished"];

  const filtered = leagues.filter((l) => {
    if (filterType !== "전체" && l.type !== filterType) return false;
    if (filterRegion !== "전체" && l.region !== filterRegion) return false;
    if (filterStatus !== "전체" && l.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>대회 탐색</h1>
        </div>
        <Link
          href="/manage/league"
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          대회 관리 →
        </Link>
      </div>

      {/* 참가 중인 리그 */}
      {currentTeam && (loadingParticipated || participatedLeagues.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>참가 중인 대회</h2>
          {loadingParticipated ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {participatedLeagues.map(l => (
                <div key={l.id} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Trophy size={13} style={{ color: "var(--text-muted)" }} />
                      <span className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                        style={{ background: statusColor(l.status).bg, color: statusColor(l.status).color, border: "1px solid var(--card-border)" }}>
                        {statusLabel[l.status] ?? l.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>{typeLabel[l.type] ?? l.type}</span>
                      {l.region && <><span>·</span><span>{l.region}</span></>}
                    </div>
                  </div>
                  <Link
                    href={`/manage/league?leagueId=${l.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 ml-3 flex items-center gap-1 transition-opacity hover:opacity-80"
                    style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>
                    현황 <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 필터 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>공개 대회</h2>
        <div className="flex gap-2 flex-wrap">
          {types.map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={chipStyle(filterType === t)}>
              {t === "전체" ? "전체" : typeLabel[t]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {regions.map((r) => (
            <button key={r} onClick={() => setFilterRegion(r)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={chipStyle(filterRegion === r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={chipStyle(filterStatus === s)}
            >
              {s === "전체" ? "전체" : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 리그 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((l) => {
          const sc = statusColor(l.status);
          const alreadyJoined = participatedIds.has(l.id);
          return (
            <div key={l.id} className="rounded-xl p-5 space-y-3 transition-colors" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
                      {typeLabel[l.type] ?? l.type}
                    </span>
                    {l.region && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} /> {l.region}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: sc.bg, color: sc.color, border: "1px solid var(--card-border)" }}>
                  {statusLabel[l.status] ?? l.status}
                </span>
              </div>

              {l.description && (
                <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{l.description}</p>
              )}

              {(l.startDate || l.endDate) && (
                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Calendar size={11} /> {l.startDate ?? "?"} ~ {l.endDate ?? "미정"}
                </div>
              )}

              {l.status === "recruiting" && (
                alreadyJoined ? (
                  <div className="w-full py-2 rounded-lg text-xs font-semibold text-center" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                    참가 완료
                  </div>
                ) : (
                  <button
                    onClick={() => joinLeague(l.id)}
                    disabled={joining === l.id}
                    className="block w-full py-2 rounded-lg text-xs font-semibold text-center transition-opacity disabled:opacity-50"
                    style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>
                    {joining === l.id ? "신청 중..." : "참가 신청하기"}
                  </button>
                )
              )}
              {l.status === "ongoing" && (
                <Link
                  href={alreadyJoined ? `/manage/league?leagueId=${l.id}` : "/manage/league"}
                  className="block w-full py-2 rounded-lg text-xs text-center"
                  style={{ background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}
                >
                  진행 현황 보기 →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Trophy size={32} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {leagues.length === 0 ? "아직 개설된 대회가 없습니다" : "조건에 맞는 대회가 없습니다"}
          </p>
          <Link href="/manage/league" className="mt-4 inline-block text-xs hover:underline" style={{ color: "var(--text-primary)" }}>
            대회 만들기 →
          </Link>
        </div>
      )}
    </div>
  );
}
