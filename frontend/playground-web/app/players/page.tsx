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
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>선수 탐색</h1>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="이름, 지역, 포지션 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
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
                ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }
                : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* 선수 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p, index) => (
            <div
              key={p.username || p.email || index}
              className="rounded-xl p-4 transition-all cursor-pointer hover:opacity-80"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--card-bg)", border: "2px solid var(--card-border)" }}>
                  {p.avatar ? (
                    <Image src={p.avatar} alt={p.name} fill className="object-cover" />
                  ) : (
                    <span className="text-2xl" style={{ color: "var(--text-muted)" }}>{p.name?.[0] || "?"}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {p.sports?.[0] || "종목 없음"} {p.position && `· ${p.position}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={10} />
                  {p.regionSido} {p.regionSigungu}
                </div>
                {p.birthdate && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date().getFullYear() - new Date(p.birthdate).getFullYear()}세
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-sm py-12" style={{ color: "var(--text-muted)" }}>검색 결과가 없습니다</p>
      )}
    </div>
  );
}
