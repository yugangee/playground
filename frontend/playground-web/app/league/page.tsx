"use client";

import { Trophy, MapPin, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { manageFetch } from "@/lib/manageFetch";
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
  if (s === "recruiting") return { bg: "rgba(34,197,94,0.15)", color: "#4ade80" };
  if (s === "ongoing") return { bg: "rgba(192,38,211,0.15)", color: "#e879f9" };
  return { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" };
};

const chipStyle = (active: boolean) =>
  active
    ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
    : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" };

export default function LeaguePage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [filterRegion, setFilterRegion] = useState("전체");

  useEffect(() => {
    manageFetch("/league")
      .then((data) => setLeagues(data ?? []))
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>리그 탐색</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>지역 리그와 토너먼트에 참가해보세요</p>
        </div>
        <Link
          href="/manage/league"
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ color: "#e879f9", borderColor: "rgba(192,38,211,0.3)" }}
        >
          내 리그 관리 →
        </Link>
      </div>

      {/* 필터 */}
      <div className="space-y-2">
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
              style={
                filterStatus === s
                  ? { background: "rgba(192,38,211,0.15)", color: "#e879f9", border: "1px solid rgba(192,38,211,0.3)" }
                  : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }
              }
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
          return (
            <div key={l.id} className="border rounded-xl p-5 space-y-3 hover:border-fuchsia-500/40 transition-colors" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-fuchsia-400" />
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400">
                      {typeLabel[l.type] ?? l.type}
                    </span>
                    {l.region && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} /> {l.region}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
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
                <Link href="/manage/league" className="block w-full py-2 rounded-lg text-xs font-semibold text-white text-center" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
                  참가 신청하기 →
                </Link>
              )}
              {l.status === "ongoing" && (
                <Link href="/manage/league" className="block w-full py-2 rounded-lg text-xs text-center" style={{ background: "rgba(192,38,211,0.1)", color: "#e879f9" }}>
                  진행 현황 보기 →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Trophy size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {leagues.length === 0 ? "아직 개설된 리그가 없습니다" : "조건에 맞는 리그가 없습니다"}
          </p>
          <Link href="/manage/league" className="mt-4 inline-block text-xs text-fuchsia-400 hover:underline">
            리그 만들기 →
          </Link>
        </div>
      )}
    </div>
  );
}
