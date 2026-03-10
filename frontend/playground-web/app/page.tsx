"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Users, BarChart2, ArrowRight, Search, Zap, Shield, Check, Trophy, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// 전역 스타일
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;
  document.head.appendChild(style);
}

const tournaments = [
  { 
    title: "제51회 한국기자협회 서울지역 축구대회", 
    status: "진행중", 
    date: "2025.03.01 - 03.31",
    teams: "52개팀",
    image: "/kja-tournament.png" 
  },
  { 
    title: "2025 서울시 아마추어 풋살 리그", 
    status: "모집중", 
    date: "2025.04.15 - 06.30",
    teams: "32개팀 모집",
    image: "/futsal-tournament.png" 
  },
  { 
    title: "강남구 생활체육 농구대회", 
    status: "예정", 
    date: "2025.05.10 - 05.25",
    teams: "16개팀",
    image: "/basketball-tournament.png" 
  },
];

const plans = [
  {
    name: "베이직",
    price: "무료",
    desc: "스포츠 팀 탐색의 시작",
    features: [
      "스포츠 용품 중고거래",
      "클럽 조회",
      "AI 팀 매칭",
      "경기 제안 월 2회",
    ],
    cta: "시작하기",
    highlight: false,
  },
  {
    name: "플러스",
    price: "₩9,900",
    period: "/월",
    desc: "팀 운영을 더 스마트하게",
    features: [
      "베이직 모든 기능",
      "경기 제안 무제한",
      "스마트 팀 매니지먼트",
      "경기 일정 관리 서비스",
      "AI 영상분석 월 30분 (무제한 횟수)",
    ],
    cta: "시작하기",
    highlight: true,
  },
  {
    name: "프로",
    price: "₩19,900",
    period: "/월",
    desc: "선수 · 팀 완전 분석",
    features: [
      "플러스 모든 기능",
      "선수 개인 분석 리포트",
      "AI 영상분석 월 60분 (무제한 횟수)",
    ],
    cta: "시작하기",
    highlight: false,
  },
];

const features = [
  {
    href: "/clubs",
    icon: Search,
    badge: "탐색",
    title: "클럽 탐색",
    desc: "주변 클럽을 찾고 경기를 제안해보세요",
    color: "#c026d3",
  },
  {
    href: "/finance",
    icon: Users,
    badge: "팀",
    title: "팀 매니지먼트",
    desc: "스마트 팀 매니지먼트",
    color: "#2563eb",
  },
  {
    href: "/report",
    icon: ShoppingCart,
    badge: "AI",
    title: "AI 리포트",
    desc: "선수 개인 분석 리포트",
    color: "#7c3aed",
  },
  {
    href: "/video",
    icon: BarChart2,
    badge: "AI",
    title: "AI 영상분석",
    desc: "경기 영상 AI 분석",
    color: "#059669",
  },
];

const stats = [
  { target: 124, suffix: "+", label: "등록 클럽" },
  { target: 1800, suffix: "+", label: "활성 선수" },
  { target: 450, suffix: "+", label: "이번 달 경기" },
];

function TournamentCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % tournaments.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const item = tournaments[current];
  
  const statusColor = item.status === "진행중" 
    ? { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" }
    : item.status === "모집중"
    ? { bg: "rgba(192,38,211,0.15)", text: "#e879f9", border: "rgba(192,38,211,0.3)" }
    : { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" };

  return (
    <div>
      <div
        className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] cursor-pointer"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/40 to-violet-900/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />

        {/* 텍스트 */}
        <div className="absolute top-0 left-0 right-0 p-4 space-y-2 bg-white/90">
          <div className="flex items-center gap-2">
            <span 
              className="text-xs px-2 py-0.5 rounded-full font-semibold border"
              style={{ background: statusColor.bg, color: statusColor.text, borderColor: statusColor.border }}
            >
              {item.status}
            </span>
            <span className="text-xs text-gray-500">{item.date}</span>
          </div>
          <p className="text-sm leading-snug">
            <span className="text-gray-900 font-bold">{item.title}</span>
            <span className="text-gray-500"> · {item.teams}</span>
          </p>
        </div>

        {/* 인디케이터 도트 */}
        <div className="absolute bottom-5 right-6 flex items-center gap-2">
          {tournaments.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${i === current
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
              aria-label={`대회 ${i + 1}번으로 이동`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [recentTeams, setRecentTeams] = useState<any[]>([]);
  const [topMatchTeams, setTopMatchTeams] = useState<any[]>([]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${API}/clubs?limit=15&sort=createdAt&order=desc`)
      .then(r => r.json())
      .then(d => setRecentTeams(d.clubs || []))
      .catch(() => { });

    fetch(`${API}/clubs?limit=3&sort=matchCount&order=desc`)
      .then(r => r.json())
      .then(d => setTopMatchTeams(d.clubs || []))
      .catch(() => { });
  }, []);

  if (loading) return <div className="flex items-center justify-center pt-32"><div className="w-6 h-6 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <LoggedInHome name={user?.name || "게스트"} recentTeams={recentTeams} topMatchTeams={topMatchTeams} />
      {!user && <GuestLoginBanner />}
    </>
  );
}

function KJABanner() {
  return (
    <Link href="/league/kja-51">
      <div className="relative rounded-2xl overflow-hidden border cursor-pointer group transition-all hover:scale-[1.01]"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(192,38,211,0.15) 60%, rgba(16,185,129,0.1) 100%)", borderColor: "rgba(192,38,211,0.35)" }}>
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #c026d3 0%, transparent 60%)" }} />

        <div className="relative px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
              style={{ background: "rgba(192,38,211,0.25)", border: "1px solid rgba(192,38,211,0.4)" }}>
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>LIVE DEMO</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(232,121,249,0.15)", color: "#e879f9" }}>서울경제 4시드</span>
              </div>
              <p className="text-sm font-bold text-white">제51회 한국기자협회 서울지역 축구대회</p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>52개팀 · 57경기 · 서울경제 어벤져스 선수단 20명</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold shrink-0"
            style={{ color: "#e879f9" }}>
            대진표 보기 <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

const SPORTS = ["전체", "축구", "농구", "테니스", "배드민턴", "야구", "풋살"];

// 스크롤바 숨기기 스타일
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

function LoggedInHome({ name, recentTeams: initialRecent, topMatchTeams: initialTop }: { name: string; recentTeams: any[]; topMatchTeams: any[] }) {
  const [sport, setSport] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const fromUrl = new URLSearchParams(window.location.search).get('sport');
        if (fromUrl && SPORTS.includes(fromUrl)) return fromUrl;
      }
      return localStorage.getItem("pg_sport") ?? "전체";
    } catch { return "전체"; }
  });
  const [recentTeams, setRecentTeams] = useState(initialRecent);
  const [topMatchTeams, setTopMatchTeams] = useState(initialTop);
  const [filterLoading, setFilterLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  const [region, setRegion] = useState("전체");
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [rankingSport, setRankingSport] = useState("축구");
  const [rankingRegion, setRankingRegion] = useState("서울");
  const sportRef = useRef(sport);
  sportRef.current = sport;

  const handleSport = useCallback(async (s: string) => {
    if (s === sportRef.current) return;
    // Update URL query param
    if (typeof window !== 'undefined') {
      const url = s === "전체" ? window.location.pathname : `${window.location.pathname}?sport=${encodeURIComponent(s)}`;
      window.history.replaceState(null, '', url);
    }
    // fade out
    setVisible(false);
    setFilterLoading(true);
    try { localStorage.setItem("pg_sport", s); } catch { }
    setSport(s);
    const API = process.env.NEXT_PUBLIC_API_URL;
    const sportParam = s === "전체" ? "" : `&sport=${encodeURIComponent(s)}`;
    await Promise.all([
      fetch(`${API}/clubs?limit=15&sort=createdAt&order=desc${sportParam}`)
        .then(r => r.json()).then(d => setRecentTeams(d.clubs || [])).catch(() => { }),
      fetch(`${API}/clubs?limit=3&sort=matchCount&order=desc${sportParam}`)
        .then(r => r.json()).then(d => setTopMatchTeams(d.clubs || [])).catch(() => { }),
    ]);
    setFilterLoading(false);
    // fade in
    setVisible(true);
  }, []);


  return (
    <div className="max-w-5xl mx-auto space-y-14">
      {/* 진행중인 대회 */}
      <TournamentCarousel />

      {/* 이번주 경기 - 가로 스크롤 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: "var(--text-muted)" }} />
              <h2 className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>이번주 경기</h2>
            </div>
            <div className="flex gap-1 sm:gap-2">
              {["전체", "서울", "경기", "인천"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className="px-2 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  style={region === r 
                    ? { background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--card-border)" } 
                    : { color: "var(--text-muted)" }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center transition-colors" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <ArrowRight size={16} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[
            { home: "서울 FC", away: "강남 유나이티드", datetime: "03.05 14:00 예정", location: "강남구", region: "서울", dateObj: new Date("2025-03-05T14:00") },
            { home: "용산 타이거즈", away: "마포 이글스", datetime: "03.06 16:30 예정", location: "용산구", region: "서울", dateObj: new Date("2025-03-06T16:30") },
            { home: "성남 FC", away: "수원 블루윙즈", datetime: "03.07 19:00 예정", location: "성남시", region: "경기", dateObj: new Date("2025-03-07T19:00") },
            { home: "인천 드래곤즈", away: "부평 FC", datetime: "03.08 15:00 예정", location: "부평구", region: "인천", dateObj: new Date("2025-03-08T15:00") },
            { home: "송파 워리어스", away: "강동 FC", datetime: "03.09 18:00 예정", location: "송파구", region: "서울", dateObj: new Date("2025-03-09T18:00") },
            { home: "분당 유나이티드", away: "판교 FC", datetime: "03.10 14:30 예정", location: "분당구", region: "경기", dateObj: new Date("2025-03-10T14:30") },
          ]
            .filter((match) => region === "전체" || match.region === region)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .map((match, i) => (
              <div key={i} className="flex-shrink-0 w-48 rounded-xl p-4 transition-colors cursor-pointer" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                      {match.datetime} {match.location}
                    </div>
                  </div>
                  <div className="pt-3 space-y-2" style={{ borderTop: "1px solid var(--card-border)" }}>
                    <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{match.home}</div>
                    <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{match.away}</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 1:1 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽: 종목별 클럽 랭킹 */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Trophy size={16} style={{ color: "var(--text-muted)" }} className="shrink-0" />
              <h2 className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                이번달 종목별 랭킹
              </h2>
            </div>
            <div className="flex gap-1 shrink-0">
              {["축구", "농구", "야구"].map((s) => (
                <button
                  key={s}
                  onClick={() => setRankingSport(s)}
                  className="px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                  style={rankingSport === s 
                    ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" } 
                    : { color: "var(--text-muted)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-muted)" }}>순위</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-muted)" }}>팀</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-primary)" }}>승점</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>경기</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>승</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>무</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>패</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>득실차</th>
                </tr>
              </thead>
              <tbody>
                {topMatchTeams
                  .filter(club => club.sport === rankingSport)
                  .slice(0, 5)
                  .map((club, index) => {
                    const wins = Math.floor(Math.random() * 3) + 1;
                    const draws = Math.floor(Math.random() * 2);
                    const losses = Math.floor(Math.random() * 2);
                    const games = wins + draws + losses;
                    const points = wins * 3 + draws;
                    const goals = wins * 2 + draws + Math.floor(Math.random() * 3);
                    const conceded = losses * 2 + Math.floor(Math.random() * 2);
                    const diff = goals - conceded;
                    
                    return (
                      <tr key={club.clubId} className="transition-colors" style={{ borderBottom: "1px solid var(--card-border)" }}>
                        <td className="py-2 px-2">
                          <span style={{ color: "var(--text-primary)" }} className="font-semibold">{index + 1}</span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                              {club.image ? (
                                <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{club.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{club.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{points}</span>
                        </td>
                        <td className="py-2 px-1 text-center" style={{ color: "var(--text-secondary)" }}>{games}</td>
                        <td className="py-2 px-1 text-center" style={{ color: "var(--text-secondary)" }}>{wins}</td>
                        <td className="py-2 px-1 text-center" style={{ color: "var(--text-secondary)" }}>{draws}</td>
                        <td className="py-2 px-1 text-center" style={{ color: "var(--text-secondary)" }}>{losses}</td>
                        <td className="py-2 px-1 text-center">
                          <span style={{ color: "var(--text-secondary)" }}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {topMatchTeams.filter(club => club.sport === rankingSport).length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      해당 종목의 클럽이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽: 지역별 클럽 랭킹 */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Trophy size={16} style={{ color: "var(--text-muted)" }} className="shrink-0" />
              <h2 className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                이번달 지역별 랭킹
              </h2>
            </div>
            <div className="flex gap-1 shrink-0">
              {["서울", "경기", "인천"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRankingRegion(r)}
                  className="px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                  style={rankingRegion === r 
                    ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" } 
                    : { color: "var(--text-muted)" }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-muted)" }}>순위</th>
                  <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--text-muted)" }}>팀</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>종목</th>
                  <th className="text-center py-2 px-1 font-medium" style={{ color: "var(--text-muted)" }}>경기수</th>
                </tr>
              </thead>
              <tbody>
                {topMatchTeams.slice(0, 5).map((club, index) => {
                  const wins = Math.floor(Math.random() * 3) + 1;
                  const draws = Math.floor(Math.random() * 2);
                  const losses = Math.floor(Math.random() * 2);
                  const games = wins + draws + losses;
                  
                  return (
                    <tr key={club.clubId} className="transition-colors" style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td className="py-2 px-2">
                        <span style={{ color: "var(--text-primary)" }} className="font-semibold">{index + 1}</span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                            {club.image ? (
                              <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{club.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{club.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span style={{ color: "var(--text-secondary)" }}>{club.sport}</span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span style={{ color: "var(--text-secondary)" }}>{games}</span>
                      </td>
                    </tr>
                  );
                })}
                {topMatchTeams.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      해당 지역의 클럽이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 이번주 핫한 영상 + 인기글 섹션 */}
      <div className="space-y-8">
        {/* 이번주 핫한 영상 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Weekly Playback</h2>
            <Link href="/community?tab=축구" className="text-sm" style={{ color: "var(--text-muted)" }}>
              전체보기 →
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "환상적인 중거리 슛!", player: "김민수", team: "강남 FC", views: 12340, sport: "축구" },
              { title: "역전 결승골 순간", player: "최영훈", team: "서초 유나이티드", views: 23410, sport: "축구" },
              { title: "3점슛 연속 성공", player: "박준혁", team: "마포 드래곤즈", views: 8920, sport: "농구" },
              { title: "완벽한 스매시", player: "이서연", team: "강남 셔틀콕", views: 6540, sport: "배드민턴" },
            ].map((video, i) => (
              <Link key={i} href={`/community?tab=${video.sport}`}>
                <div className="rounded-xl overflow-hidden cursor-pointer transition-all hover:opacity-80" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="aspect-[9/16] flex items-center justify-center relative" style={{ background: "var(--card-bg)" }}>
                    <span className="text-4xl">🎬</span>
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs">
                      <span className="px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}>
                        👁 {(video.views / 1000).toFixed(1)}K
                      </span>
                      <span className="px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)" }}>
                        {video.sport}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{video.title}</h3>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{video.player} · {video.team}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 이번주 인기글 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>이번주 인기글</h2>
            <Link href="/community?tab=자유게시판" className="text-sm" style={{ color: "var(--text-muted)" }}>
              전체보기 →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "4-3-3 포메이션 완벽 가이드", author: "전술매니아", comments: 45, likes: 189, category: "축구", hot: true },
              { title: "운동 후 단백질 보충 어떻게 하세요?", author: "헬스초보", comments: 67, likes: 234, category: "자유게시판", hot: true },
              { title: "강남구 구장 상태 어떤가요?", author: "뉴비", comments: 23, likes: 45, category: "우리동네", hot: false },
              { title: "농구 슛 폼 교정 팁", author: "농구코치", comments: 35, likes: 145, category: "농구", hot: true },
            ].map((post, i) => (
              <Link key={i} href={`/community?tab=${post.category}`}>
                <div className="rounded-xl p-4 transition-all cursor-pointer hover:opacity-80" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    {post.hot && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>HOT</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>{post.category}</span>
                  </div>
                  <h3 className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{post.author}</span>
                    <div className="flex items-center gap-3">
                      <span>💬 {post.comments}</span>
                      <span>❤️ {post.likes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestLoginBanner() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: "#000000", borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm sm:text-base" style={{ color: "#ffffff" }}>
            월 ₩1,000으로 만날 수 있는 플레이그라운드.
          </p>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "rgba(255,255,255,0.5)" }}>
            가장 경제적인 아마추어 스포츠 플랫폼을 이용해 보세요.
          </p>
        </div>
        <Link
          href="/signup"
          className="shrink-0 ml-4 px-5 py-2 rounded-md text-sm font-semibold transition-colors hover:bg-white/10 border"
          style={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.3)" }}
        >
          자세히 알아보기
        </Link>
      </div>
    </div>
  );
}

function LandingHome({ recentTeams, topMatchTeams }: { recentTeams: any[]; topMatchTeams: any[] }) {
  // 사진 있는 팀만 필터링
  const teamsWithImages = recentTeams.filter(t => t.image);
  
  // 3행을 위해 팀 분배 (사진 있는 팀만)
  const row1Teams = teamsWithImages.length > 0 ? [...teamsWithImages, ...teamsWithImages, ...teamsWithImages] : [];
  const row2Teams = teamsWithImages.length > 2 
    ? [...teamsWithImages.slice(2), ...teamsWithImages.slice(0, 2), ...teamsWithImages.slice(2), ...teamsWithImages.slice(0, 2), ...teamsWithImages]
    : [...teamsWithImages, ...teamsWithImages, ...teamsWithImages];
  const row3Teams = teamsWithImages.length > 4 
    ? [...teamsWithImages.slice(4), ...teamsWithImages.slice(0, 4), ...teamsWithImages.slice(4), ...teamsWithImages.slice(0, 4)]
    : [...teamsWithImages, ...teamsWithImages, ...teamsWithImages];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="absolute top-0 left-0 right-0 z-50 px-8 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: "#ffffff" }}>Playground</h1>
          <Link
            href="/login"
            className="px-4 py-2 rounded text-sm font-semibold transition-colors border"
            style={{ background: "#000000", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            로그인
          </Link>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <div className="relative min-h-[55vh] flex items-start justify-center overflow-hidden pt-32" style={{ backgroundColor: "#000000" }}>
        {/* 배경 검정 */}
        
        {/* 배경 팀 동그라미 3행 마키 (일렬, 느리게) */}
        <div className="absolute inset-0 opacity-50 overflow-hidden" style={{ filter: "blur(3px)" }}>
          <div className="absolute inset-0 flex flex-col justify-center gap-8">
            {/* 1행 - 오른쪽으로 → (위쪽) */}
            <div 
              className="flex gap-6"
              style={{ 
                width: "max-content",
                animation: "scrollRight 300s linear infinite",
                transform: "translateY(-30px)"
              }}
            >
              {row1Teams.map((t, i) => (
                <div key={`row1-${t?.clubId || i}-${i}`} className="w-42 h-42 rounded-full border border-fuchsia-500/30 overflow-hidden flex items-center justify-center shrink-0">
                  {t?.image && (
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            
            {/* 2행 - 왼쪽으로 ← (중간) */}
            <div 
              className="flex gap-6"
              style={{ 
                width: "max-content",
                animation: "scrollLeft 310s linear infinite",
                transform: "translateY(-10px)"
              }}
            >
              {row2Teams.map((t, i) => (
                <div key={`row2-${t?.clubId || i}-${i}`} className="w-42 h-42 rounded-full border border-violet-500/30 overflow-hidden flex items-center justify-center shrink-0">
                  {t?.image && (
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            
            {/* 3행 - 오른쪽으로 → (약간 위) */}
            <div 
              className="flex gap-6"
              style={{ 
                width: "max-content",
                animation: "scrollRight 320s linear infinite",
                transform: "translateY(10px)"
              }}
            >
              {row3Teams.map((t, i) => (
                <div key={`row3-${t?.clubId || i}-${i}`} className="w-42 h-42 rounded-full border border-emerald-500/30 overflow-hidden flex items-center justify-center shrink-0">
                  {t?.image && (
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 애니메이션 스타일 */}
        <style jsx>{`
          @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
          @keyframes scrollLeft {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
        `}</style>

        {/* 그라데이션 오버레이 - 전체 약간 어둡게 */}
        <div className="absolute inset-0 bg-black/35" />

        {/* 메인 콘텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* 메인 헤드라인 */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
            <span style={{ color: "#ffffff" }}>클럽 매칭, 팀 관리,</span><br />
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              AI 분석
            </span>
            <span style={{ color: "#ffffff" }}>을 한 곳에서</span>
          </h2>

          {/* 서브 텍스트 */}
          <p className="text-base sm:text-lg md:text-xl text-gray-200 drop-shadow-lg">
            <span className="text-fuchsia-400 font-bold">₩1,000</span>으로 시작하세요.<br className="sm:hidden" />멤버십은 언제든지 해지 가능합니다.
          </p>

          {/* 추가 안내 */}
          <p className="text-sm sm:text-base drop-shadow" style={{ color: "white" }}>
            지금 바로 시작할 준비가 되셨나요?<br className="sm:hidden" />회원가입 후 플레이그라운드를 경험하세요.
          </p>

          {/* 회원가입 버튼 */}
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg text-base sm:text-lg font-bold transition-all hover:scale-105 border"
            style={{ background: "#000000", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            회원가입 <ArrowRight size={18} className="sm:w-[20px] sm:h-[20px]" />
          </Link>
        </div>
      </div>

      {/* Trending Now - 클럽 랭킹 */}
      <div className="bg-black py-16 px-8">
        <div className="max-w-7xl mx-auto">
          {/* 전체 클럽 랭킹 */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">전체 클럽 랭킹</h2>
              <Link 
                href="/clubs"
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                더보기 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {topMatchTeams.slice(0, 6).map((club, index) => (
                <Link
                  key={club.clubId}
                  href={`/clubs/${club.clubId}`}
                  className="relative flex-shrink-0 w-36 h-52 sm:w-40 sm:h-60 md:w-44 md:h-64 lg:w-48 lg:h-72 rounded-lg overflow-hidden group cursor-pointer"
                >
                  {/* 배경 이미지 */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-gray-400/40">
                    {club.image && (
                      <img src={club.image} alt={club.name} className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" />
                    )}
                  </div>

                  {/* 클럽 정보 - 상단 왼쪽 */}
                  <div className="absolute top-3 left-3 right-3">
                    <h3 className="text-white font-bold text-sm sm:text-base mb-1 truncate">
                      {club.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="px-2 py-0.5 rounded-md border font-semibold text-xs sm:text-sm" style={{ background: "rgba(192,38,211,0.15)", color: "#c026d3", borderColor: "rgba(192,38,211,0.3)" }}>
                        {club.sport}
                      </span>
                      {club.location && (
                        <span className="text-gray-200 text-xs sm:text-sm">
                          {club.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 카테고리별 랭킹 (축구) */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-2xl font-bold">축구 클럽 랭킹</h2>
              <Link 
                href="/clubs?sport=축구"
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                더보기 <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {recentTeams.filter(club => club.sport === "축구").slice(0, 6).map((club, index) => (
                <Link
                  key={club.clubId}
                  href={`/clubs/${club.clubId}`}
                  className="relative flex-shrink-0 w-36 h-52 sm:w-40 sm:h-60 md:w-44 md:h-64 lg:w-48 lg:h-72 rounded-lg overflow-hidden group cursor-pointer"
                >
                  {/* 배경 이미지 */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-gray-400/40">
                    {club.image && (
                      <img src={club.image} alt={club.name} className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" />
                    )}
                  </div>

                  {/* 클럽 정보 - 상단 왼쪽 */}
                  <div className="absolute top-3 left-3 right-3">
                    <h3 className="text-white font-bold text-sm sm:text-base mb-1 truncate">
                      {club.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <span className="px-2 py-0.5 rounded-md border font-semibold text-xs sm:text-sm" style={{ background: "rgba(192,38,211,0.15)", color: "#c026d3", borderColor: "rgba(192,38,211,0.3)" }}>
                        {club.sport}
                      </span>
                      {club.location && (
                        <span className="text-gray-200 text-xs sm:text-sm">
                          {club.location}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* More Reasons to Join - 넷플릭스 스타일 */}
      <div className="relative py-16 sm:py-24 px-6 sm:px-12 pb-40 overflow-hidden" style={{ background: "linear-gradient(180deg, #000000 0%, #1a0a2e 50%, #0f0f0f 100%)" }}>
        <div className="relative max-w-6xl mx-auto">
          {/* 메인 타이틀 */}
          <div className="text-left sm:text-center mb-8 sm:mb-16">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-2" style={{ color: "#ffffff" }}>
              가입해야 하는 또 다른 이유
            </h2>
          </div>

          {/* 카드 리스트 - 모바일: 세로, 데스크탑: 가로 */}
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 카드 1 */}
            <div 
              className="rounded-xl p-5 sm:p-6 relative overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, rgba(139, 69, 19, 0.4) 0%, rgba(75, 0, 130, 0.3) 100%)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#ffffff" }}>
                    올인원 팀 관리
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    단톡방에 흩어진 팀원 명단과 회비, 경기 결과를 한곳에 모아 관리하세요.
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl">📋</div>
              </div>
            </div>

            {/* 카드 2 */}
            <div 
              className="rounded-xl p-5 sm:p-6 relative overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, rgba(255, 20, 147, 0.3) 0%, rgba(138, 43, 226, 0.3) 100%)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#ffffff" }}>
                    스마트 팀 매칭
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    내 위치와 실력 데이터에 딱 맞는 최적의 팀을 추천받고 바로 합류하세요.
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl">👥</div>
              </div>
            </div>

            {/* 카드 3 */}
            <div 
              className="rounded-xl p-5 sm:p-6 relative overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, rgba(0, 100, 0, 0.3) 0%, rgba(0, 128, 128, 0.3) 100%)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#ffffff" }}>
                    한눈에 보는 일정
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    캘린더 연동으로 모든 경기 일정을 체크하고 멤버들의 참석 여부를 확인하세요.
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl">📅</div>
              </div>
            </div>

            {/* 카드 4 */}
            <div 
              className="rounded-xl p-5 sm:p-6 relative overflow-hidden"
              style={{ 
                background: "linear-gradient(135deg, rgba(25, 25, 112, 0.4) 0%, rgba(72, 61, 139, 0.3) 100%)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#ffffff" }}>
                    다양한 종목의 스포츠
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                    종목과 실력에 상관없이 운동을 사랑하는 플레이어라면 누구나 환영합니다.
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl">⚙️</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 띠 배너 - 고정 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 py-5 px-4" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0) 100%)" }}>
        <div className="max-w-sm mx-auto flex flex-col items-center text-center gap-3">
          <div>
            <p className="font-bold text-base sm:text-lg" style={{ color: "#ffffff" }}>
              <span style={{ color: "#ffffff" }}>₩1,000</span>으로 만날 수 있는 플레이그라운드.
            </p>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              가장 경제적인 아마추어 스포츠 플랫폼을 이용해 보세요.
            </p>
          </div>
          <Link
            href="/payment"
            className="px-6 py-2.5 rounded-md text-sm font-semibold transition-colors hover:bg-white/10 border"
            style={{ color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.4)" }}
          >
            자세히 알아보기
          </Link>
        </div>
      </div>
    </div>
  );
}
