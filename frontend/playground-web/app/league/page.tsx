"use client";

import { Trophy, MapPin, Users, Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";

type League = {
  id: string;
  name: string;
  sport: string;
  region: string;
  teams: number;
  season: string;
  status: "모집중" | "진행중" | "종료";
  prize: string;
  image?: string;
};

const mockLeagues: League[] = [
  { id: "l1", name: "서울 풋살 챔피언십", sport: "풋살", region: "서울", teams: 16, season: "2026 시즌 1", status: "모집중", prize: "100만원" },
  { id: "l2", name: "경기도 축구 리그", sport: "축구", region: "경기", teams: 12, season: "2026 봄", status: "진행중", prize: "200만원" },
  { id: "l3", name: "인천 농구 토너먼트", sport: "농구", region: "인천", teams: 8, season: "2026 시즌 1", status: "모집중", prize: "50만원" },
  { id: "l4", name: "수도권 배드민턴 오픈", sport: "배드민턴", region: "서울", teams: 24, season: "2026 봄", status: "진행중", prize: "30만원" },
  { id: "l5", name: "서울 야구 선데이 리그", sport: "야구", region: "서울", teams: 10, season: "2026 시즌 1", status: "모집중", prize: "150만원" },
  { id: "l6", name: "경기 배구 챌린지", sport: "배구", region: "경기", teams: 6, season: "2025 겨울", status: "종료", prize: "80만원" },
];

const sports = ["전체", "축구", "풋살", "농구", "야구", "배구", "배드민턴"];
const regions = ["전체", "서울", "경기", "인천"];
const statuses = ["전체", "모집중", "진행중", "종료"];

export default function LeaguePage() {
  const [filterSport, setFilterSport] = useState("전체");
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");

  const filtered = mockLeagues.filter(l => {
    if (filterSport !== "전체" && l.sport !== filterSport) return false;
    if (filterRegion !== "전체" && l.region !== filterRegion) return false;
    if (filterStatus !== "전체" && l.status !== filterStatus) return false;
    return true;
  });

  const chipStyle = (active: boolean) =>
    active
      ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
      : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)" };

  const statusColor = (s: string) => {
    if (s === "모집중") return { bg: "rgba(34,197,94,0.15)", color: "#4ade80" };
    if (s === "진행중") return { bg: "rgba(192,38,211,0.15)", color: "#e879f9" };
    return { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>리그 탐색</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>지역 리그와 토너먼트에 참가해보세요</p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {sports.map(s => (
            <button key={s} onClick={() => setFilterSport(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={chipStyle(filterSport === s)}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {regions.map(r => (
            <button key={r} onClick={() => setFilterRegion(r)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors" style={chipStyle(filterRegion === r)}>{r}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={filterStatus === s
                ? { background: "rgba(192,38,211,0.15)", color: "#e879f9", border: "1px solid rgba(192,38,211,0.3)" }
                : { background: "var(--chip-inactive-bg)", color: "var(--chip-inactive-color)", border: "1px solid var(--chip-inactive-border)" }
              }>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(l => {
          const sc = statusColor(l.status);
          return (
            <div key={l.id} className="border rounded-xl p-5 space-y-3 hover:border-fuchsia-500/40 transition-colors cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-fuchsia-400" />
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{l.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400">{l.sport}</span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <MapPin size={10} /> {l.region}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.color }}>{l.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1"><Users size={11} /> {l.teams}팀</span>
                <span className="flex items-center gap-1"><Calendar size={11} /> {l.season}</span>
                <span className="text-fuchsia-400 font-medium">🏆 {l.prize}</span>
              </div>
              {l.status === "모집중" && (
                <button className="w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
                  참가 신청
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Trophy size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>조건에 맞는 리그가 없습니다</p>
        </div>
      )}
    </div>
  );
}
