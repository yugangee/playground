"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Users, BarChart2, ArrowRight, Search, Zap, Shield, Check, Trophy, Swords, Calendar, Wallet, Play, Eye, MessageCircle, Heart, TrendingUp, Bell, MapPin, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { manageFetch } from "@/lib/manageFetch";

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
    title: "제52회 한국기자협회 서울지역 축구대회",
    status: "모집중",
    date: "2026.04.18 - 04.25",
    teams: "52개팀",
    image: "/kja-tournament.png"
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
    color: "#6366F1",
  },
  {
    href: "/finance",
    icon: Users,
    badge: "팀",
    title: "팀 매니지먼트",
    desc: "스마트 팀 매니지먼트",
    color: "#2563EB",
  },
  {
    href: "/report",
    icon: ShoppingCart,
    badge: "AI",
    title: "AI 리포트",
    desc: "선수 개인 분석 리포트",
    color: "#7C3AED",
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
    ? { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" }
    : item.status === "모집중"
    ? { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE" }
    : { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0" };

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer card-hover"
      style={{ background: "var(--card-bg)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-[21/9] sm:aspect-[3/1]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "#F1F5F9" }} />
        )}

        {/* 인디케이터 도트 */}
        {tournaments.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            {tournaments.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-300"
                style={i === current
                  ? { width: "16px", height: "4px", background: "#ffffff" }
                  : { width: "4px", height: "4px", background: "rgba(255,255,255,0.5)" }
                }
                aria-label={`대회 ${i + 1}번으로 이동`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: statusColor.bg, color: statusColor.text }}
          >
            {item.status}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.date}</span>
        </div>
        <p className="text-sm leading-snug">
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.title}</span>
          <span style={{ color: "var(--text-muted)" }}> · {item.teams}</span>
        </p>
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

    fetch(`${API}/clubs`)
      .then(r => r.json())
      .then(d => setTopMatchTeams(d.clubs || []))
      .catch(() => { });
  }, []);

  if (loading) return <div className="flex items-center justify-center pt-32"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <LoggedInHome
        user={user}
        name={user?.name || "게스트"}
        recentTeams={recentTeams}
        topMatchTeams={topMatchTeams}
      />
    </>
  );
}

