"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, Users, BarChart2, ArrowRight, Search, Zap, Shield, Check, Newspaper, Trophy, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const news = [
  { title: "2026 밀라노-코르티나 동계올림픽, 산시로에서 화려한 개막", time: "3시간 전", source: "연합뉴스", image: "/article_1.png" },
  { title: "김도윤, 스노보드 평행대회전 준결승 진출 쾌거", time: "5시간 전", source: "OSEN", image: "/article_2.png" },
  { title: "쇼트트랙 혼성 계주, 금메달 향한 거침없는 질주", time: "1일 전", source: "스포탈코리아", image: "/article_3.png" },
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

function NewsCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % news.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const item = news[current];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Newspaper size={16} className="text-fuchsia-400" />
        <h2 className="text-sm font-semibold text-white">스포츠 뉴스</h2>
      </div>
      <div
        className="relative rounded-2xl overflow-hidden aspect-[21/9] cursor-pointer"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* 텍스트 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <p className="text-white font-bold text-xl leading-snug">{item.title}</p>
          <span className="text-xs text-white/50">{item.time}</span>
        </div>

        {/* 인디케이터 도트 */}
        <div className="absolute bottom-5 right-6 flex items-center gap-2">
          {news.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${i === current
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
              aria-label={`뉴스 ${i + 1}번으로 이동`}
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

  if (user) return <LoggedInHome name={user.name} recentTeams={recentTeams} topMatchTeams={topMatchTeams} />;
  return <LandingHome recentTeams={recentTeams} topMatchTeams={topMatchTeams} />;
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

function LoggedInHome({ name, recentTeams, topMatchTeams }: { name: string; recentTeams: any[]; topMatchTeams: any[] }) {
  return (
    <div className="max-w-5xl mx-auto space-y-14">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center pt-14 space-y-6">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #c026d3, #7c3aed)" }} />
        <h1 className="relative text-8xl font-black tracking-tighter text-white cursor-pointer" onClick={() => window.location.reload()}>PLAYGROUND</h1>
        <p className="text-gray-400 text-lg">환영합니다, <span className="text-white font-semibold">{name}</span>님 ⚽</p>

        {/* 퀵 액션 버튼 */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link href="/clubs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
          >
            <Search size={14} /> 클럽 탐색
          </Link>
          <Link href="/clubs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors border"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            <Swords size={14} /> 경기 제안
          </Link>
          <Link href="/video"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors border"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            <Zap size={14} /> AI 분석
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ target, suffix, label }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
            <p className="text-2xl font-black text-white"><CountUp target={target} suffix={suffix} /></p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* KJA 배너 */}
      <KJABanner />

      {/* 이번달 최다 경기 팀 */}
      {topMatchTeams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} className="text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-white">이번달 HOT 클럽</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {topMatchTeams.map((t, i) => (
              <Link key={t.clubId} href={`/clubs/${t.clubId}`}
                className="relative flex items-center gap-3 rounded-xl p-4 border transition-all hover:border-fuchsia-500/40 group overflow-hidden cursor-pointer"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <div className="absolute top-3 right-3 text-xs font-black opacity-10 text-white text-4xl leading-none">#{i + 1}</div>
                <div className="w-10 h-10 rounded-xl border border-fuchsia-500/30 overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                  {t.image
                    ? <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    : <Shield size={18} className="text-fuchsia-400/60" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{t.name}</p>
                  <p className="text-fuchsia-400 text-xs">{t.sport}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 최근 등록된 팀 */}
      {recentTeams.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">최근 등록</h2>
          <div className="overflow-hidden relative">
            <div className="flex gap-6 animate-marquee w-max">
              {[...recentTeams, ...recentTeams].map((t, i) => (
                <div key={`${t.clubId}-${i}`} className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-20 h-20 rounded-full border-2 border-fuchsia-500/40 overflow-hidden bg-white/5 flex items-center justify-center">
                    {t.image ? (
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={32} className="text-fuchsia-400/40" />
                    )}
                  </div>
                  <span className="text-xs text-fuchsia-400 font-medium">{t.sport}</span>
                  <span className="text-xs text-white text-center leading-tight">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 스포츠 뉴스 */}
      <NewsCarousel />

      {/* Feature Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {features.map(({ href, icon: Icon, badge, title, desc, color }) => (
          <Link
            key={title}
            href={href}
            className="relative bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 hover:bg-white/8 transition-all group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none"
              style={{ background: color, transform: "translate(30%, -30%)" }} />
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${color}15`, color }}>
                {badge}
              </span>
            </div>
            <h2 className="text-white font-semibold text-sm">{title}</h2>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LandingHome({ recentTeams, topMatchTeams }: { recentTeams: any[]; topMatchTeams: any[] }) {
  return (
    <div className="max-w-5xl mx-auto space-y-14">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center pt-14 space-y-6">
        {/* 배경 글로우 */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #c026d3, #7c3aed)" }} />

        <h1 className="relative text-8xl font-black tracking-tighter text-white cursor-pointer" onClick={() => window.location.reload()}>PLAYGROUND</h1>

        <p className="text-gray-400 text-lg whitespace-nowrap">선수를 위한 클럽 매칭 · 팀 관리 · AI 분석 플랫폼</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ target, suffix, label }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
            <p className="text-2xl font-black text-white"><CountUp target={target} suffix={suffix} /></p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* KJA 배너 */}
      <KJABanner />

      {/* 최근 등록된 팀 */}
      {recentTeams.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">최근 등록</h2>
          <div className="overflow-hidden relative">
            <div className="flex gap-6 animate-marquee w-max">
              {[...recentTeams, ...recentTeams].map((t, i) => (
                <div key={`${t.clubId}-${i}`} className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-20 h-20 rounded-full border-2 border-fuchsia-500/40 overflow-hidden bg-white/5 flex items-center justify-center">
                    {t.image ? (
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={32} className="text-fuchsia-400/40" />
                    )}
                  </div>
                  <span className="text-xs text-fuchsia-400 font-medium">{t.sport}</span>
                  <span className="text-xs text-white text-center leading-tight">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 스포츠 뉴스 */}
      {/* <NewsCarousel /> */}

      {/* Pricing */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">요금제</h2>
          <p className="text-gray-500 text-sm mt-1">팀 규모에 맞는 플랜을 선택하세요</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name}
              className="relative rounded-xl p-6 flex flex-col gap-4"
              style={plan.highlight
                ? { background: "linear-gradient(135deg, rgba(192,38,211,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(192,38,211,0.4)" }
                : { background: "var(--card-bg)", border: "1px solid var(--card-border)" }
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}>추천</span>
              )}
              <div>
                <p className="text-gray-400 text-xs font-medium">{plan.name}</p>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm mb-0.5">{plan.period}</span>}
                </div>
                <p className="text-gray-500 text-xs mt-1">{plan.desc}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                    <Check size={12} className="text-fuchsia-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "베이직" ? "/signup" : `/payment?plan=${plan.name}`}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white text-center transition-opacity hover:opacity-90"
                style={plan.highlight
                  ? { background: "linear-gradient(to right, #c026d3, #7c3aed)" }
                  : { background: "var(--chip-inactive-bg)" }
                }
              >{plan.cta}</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative rounded-2xl overflow-hidden p-8 text-center"
        style={{ background: "linear-gradient(135deg, rgba(192,38,211,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(192,38,211,0.2)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #c026d3 0%, transparent 50%), radial-gradient(circle at 80% 50%, #7c3aed 0%, transparent 50%)" }} />
        <div className="relative space-y-3">
          <div className="flex justify-center gap-2 mb-2">
            <Zap size={16} className="text-fuchsia-400" />
            <Shield size={16} className="text-violet-400" />
          </div>
          <h3 className="text-white font-bold text-xl">지금 바로 시작하세요</h3>
          <p className="text-gray-400 text-sm">클럽을 찾고, 경기를 잡고, AI로 분석하세요</p>
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 font-semibold px-8 py-2.5 rounded-full text-white mt-2 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, #c026d3, #7c3aed)" }}
          >
            클럽 탐색 시작 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
