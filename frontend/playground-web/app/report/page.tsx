"use client";

import { useState, useEffect, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Goal, Crosshair, AlertCircle, Shield, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

/* ── mock 데이터 (비로그인 / 팀 없을 때) ── */
const mockTeamName = "서울 FC 썬더";

const mockPlayers = [
  { name: "김민준", number: 1,  position: "GK", stats: { 스피드: 60, 슈팅: 40, 패스: 70, 체력: 75, 수비: 80 }, goals: 0,  assists: 1,  shots: 3,  passes: 210 },
  { name: "이서준", number: 4,  position: "DF", stats: { 스피드: 72, 슈팅: 35, 패스: 68, 체력: 80, 수비: 88 }, goals: 1,  assists: 2,  shots: 5,  passes: 180 },
  { name: "박지호", number: 5,  position: "DF", stats: { 스피드: 70, 슈팅: 30, 패스: 65, 체력: 78, 수비: 85 }, goals: 0,  assists: 1,  shots: 2,  passes: 160 },
  { name: "최현우", number: 6,  position: "DF", stats: { 스피드: 68, 슈팅: 32, 패스: 62, 체력: 76, 수비: 84 }, goals: 2,  assists: 0,  shots: 6,  passes: 155 },
  { name: "정도윤", number: 8,  position: "MF", stats: { 스피드: 78, 슈팅: 65, 패스: 82, 체력: 85, 수비: 60 }, goals: 5,  assists: 8,  shots: 22, passes: 320 },
  { name: "강시우", number: 10, position: "MF", stats: { 스피드: 82, 슈팅: 70, 패스: 88, 체력: 83, 수비: 55 }, goals: 7,  assists: 12, shots: 28, passes: 380 },
  { name: "윤준서", number: 11, position: "MF", stats: { 스피드: 80, 슈팅: 68, 패스: 80, 체력: 82, 수비: 58 }, goals: 4,  assists: 9,  shots: 20, passes: 290 },
  { name: "임지훈", number: 7,  position: "FW", stats: { 스피드: 90, 슈팅: 85, 패스: 72, 체력: 80, 수비: 40 }, goals: 12, assists: 5,  shots: 45, passes: 140 },
  { name: "한승민", number: 9,  position: "FW", stats: { 스피드: 88, 슈팅: 88, 패스: 70, 체력: 82, 수비: 38 }, goals: 15, assists: 4,  shots: 52, passes: 130 },
  { name: "오태양", number: 17, position: "FW", stats: { 스피드: 86, 슈팅: 80, 패스: 68, 체력: 78, 수비: 42 }, goals: 8,  assists: 6,  shots: 35, passes: 120 },
  { name: "신재원", number: 3,  position: "DF", stats: { 스피드: 74, 슈팅: 33, 패스: 66, 체력: 77, 수비: 86 }, goals: 1,  assists: 3,  shots: 4,  passes: 170 },
  { name: "백승호", number: 14, position: "MF", stats: { 스피드: 76, 슈팅: 62, 패스: 78, 체력: 80, 수비: 56 }, goals: 3,  assists: 7,  shots: 18, passes: 260 },
  { name: "류성민", number: 20, position: "GK", stats: { 스피드: 58, 슈팅: 38, 패스: 68, 체력: 72, 수비: 82 }, goals: 0,  assists: 0,  shots: 1,  passes: 190 },
];

const positionColor: Record<string, string> = {
  GK: "bg-yellow-500/20 text-yellow-400",
  DF: "bg-blue-500/20 text-blue-400",
  MF: "bg-green-500/20 text-green-400",
  FW: "bg-red-500/20 text-red-400",
  C:  "bg-purple-500/20 text-purple-400",
  PG: "bg-green-500/20 text-green-400",
  SG: "bg-green-500/20 text-green-400",
  SF: "bg-blue-500/20 text-blue-400",
  PF: "bg-blue-500/20 text-blue-400",
};

const timeline = [
  { time: "12:34", type: "goal", label: "골",   desc: "페널티 박스 우측 슈팅 → 골" },
  { time: "27:10", type: "shot", label: "슈팅", desc: "중거리 슈팅, 골키퍼 선방" },
  { time: "61:48", type: "goal", label: "골",   desc: "왼발 감아차기 → 골" },
  { time: "78:55", type: "foul", label: "파울", desc: "상대 수비수 파울 유도" },
];

const typeConfig = {
  goal: { icon: Goal,        color: "text-lime-400",  bg: "bg-lime-400/10 border-lime-400/30" },
  shot: { icon: Crosshair,   color: "text-sky-400",   bg: "bg-sky-400/10 border-sky-400/30" },
  foul: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
};

type Player = {
  name: string;
  number: number;
  position: string;
  stats: Record<string, number>;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
};

/* 포지션별 스탯 경향 (실제 멤버용 시드 기반 생성) */
function generateStats(name: string, position: string): Omit<Player, "name" | "number" | "position"> {
  // 이름 기반 시드 (같은 이름이면 항상 같은 스탯)
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

  const isAttacker = position === "FW";
  const isMid = position === "MF";
  return {
    stats,
    goals:   isAttacker ? rand(3, 18) : isMid ? rand(1, 8) : rand(0, 3),
    assists: isMid ? rand(3, 14) : isAttacker ? rand(1, 8) : rand(0, 4),
    shots:   isAttacker ? rand(20, 55) : isMid ? rand(10, 30) : rand(1, 8),
    passes:  isMid ? rand(200, 400) : position === "GK" ? rand(150, 220) : rand(100, 250),
  };
}

export default function ReportPage() {
  const { user, loading } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [realMembers, setRealMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // 로그인 + 팀 있으면 실제 데이터 fetch
  useEffect(() => {
    if (!user?.teamId) { setClub(null); setRealMembers([]); return; }
    setLoadingTeam(true);
    Promise.all([
      fetch(`${API}/clubs`).then(r => r.json()),
      fetch(`${API}/club-members/${user.teamId}`).then(r => r.json()),
    ]).then(([clubsData, membersData]) => {
      const found = (clubsData.clubs || []).find((c: any) => c.clubId === user.teamId);
      setClub(found || null);
      setRealMembers(membersData.members || []);
    }).catch(() => {}).finally(() => setLoadingTeam(false));
  }, [user?.teamId]);

  // 실제 멤버 → Player 형태로 변환
  const players: Player[] = useMemo(() => {
    if (!user?.teamId || realMembers.length === 0) return mockPlayers;
    return realMembers.map((m: any, i: number) => {
      const pos = m.position || "MF";
      const generated = generateStats(m.name || m.email, pos);
      return {
        name: m.name || m.email,
        number: m.number ?? (i + 1),
        position: pos,
        ...generated,
      };
    });
  }, [user?.teamId, realMembers]);

  const displayTeamName = club?.name || mockTeamName;
  const isRealTeam = !!user?.teamId && !!club;

  const [selected, setSelected] = useState<Player | null>(null);
  useEffect(() => { if (players.length > 0) setSelected(players[0]); }, [players]);

  if (loading || loadingTeam) {
    return <div className="max-w-5xl mx-auto pt-20 text-center"><p className="text-gray-500 text-sm">로딩 중...</p></div>;
  }

  if (!selected) return null;

  const radarData = Object.entries(selected.stats).map(([subject, A]) => ({ subject, A, fullMark: 100 }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 팀명 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Shield size={20} className="text-fuchsia-400" />
        <h1 className="text-2xl font-bold text-white">{displayTeamName}</h1>
        <span className="ml-2 text-sm text-gray-400">AI 분석 리포트</span>
        {isRealTeam && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400">내 팀</span>}
        {!isRealTeam && (
          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">샘플 데이터</span>
        )}
      </div>

      {!user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#111] border border-white/10 rounded-2xl p-8 max-w-xs text-center space-y-4 shadow-2xl">
            <p className="text-white font-semibold">로그인이 필요합니다</p>
            <p className="text-gray-400 text-xs">로그인하고 AI 리포트를 확인하세요</p>
            <Link href="/login" className="inline-block px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>
              로그인
            </Link>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* 선수 목록 */}
        <div className="w-44 shrink-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {players.map(p => (
              <button key={`${p.number}-${p.name}`} onClick={() => setSelected(p)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-white/5 transition-colors ${selected.name === p.name && selected.number === p.number ? "bg-fuchsia-500/10" : "hover:bg-white/5"}`}>
                <span className="text-gray-500 text-xs w-4">{p.number}</span>
                <span className="text-white text-sm flex-1 truncate">{p.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${positionColor[p.position] || "bg-white/10 text-gray-400"}`}>{p.position}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 선수 상세 */}
        <div className="flex-1 space-y-4">
          {/* 선수 헤더 */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="text-3xl font-black text-fuchsia-400">#{selected.number}</div>
            <div>
              <p className="text-white text-lg font-bold">{selected.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${positionColor[selected.position] || "bg-white/10 text-gray-400"}`}>{selected.position}</span>
            </div>
            <div className="ml-auto grid grid-cols-4 gap-4 text-center">
              {[
                { label: "골",   value: selected.goals },
                { label: "도움", value: selected.assists },
                { label: "슈팅", value: selected.shots },
                { label: "패스", value: selected.passes },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-fuchsia-400 font-bold text-lg">{value}</p>
                  <p className="text-gray-500 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 레이더 차트 */}
            <div className="h-[260px] bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-300 mb-2">스탯 레이더</p>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Radar dataKey="A" stroke="#c026d3" fill="#c026d3" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 상세 수치 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-300">상세 수치</p>
              {Object.entries(selected.stats).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-fuchsia-400 font-medium">{val}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div className="h-1.5 rounded-full" style={{ width: `${val}%`, background: "linear-gradient(to right, #c026d3, #7c3aed)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 타임라인 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-300 mb-4">AI 분석 타임라인</p>
            <div className="relative space-y-4 before:absolute before:left-[52px] before:top-0 before:bottom-0 before:w-px before:bg-white/10">
              {timeline.map(({ time, type, label, desc }) => {
                const { icon: Icon, color, bg } = typeConfig[type as keyof typeof typeConfig];
                return (
                  <div key={time} className="flex items-start gap-4">
                    <span className="text-xs text-gray-500 w-10 pt-2.5 shrink-0 text-right">{time}</span>
                    <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="pt-1.5">
                      <span className={`text-xs font-semibold ${color}`}>{label}</span>
                      <p className="text-sm text-gray-300 mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
