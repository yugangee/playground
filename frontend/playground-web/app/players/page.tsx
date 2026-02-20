"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Filter } from "lucide-react";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL;

const sports = ["전체", "축구", "풋살", "농구", "야구", "배구", "테니스", "배드민턴", "스노보드", "러닝크루"];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("전체");
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/users`)
      .then(r => r.json())
      .then(d => {
        setPlayers(d.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) => {
    const matchSport = sport === "전체" || p.sports?.includes(sport);
    const matchSearch = p.name?.includes(search) || p.regionSido?.includes(search) || p.regionSigungu?.includes(search) || p.position?.includes(search);
    return matchSport && matchSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-black text-white">선수 탐색</h1>
        <p className="text-gray-500 text-sm mt-1">함께할 선수를 찾아보세요</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="이름, 지역, 포지션 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
      </div>

      {/* 종목 필터 */}
      <div className="flex flex-wrap gap-2">
        {sports.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={
              sport === s
                ? { background: "linear-gradient(to right, #c026d3, #7c3aed)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* 선수 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div
              key={p.username}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-fuchsia-500/30 hover:bg-white/8 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-fuchsia-500/40 bg-white/5 flex items-center justify-center">
                  {p.avatar ? (
                    <Image src={p.avatar} alt={p.name} fill className="object-cover" />
                  ) : (
                    <span className="text-2xl text-fuchsia-400">{p.name?.[0] || "?"}</span>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-fuchsia-400 text-xs font-medium mt-0.5">
                    {p.sports?.[0] || "종목 없음"} {p.position && `· ${p.position}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <MapPin size={10} />
                  {p.regionSido} {p.regionSigungu}
                </div>
                {p.birthdate && (
                  <span className="text-xs text-gray-600">
                    {new Date().getFullYear() - new Date(p.birthdate).getFullYear()}세
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-12">검색 결과가 없습니다</p>
      )}
    </div>
  );
}