function KJABanner() {
  return (
    <Link href="/league/kja-51">
      <div className="rounded-2xl overflow-hidden cursor-pointer group card-hover"
        style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#FEF3C7" }}>
              <Trophy size={20} style={{ color: "#D97706" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                  style={{ background: "#DBEAFE", color: "#2563EB" }}>데모</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                  style={{ background: "#F3E8FF", color: "#7C3AED" }}>서울경제 4시드</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>제51회 한국기자협회 서울지역 축구대회</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>52개팀 · 57경기 · 서울경제 어벤져스 선수단 20명</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium shrink-0"
            style={{ color: "#6366F1" }}>
            대진표 보기 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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

function LoggedInHome({ user, name, recentTeams: initialRecent, topMatchTeams: initialTop }: { user: any; name: string; recentTeams: any[]; topMatchTeams: any[] }) {
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

  // 개인화 데이터
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<any[]>([]);
  const [myTeamName, setMyTeamName] = useState<string>("");
  const [personalLoading, setPersonalLoading] = useState(false);

  // 사용자 팀 데이터 로드
  useEffect(() => {
    const loadPersonalData = async () => {
      const teamId = user?.teamId || (user?.teamIds && user.teamIds[0]);
      if (!teamId) return;

      setPersonalLoading(true);
      try {
        // 팀 정보 가져오기
        const API = process.env.NEXT_PUBLIC_API_URL;
        const clubsRes = await fetch(`${API}/clubs`);
        const clubsData = await clubsRes.json();
        const myClub = (clubsData.clubs || []).find((c: any) => c.clubId === teamId);
        if (myClub) setMyTeamName(myClub.name);

        // 내 팀 경기 일정
        const matches = await manageFetch(`/schedule/matches?teamId=${teamId}`);
        setMyMatches(Array.isArray(matches) ? matches : []);

        // 내 팀 공지사항
        const announcements = await manageFetch(`/schedule/announcements?teamId=${teamId}`);
        setMyAnnouncements(Array.isArray(announcements) ? announcements : []);
      } catch (e) {
        console.error("Failed to load personal data:", e);
      } finally {
        setPersonalLoading(false);
      }
    };

    if (user) loadPersonalData();
  }, [user]);

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

  // 목업 데이터 (KJA 52회 기자협회 축구대회)
  const mockMatches = [
    {
      id: "mock-1",
      scheduledAt: "2026-04-18T10:00:00",
      homeTeamId: "sedaily",
      awayTeamId: "hanskyung",
      homeTeamName: "서울경제",
      awayTeamName: "한스경제",
      venue: "목동종합운동장 보조구장",
      status: "accepted",
      matchType: "match",
      myAttendance: "attending",
      round: "19조 예선"
    },
    {
      id: "mock-2",
      scheduledAt: "2026-04-25T14:00:00",
      homeTeamId: "sedaily",
      awayTeamId: "tbd",
      homeTeamName: "서울경제",
      awayTeamName: "16강 상대 (미정)",
      venue: "목동종합운동장",
      status: "pending",
      matchType: "match",
      myAttendance: null,
      round: "16강"
    },
    {
      id: "mock-3",
      scheduledAt: "2026-04-12T19:00:00",
      homeTeamId: "sedaily",
      awayTeamId: "internal",
      homeTeamName: "서울경제",
      awayTeamName: "자체 훈련",
      venue: "양재시민의숲 풋살장",
      status: "accepted",
      matchType: "training",
      myAttendance: "pending",
      round: "대회 준비 훈련"
    }
  ];

  const mockAnnouncements = [
    {
      id: "ann-1",
      title: "4/18(금) 예선전 집합 안내",
      content: "목동종합운동장 보조구장 오전 9시 집합입니다. 유니폼(홈), 축구화, 정강이 보호대 필수 지참 바랍니다. 주차는 운동장 내 가능합니다.",
      createdAt: "2026-04-10T09:00:00",
      authorId: "manager",
      authorName: "김총무"
    },
    {
      id: "ann-2",
      title: "대회 참가비 납부 안내",
      content: "제52회 한국기자협회 축구대회 참가비 5만원 납부 부탁드립니다. 계좌: 신한은행 110-xxx-xxxxxx (서울경제축구회)",
      createdAt: "2026-04-08T14:00:00",
      authorId: "manager",
      authorName: "이회계"
    },
    {
      id: "ann-3",
      title: "신규 유니폼 수령 안내",
      content: "새 유니폼이 도착했습니다. 4/12 훈련 시 배포 예정이니 참석 부탁드립니다. 사이즈 변경 필요하신 분은 미리 연락 주세요.",
      createdAt: "2026-04-05T11:00:00",
      authorId: "manager",
      authorName: "김총무"
    },
    {
      id: "ann-4",
      title: "4월 정기 회식 안내",
      content: "4/20(일) 예선전 종료 후 회식 예정입니다. 장소는 목동역 근처 삼겹살집으로 예약해두었습니다.",
      createdAt: "2026-04-03T16:00:00",
      authorId: "manager",
      authorName: "박회장"
    },
    {
      id: "ann-5",
      title: "주차권 배부 안내",
      content: "대회 기간 중 목동운동장 주차권을 배부합니다. 필요하신 분은 총무에게 연락 주세요.",
      createdAt: "2026-04-01T10:00:00",
      authorId: "manager",
      authorName: "김총무"
    }
  ];

  // 실제 데이터가 없으면 목업 사용
  const displayMatches = myMatches.length > 0 ? myMatches : mockMatches;
  const displayAnnouncements = myAnnouncements.length > 0 ? myAnnouncements : mockAnnouncements;
  const displayTeamName = myTeamName || "서울경제 어벤져스";

  // 이번주 내 경기 필터링
  const now = new Date();
  const upcomingMatches = displayMatches
    .filter((m: any) => {
      const matchDate = new Date(m.scheduledAt);
      return matchDate >= now && m.status !== 'completed';
    })
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  // 로그인 사용자면 개인화 섹션 표시 (팀 유무와 관계없이 목업으로 보여줌)
  const showPersonalSection = !!user;


  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* 진행중인 대회 */}
      <TournamentCarousel />

      {/* 로그인 사용자: 개인화 섹션 */}
      {showPersonalSection && (
        <>
          {/* 인사말 + 팀 정보 */}
          <div className="space-y-1">
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {getGreeting()}, {name}님
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {displayTeamName}
            </p>
          </div>

          {/* 다가오는 팀 경기 */}
          {upcomingMatches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: "#4F46E5" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>다가오는 {displayTeamName} 경기</h2>
                </div>
                <Link href="/schedule" className="text-xs font-medium flex items-center gap-1" style={{ color: "#6366F1" }}>
                  전체보기 <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {upcomingMatches.map((match: any, i: number) => {
                  const matchDate = new Date(match.scheduledAt);
                  const isTraining = match.matchType === 'training';
                  const opponentName = match.awayTeamName || '상대팀';
                  const dateStr = `${String(matchDate.getMonth() + 1).padStart(2, '0')}.${String(matchDate.getDate()).padStart(2, '0')}`;
                  const timeStr = matchDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <Link key={match.id || i} href="/schedule">
                      <div className="rounded-xl p-4 h-full cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        {/* 상단: 날짜 시간 상태 장소 */}
                        <div className="flex items-center gap-2 mb-3 text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                          <span>{dateStr}</span>
                          <span>{timeStr}</span>
                          <span className="px-2 py-0.5 rounded text-[10px]" style={{
                            background: isTraining ? "#EEF2FF" : match.status === 'accepted' ? "#D1FAE5" : "#FEF3C7",
                            color: isTraining ? "#4F46E5" : match.status === 'accepted' ? "#059669" : "#D97706"
                          }}>
                            {isTraining ? '훈련' : match.status === 'accepted' ? '확정' : '대기'}
                          </span>
                          {match.venue && (
                            <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{match.venue.split(' ')[0]}</span>
                          )}
                        </div>

                        {/* 하단: 팀 정보 */}
                        <div className="space-y-1">
                          <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {isTraining ? (match.title || '훈련') : displayTeamName}
                          </div>
                          {!isTraining && (
                            <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                              {opponentName}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 내팀 공지 */}
          {displayAnnouncements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={15} style={{ color: "#D97706" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>내 팀 공지</h2>
                </div>
                <Link href="/schedule" className="text-xs font-medium flex items-center gap-1" style={{ color: "#6366F1" }}>
                  전체보기 <ArrowRight size={12} />
                </Link>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                {[...displayAnnouncements]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 3)
                  .map((ann: any, i: number, arr: any[]) => (
                  <Link key={ann.id || i} href="/schedule">
                    <div
                      className="px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--card-border)" : "none" }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-[13px] font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>{ann.title}</h3>
                        <span className="text-[11px] shrink-0" style={{ color: "var(--text-muted)" }}>
                          {new Date(ann.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }).replace('.', '/').replace('.', '')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {displayAnnouncements.length > 3 && (
                  <Link href="/schedule">
                    <div className="px-4 py-2.5 text-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" style={{ borderTop: "1px solid var(--card-border)" }}>
                      <span className="text-xs font-medium" style={{ color: "#6366F1" }}>
                        +{displayAnnouncements.length - 3}개 더보기
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {/* 이번주 경기 - 비로그인 사용자만 */}
      {!user && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: "var(--text-muted)" }} />
              <h2 className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>이번주 경기</h2>
            </div>
            <div className="flex gap-1">
              {["전체", "서울", "경기", "인천"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                  style={region === r
                    ? { background: "#4F46E5", color: "#ffffff" }
                    : { background: "transparent", color: "var(--text-muted)" }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Link href="/league" className="hidden sm:flex text-xs font-medium items-center gap-1 transition-colors hover:opacity-70" style={{ color: "#6366F1" }}>
            전체보기 <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[
            { home: "서울경제", away: "한스경제", round: "19조", datetime: "04.18 10:00", location: "목동", region: "서울", dateObj: new Date("2026-04-18T10:00"), tournament: "KJA 52회" },
            { home: "조선일보", away: "YTN", round: "1조", datetime: "04.18 08:00", location: "목동", region: "서울", dateObj: new Date("2026-04-18T08:00"), tournament: "KJA 52회" },
            { home: "한국경제신문", away: "MBC", round: "2조", datetime: "04.18 09:00", location: "목동", region: "서울", dateObj: new Date("2026-04-18T09:00"), tournament: "KJA 52회" },
            { home: "동아일보", away: "뉴데일리", round: "7조", datetime: "04.18 11:00", location: "목동", region: "서울", dateObj: new Date("2026-04-18T11:00"), tournament: "KJA 52회" },
            { home: "중앙일보", away: "JTBC", round: "11조", datetime: "04.18 14:00", location: "목동", region: "서울", dateObj: new Date("2026-04-18T14:00"), tournament: "KJA 52회" },
            { home: "SBS", away: "국민일보", round: "14조", datetime: "04.19 08:00", location: "목동", region: "서울", dateObj: new Date("2026-04-19T08:00"), tournament: "KJA 52회" },
            { home: "KBS", away: "뉴시스", round: "17조", datetime: "04.19 09:00", location: "목동", region: "서울", dateObj: new Date("2026-04-19T09:00"), tournament: "KJA 52회" },
            { home: "MBN", away: "한겨레신문", round: "20조", datetime: "04.25 08:00", location: "목동", region: "서울", dateObj: new Date("2026-04-25T08:00"), tournament: "KJA 52회" },
          ]
            .filter((match) => region === "전체" || match.region === region)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .map((match, i) => (
              <Link key={i} href="/league/kja-51">
                <div className="flex-shrink-0 w-52 rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                        {match.round}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{match.tournament}</span>
                    </div>
                    <div className="text-center">
                      <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                        {match.datetime} · {match.location}
                      </div>
                    </div>
                    <div className="pt-3 space-y-2">
                      <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{match.home}</div>
                      <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>vs</div>
                      <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{match.away}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
      )}

      {/* 팀 관리 퀵 액션 */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>팀 관리</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/schedule">
            <div className="rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                  <Calendar size={20} style={{ color: "#4F46E5" }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>일정 관리</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>경기·훈련</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/manage/team">
            <div className="rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#ECFDF5" }}>
                  <Users size={20} style={{ color: "#059669" }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>선수 관리</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>멤버·출석</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/finance">
            <div className="rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                  <Wallet size={20} style={{ color: "#D97706" }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>회비 관리</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>수입·지출</div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/manage/league">
            <div className="rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
                  <Trophy size={20} style={{ color: "#7C3AED" }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>대회 관리</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>리그·토너먼트</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 하이라이트 영상 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>하이라이트</h2>
          <Link href="/community?tab=축구" className="text-xs font-medium flex items-center gap-1" style={{ color: "#6366F1" }}>
            더보기 <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: "환상적인 중거리 슛", player: "김민수", team: "강남 FC", views: 12340 },
            { title: "역전 결승골 순간", player: "최영훈", team: "서초 유나이티드", views: 23410 },
            { title: "3점슛 연속 성공", player: "박준혁", team: "마포 드래곤즈", views: 8920 },
            { title: "완벽한 스매시", player: "이서연", team: "강남 셔틀콕", views: 6540 },
          ].map((video, i) => (
            <Link key={i} href="/community">
              <div className="rounded-xl overflow-hidden cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="aspect-video flex items-center justify-center relative" style={{ background: "#F1F5F9" }}>
                  <Play size={24} style={{ color: "#94A3B8" }} />
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                    <Eye size={9} />
                    <span>{(video.views / 1000).toFixed(1)}K</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{video.title}</h3>
                  <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{video.player} · {video.team}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 인기글 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>인기글</h2>
          <Link href="/community?tab=자유게시판" className="text-xs font-medium flex items-center gap-1" style={{ color: "#6366F1" }}>
            더보기 <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "4-3-3 포메이션 완벽 가이드", author: "전술매니아", comments: 45, likes: 189, category: "축구", hot: true },
            { title: "운동 후 단백질 보충 어떻게 하세요?", author: "헬스초보", comments: 67, likes: 234, category: "자유게시판", hot: true },
            { title: "강남구 구장 상태 어떤가요?", author: "뉴비", comments: 23, likes: 45, category: "우리동네", hot: false },
            { title: "농구 슛 폼 교정 팁", author: "농구코치", comments: 35, likes: 145, category: "농구", hot: true },
          ].map((post, i) => (
            <Link key={i} href={`/community?tab=${post.category}`}>
              <div className="rounded-2xl p-4 cursor-pointer card-hover" style={{ background: "var(--card-bg)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                <div className="flex items-center gap-2 mb-2">
                  {post.hot && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: "#FEE2E2", color: "#DC2626" }}>인기</span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F1F5F9", color: "#64748B" }}>{post.category}</span>
                </div>
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{post.author}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                    <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

