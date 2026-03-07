"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Play, Clock, Eye, Heart, ChevronRight,
  Search, PenLine, Users, Calendar, Shield, X,
  Trophy, CheckCircle, Inbox, SlidersHorizontal, Zap,
} from "lucide-react";

// ─── 상수 ───────────────────────────────────────────────────────────────
const TABS = ["우리동네", "자유게시판", "축구", "풋살", "농구", "야구", "배드민턴", "테니스", "마켓"];

const TAB_LABEL: Record<string, string> = {
  우리동네: "📍 우리동네",
  자유게시판: "💬 자유게시판",
  축구: "⚽ 축구",
  풋살: "🥅 풋살",
  농구: "🏀 농구",
  야구: "⚾ 야구",
  배드민턴: "🏸 배드민턴",
  테니스: "🎾 테니스",
  마켓: "🛍️ 마켓",
};

const SPORT_COLOR: Record<string, string> = {
  축구: "#3b82f6",
  풋살: "#8b5cf6",
  농구: "#f97316",
  야구: "#14b8a6",
  배드민턴: "#ec4899",
  테니스: "#eab308",
};

const MY_REGIONS = ["강남구", "서초구", "마포구"];
const RANK_MEDAL = ["🥇", "🥈", "🥉"];

// ─── Mock 데이터 ────────────────────────────────────────────────────────
const mockHighlights = [
  { id: 1, title: "환상적인 중거리 슛!", player: "김민수", team: "강남 FC", views: 12340, likes: 892 },
  { id: 2, title: "수비수 3명 제치고 골!", player: "이준호", team: "서초 유나이티드", views: 9870, likes: 654 },
  { id: 3, title: "역대급 프리킥 골", player: "박성진", team: "수원 블루윙즈", views: 7560, likes: 521 },
  { id: 4, title: "역전 결승골 순간", player: "최영훈", team: "강남 FC", views: 23410, likes: 1832 },
];
const mockSportPosts = [
  { id: 1, title: "4-3-3 포메이션 완벽 가이드", author: "전술매니아", comments: 45, likes: 189, hot: true, sport: "축구" },
  { id: 2, title: "어제 경기 하이라이트 분석", author: "축구박사", comments: 32, likes: 156, hot: true, sport: "축구" },
  { id: 3, title: "새로 나온 축구화 실착 리뷰", author: "장비덕후", comments: 52, likes: 234, hot: true, sport: "축구" },
  { id: 4, title: "풋살 기본기 연습법", author: "풋살러", comments: 28, likes: 98, hot: false, sport: "풋살" },
  { id: 5, title: "농구 슛 폼 교정 팁", author: "농구코치", comments: 35, likes: 145, hot: true, sport: "농구" },
];
const mockFreePosts = [
  { id: 1, title: "운동 후 단백질 보충 어떻게 하세요?", author: "헬스초보", comments: 67, likes: 234, hot: true },
  { id: 2, title: "주말에 같이 운동하실 분!", author: "운동좋아", comments: 23, likes: 45, hot: false },
  { id: 3, title: "운동화 추천 부탁드려요", author: "뉴비", comments: 41, likes: 89, hot: false },
  { id: 4, title: "다이어트 식단 공유합니다", author: "다이어터", comments: 89, likes: 312, hot: true },
];
const mockMercenary = [
  { id: 1, location: "강남구", sport: "풋살", time: "오늘 19:00", needed: 1, venue: "강남 풋살파크", urgent: true },
  { id: 2, location: "마포구", sport: "농구", time: "오늘 20:00", needed: 2, venue: "마포 체육관", urgent: true },
  { id: 3, location: "서초구", sport: "축구", time: "내일 14:00", needed: 3, venue: "서초 운동장", urgent: false },
];
const mockVenues = [
  { id: 1, name: "강남 스포츠센터", distance: "0.5km", available: true, price: "3만원/시간" },
  { id: 2, name: "역삼 풋살장", distance: "0.8km", available: true, price: "2.5만원/시간" },
  { id: 3, name: "선릉 테니스장", distance: "1.2km", available: false, price: "2만원/시간" },
];
const mockLocalPosts = [
  { id: 1, title: "강남구 구장 상태 어떤가요?", author: "뉴비", location: "강남구", comments: 23, time: "10분 전" },
  { id: 2, title: "우리 동네 축구 크루 모집합니다", author: "강남FC대장", location: "강남구", comments: 45, time: "30분 전" },
  { id: 3, title: "서초구 주말 농구 정모", author: "농구러버", location: "서초구", comments: 18, time: "1시간 전" },
];

type Schedule = { id: number; title: string; date: string; time: string; venue: string; participants: number; max: number; sport: string };
const mockSchedules: Record<string, Schedule[]> = {
  강남구: [
    { id: 1, title: "강남 주말 풋살 정기전", date: "3/9(일)", time: "10:00", venue: "강남 풋살파크", participants: 9, max: 10, sport: "풋살" },
    { id: 2, title: "역삼 5vs5 축구 매치", date: "3/10(월)", time: "19:30", venue: "역삼 운동장", participants: 6, max: 10, sport: "축구" },
  ],
  서초구: [{ id: 3, title: "서초 농구 정모", date: "3/9(일)", time: "14:00", venue: "서초 체육관", participants: 7, max: 10, sport: "농구" }],
  마포구: [
    { id: 4, title: "마포 풋살 오픈런", date: "3/8(토)", time: "18:00", venue: "마포 풋살장", participants: 10, max: 10, sport: "풋살" },
    { id: 5, title: "합정 배드민턴 클럽", date: "3/11(화)", time: "20:00", venue: "합정 체육관", participants: 3, max: 8, sport: "배드민턴" },
  ],
};

type Team = { id: number; name: string; level: string; ageRange: string; location: string; members: number; max: number; description: string; sport: string };
const mockTeams: Team[] = [
  { id: 1, name: "강남FC 서브팀", level: "중급", ageRange: "20~35세", location: "강남·서초", members: 14, max: 18, description: "주 1회 정기전 + 대회 참가 팀입니다.", sport: "축구" },
  { id: 2, name: "직장인 축구 크루 K-11", level: "입문~초급", ageRange: "25~45세", location: "강남구", members: 9, max: 16, description: "직장인 대상 부담없는 주말 크루.", sport: "축구" },
  { id: 3, name: "선릉 풋살 클럽", level: "중급", ageRange: "20~35세", location: "강남·송파", members: 11, max: 14, description: "평일 저녁 정기 풋살팀 모집 중.", sport: "풋살" },
  { id: 4, name: "마포 훅 & 런", level: "초급~중급", ageRange: "20~40세", location: "마포구", members: 6, max: 12, description: "매주 토요일 오전 정기 농구 모임.", sport: "농구" },
  { id: 5, name: "강남 셔틀콕 클럽", level: "중급 이상", ageRange: "제한없음", location: "강남구", members: 8, max: 12, description: "화·목 저녁 복식 위주 클럽.", sport: "배드민턴" },
];

type PlayerRank = { rank: number; name: string; team: string; stat: string; statLabel: string };
const mockPlayerRanks: Record<string, PlayerRank[]> = {
  축구: [
    { rank: 1, name: "김민수", team: "강남 FC", stat: "12", statLabel: "골" },
    { rank: 2, name: "이준호", team: "서초 유나이티드", stat: "9", statLabel: "골" },
    { rank: 3, name: "박성진", team: "수원 블루윙즈", stat: "7", statLabel: "골" },
    { rank: 4, name: "최영훈", team: "강남 FC", stat: "6", statLabel: "골" },
    { rank: 5, name: "정대현", team: "마포 FC", stat: "5", statLabel: "골" },
  ],
  풋살: [
    { rank: 1, name: "한지훈", team: "선릉 풋살 클럽", stat: "18", statLabel: "골" },
    { rank: 2, name: "오세민", team: "역삼 킥오프", stat: "14", statLabel: "골" },
    { rank: 3, name: "강동원", team: "강남 풋살파크", stat: "11", statLabel: "골" },
  ],
  농구: [
    { rank: 1, name: "윤태양", team: "마포 훅 & 런", stat: "28.4", statLabel: "평균pts" },
    { rank: 2, name: "서준혁", team: "서초 볼러스", stat: "22.1", statLabel: "평균pts" },
    { rank: 3, name: "임도현", team: "강남 훅샷", stat: "19.7", statLabel: "평균pts" },
  ],
  야구: [],
  배드민턴: [
    { rank: 1, name: "권나연", team: "강남 셔틀콕", stat: "24", statLabel: "승" },
    { rank: 2, name: "홍성민", team: "서초 라켓", stat: "20", statLabel: "승" },
  ],
  테니스: [],
};

type TeamRank = { rank: number; name: string; wins: number; draws: number; losses: number; pts: number };
const mockTeamRanks: Record<string, TeamRank[]> = {
  강남구: [
    { rank: 1, name: "강남 FC", wins: 8, draws: 2, losses: 1, pts: 26 },
    { rank: 2, name: "서초 유나이티드", wins: 7, draws: 1, losses: 3, pts: 22 },
    { rank: 3, name: "역삼 킥오프", wins: 5, draws: 3, losses: 3, pts: 18 },
    { rank: 4, name: "강남 풋살파크", wins: 4, draws: 2, losses: 5, pts: 14 },
  ],
  서초구: [
    { rank: 1, name: "서초 볼러스", wins: 9, draws: 1, losses: 1, pts: 28 },
    { rank: 2, name: "방배 러너스", wins: 6, draws: 2, losses: 3, pts: 20 },
  ],
  마포구: [
    { rank: 1, name: "마포 FC", wins: 7, draws: 3, losses: 1, pts: 24 },
    { rank: 2, name: "합정 유나이티드", wins: 5, draws: 2, losses: 4, pts: 17 },
    { rank: 3, name: "홍대 킥스", wins: 4, draws: 1, losses: 6, pts: 13 },
  ],
};

// ─── 공통 컴포넌트 ───────────────────────────────────────────────────────

function SectionHeader({ icon, title, action }: { icon?: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: "var(--text-muted)" }}>{icon}</span>}
        <h2 className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--text-muted)" }}>{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function MoreLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }}>
      전체보기 <ChevronRight size={13} />
    </Link>
  );
}

function MemberBar({ cur, max }: { cur: number; max: number }) {
  const full = cur >= max;
  const pct = Math.min(Math.round((cur / max) * 100), 100);
  const barColor = full ? "var(--text-muted)" : pct >= 80 ? "#f97316" : "var(--btn-solid-bg)";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between" style={{ color: "var(--text-muted)" }}>
        <span className="text-xs flex items-center gap-1"><Users size={11} />{cur}/{max}명</span>
        <span className="text-xs font-medium" style={{ color: pct >= 80 && !full ? "#f97316" : "var(--text-muted)" }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 rounded-2xl"
      style={{ color: "var(--text-muted)", background: "var(--card-bg)", border: "1px dashed var(--card-border)" }}>
      <Inbox size={32} strokeWidth={1.2} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function HotBadge() {
  return (
    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md"
      style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>HOT</span>
  );
}

function SportBadge({ sport }: { sport: string }) {
  const color = SPORT_COLOR[sport];
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
      style={color
        ? { background: `${color}18`, color, border: `1px solid ${color}30` }
        : { background: "var(--card-border)", color: "var(--text-muted)" }}>
      {TAB_LABEL[sport]?.split(" ")[0]} {sport}
    </span>
  );
}

function SegmentControl<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden p-0.5 gap-0.5" style={{ background: "var(--card-border)" }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
          style={value === o.key
            ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
            : { color: "var(--text-muted)" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SolidBtn({ children, onClick, disabled, fullWidth }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; fullWidth?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`${fullWidth ? "w-full" : ""} py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95`}
      style={disabled
        ? { background: "var(--card-border)", color: "var(--text-muted)", cursor: "not-allowed" }
        : { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>
      {children}
    </button>
  );
}

// ─── 카드 컴포넌트 ───────────────────────────────────────────────────────

function TeamCard({ team }: { team: Team }) {
  const full = team.members >= team.max;
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{team.name}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{team.location} · {team.ageRange}</p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: "var(--card-border)", color: "var(--text-muted)" }}>{team.level}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{team.description}</p>
      <MemberBar cur={team.members} max={team.max} />
      <SolidBtn disabled={full} fullWidth>{full ? "모집 마감" : "가입 신청"}</SolidBtn>
    </div>
  );
}

function ScheduleCard({ s, onApply }: { s: Schedule; onApply: () => void }) {
  const full = s.participants >= s.max;
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-center justify-between">
        <SportBadge sport={s.sport} />
        {full && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
            style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>마감</span>
        )}
      </div>
      <p className="font-semibold text-sm leading-snug" style={{ color: "var(--text-primary)" }}>{s.title}</p>
      <div className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-2"><Clock size={12} />{s.date} {s.time}</div>
        <div className="flex items-center gap-2"><MapPin size={12} />{s.venue}</div>
      </div>
      <MemberBar cur={s.participants} max={s.max} />
      <SolidBtn disabled={full} onClick={onApply} fullWidth>{full ? "마감됨" : "참가 신청"}</SolidBtn>
    </div>
  );
}

function PostList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      {children}
    </div>
  );
}

function PostRow({ post, index, hot }: { post: { id: number; title: string; author: string; comments: number; likes: number }; index: number; hot?: boolean }) {
  return (
    <div className="px-5 py-4 flex items-center gap-4 cursor-pointer transition-opacity hover:opacity-70"
      style={{
        background: "var(--card-bg)",
        borderTop: index > 0 ? "1px solid var(--card-border)" : "none",
      }}>
      {hot && <HotBadge />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{post.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{post.author}</p>
      </div>
      <div className="flex gap-4 text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
        <span>댓글 {post.comments}</span>
        <span>좋아요 {post.likes}</span>
      </div>
    </div>
  );
}

// ─── 모달 ────────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

function ModalShell({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-full transition-opacity hover:opacity-60"
          style={{ background: "var(--card-border)" }}>
          <X size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
      {children}
    </div>
  );
}

function ReserveModal({ s, onClose }: { s: Schedule; onClose: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <ModalShell title="참가 신청" onClose={onClose}>
        {!done ? (
          <>
            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "var(--card-border)" }}>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.title}</p>
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}><Clock size={13} />{s.date} {s.time}</p>
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}><MapPin size={13} />{s.venue}</p>
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--text-muted)" }}><Users size={13} />잔여 {s.max - s.participants}자리</p>
            </div>
            <SolidBtn onClick={() => setDone(true)} fullWidth>신청 확정</SolidBtn>
          </>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4">
            <CheckCircle size={52} style={{ color: "var(--btn-solid-bg)" }} />
            <div className="text-center">
              <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>참가 신청 완료!</p>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{s.date} {s.time} · {s.venue}</p>
            </div>
            <SolidBtn onClick={onClose} fullWidth>확인</SolidBtn>
          </div>
        )}
      </ModalShell>
    </Overlay>
  );
}

function WriteModal({ tab, onClose }: { tab: string; onClose: () => void }) {
  const cats =
    tab === "우리동네" ? ["동네 게시판", "용병 급구", "경기 일정 등록", "팀·크루 모집"]
      : tab === "자유게시판" ? ["일반", "질문", "정보공유", "같이해요"]
        : [`${tab} 게시판`, "팀·크루 모집", "베스트 플레이"];
  const [cat, setCat] = useState(cats[0]);
  return (
    <Overlay onClose={onClose}>
      <ModalShell title="글쓰기" onClose={onClose}>
        <div className="flex gap-2 flex-wrap">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={cat === c
                ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                : { background: "var(--card-border)", color: "var(--text-muted)" }}>
              {c}
            </button>
          ))}
        </div>
        <input className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--card-border)", color: "var(--text-primary)" }} placeholder="제목" />
        <textarea className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: "var(--card-border)", color: "var(--text-primary)", minHeight: 110 }} placeholder="내용을 입력하세요" />
        <SolidBtn fullWidth>등록하기</SolidBtn>
      </ModalShell>
    </Overlay>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────
function CommunityContent() {
  const searchParams = useSearchParams();
  const tabRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState("우리동네");
  const [region, setRegion] = useState("강남구");
  const [rankTypeLocal, setRankTypeLocal] = useState<"team" | "player">("team");
  const [rankTypeSport, setRankTypeSport] = useState<"player" | "team">("player");
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [reserveTarget, setReserveTarget] = useState<Schedule | null>(null);

  const setSportRankType = (v: "player" | "team") => setRankTypeSport(v);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    const el = tabRef.current?.querySelector(`[data-tab="${tab}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [tab]);

  const isSport = !["자유게시판", "우리동네"].includes(tab);
  const filteredSportPosts = mockSportPosts.filter((p) => p.sport === tab && (!searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery)));
  const filteredFreePosts = mockFreePosts.filter((p) => !searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery));
  const schedules = mockSchedules[region] ?? [];
  const sportTeams = mockTeams.filter((t) => t.sport === tab);
  const localTeams = mockTeams.filter((t) => t.location.includes(region.replace("구", "")));
  const playerRanks = mockPlayerRanks[tab] ?? [];
  const teamRanks = mockTeamRanks[region] ?? [];

  return (
    <div className="max-w-7xl mx-auto pb-28">

      {/* ── 페이지 헤더 ── */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>커뮤니티</h1>
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input autoFocus className="text-sm outline-none bg-transparent w-36"
                style={{ color: "var(--text-primary)" }} placeholder="게시글 검색"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          ) : (
            <button className="p-2 rounded-xl transition-opacity hover:opacity-60"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
              onClick={() => setShowSearch(true)}>
              <Search size={17} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
          <button className="p-2 rounded-xl transition-opacity hover:opacity-60"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <SlidersHorizontal size={17} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
      </div>

      {/* ── 스티키 탭바 ─────────────────────────────────────────────────
           ★ 수정 포인트: rgba(255,255,255,…) → var(--card-bg)
           페이지 배경색 CSS 변수를 그대로 참조해 다크모드/커스텀 테마에서도 일치
      ─────────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 -mx-4 px-4"
        style={{
          background: "var(--card-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--card-border)",
        }}>
        <div ref={tabRef} className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t;
            const label = TAB_LABEL[t] ?? t;
            if (t === "마켓") return (
              <Link key={t} href="/market" data-tab={t}
                className="pb-3 pt-3 px-2 text-sm font-medium whitespace-nowrap shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-muted)" }}>{label}</Link>
            );
            return (
              <button key={t} data-tab={t} onClick={() => setTab(t)}
                className="pb-3 pt-3 px-2 text-sm font-medium whitespace-nowrap shrink-0 relative transition-colors"
                style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}>
                {label}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                    style={{ background: "var(--text-primary)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="space-y-14 pt-10">

        {/* ══════ 종목별 ══════ */}
        {isSport && (
          <>
            <section className="space-y-5">
              <SectionHeader title="게시판" />
              {filteredSportPosts.length > 0 ? (
                <PostList>
                  {filteredSportPosts.map((p, i) => <PostRow key={p.id} post={p} index={i} hot={p.hot} />)}
                </PostList>
              ) : <EmptyState message="검색 결과가 없습니다" />}
            </section>

            <section className="space-y-5">
              <SectionHeader icon={<Shield size={13} />} title="팀·크루 모집"
                action={<MoreLink href="/community/teams" />} />
              {sportTeams.length > 0
                ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{sportTeams.map((t) => <TeamCard key={t.id} team={t} />)}</div>
                : <EmptyState message={`${tab} 모집 중인 팀이 없습니다`} />}
            </section>

            <section className="space-y-5">
              <SectionHeader icon={<Trophy size={13} />} title="랭킹"
                action={<SegmentControl options={[{ key: "player", label: "선수" }, { key: "team", label: "팀" }]} value={rankTypeSport} onChange={setSportRankType} />} />
              {rankTypeSport === "player" ? (
                playerRanks.length > 0 ? (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                    {playerRanks.map((r, i) => (
                      <div key={r.rank} className="px-5 py-4 flex items-center gap-4"
                        style={{
                          background: i < 3 ? "var(--card-border)" : "var(--card-bg)",
                          borderTop: i > 0 ? "1px solid var(--card-border)" : "none",
                          opacity: i < 3 ? 1 : 0.85,
                        }}>
                        <span className="w-7 text-center font-bold text-sm shrink-0">
                          {i < 3 ? RANK_MEDAL[i] : <span style={{ color: "var(--text-muted)" }}>{r.rank}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.team}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{r.stat}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.statLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState message="랭킹 데이터가 없습니다" />
              ) : (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="grid px-5 py-3 text-[11px] font-semibold"
                    style={{ gridTemplateColumns: "2rem 1fr repeat(4, 3rem)", color: "var(--text-muted)", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)" }}>
                    <span>#</span><span>팀명</span><span className="text-center">승</span><span className="text-center">무</span><span className="text-center">패</span><span className="text-center">승점</span>
                  </div>
                  {(mockTeamRanks[Object.keys(mockTeamRanks)[0]] ?? []).map((r, i) => (
                    <div key={r.rank} className="grid px-5 py-4 items-center text-sm"
                      style={{
                        gridTemplateColumns: "2rem 1fr repeat(4, 3rem)",
                        background: i < 3 ? "var(--card-border)" : "var(--card-bg)",
                        borderTop: i > 0 ? "1px solid var(--card-border)" : "none",
                      }}>
                      <span className="font-bold text-xs">{i < 3 ? RANK_MEDAL[i] : <span style={{ color: "var(--text-muted)" }}>{r.rank}</span>}</span>
                      <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                      <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.wins}</span>
                      <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.draws}</span>
                      <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.losses}</span>
                      <span className="text-center font-bold" style={{ color: "var(--text-primary)" }}>{r.pts}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
              <SectionHeader title="베스트 플레이" action={<MoreLink href="/community/videos" />} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mockHighlights.map((v) => (
                  <div key={v.id} className="cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
                    onMouseEnter={() => setHoveredVideo(v.id)} onMouseLeave={() => setHoveredVideo(null)}>
                    <div className="aspect-[9/14] rounded-2xl overflow-hidden relative"
                      style={{ background: "var(--card-border)", border: "1px solid var(--card-border)" }}>
                      {/* 썸네일 그라디언트 플레이스홀더 */}
                      <div className="absolute inset-0"
                        style={{ background: "linear-gradient(145deg, var(--card-border) 0%, var(--card-bg) 100%)" }} />
                      {hoveredVideo === v.id && (
                        <div className="absolute inset-0 flex items-center justify-center transition-all"
                          style={{ background: "rgba(0,0,0,0.55)" }}>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-xl">
                            <Play size={20} className="ml-0.5" fill="#000" style={{ color: "#000" }} />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs"
                        style={{ color: "rgba(255,255,255,0.85)" }}>
                        <span className="flex items-center gap-1"><Eye size={11} />{(v.views / 1000).toFixed(1)}K</span>
                        <span className="flex items-center gap-1"><Heart size={11} />{v.likes}</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-0.5">
                      <p className="text-sm font-semibold truncate group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>{v.title}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{v.player} · {v.team}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══════ 자유게시판 ══════ */}
        {tab === "자유게시판" && (
          <section className="space-y-5">
            <SectionHeader title="자유게시판" />
            {filteredFreePosts.length > 0 ? (
              <PostList>
                {filteredFreePosts.map((p, i) => <PostRow key={p.id} post={p} index={i} hot={p.hot} />)}
              </PostList>
            ) : <EmptyState message="검색 결과가 없습니다" />}
          </section>
        )}

        {/* ══════ 우리동네 ══════ */}
        {tab === "우리동네" && (
          <>
            {/* 동네 선택 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--text-muted)" }}>내 동네</span>
                <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "var(--card-border)" }}>
                  {MY_REGIONS.map((r) => (
                    <button key={r} onClick={() => setRegion(r)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={region === r
                        ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                        : { color: "var(--text-muted)" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <Link href="/mypage/region" className="text-xs hover:opacity-60 transition-opacity"
                style={{ color: "var(--text-muted)" }}>설정 변경</Link>
            </div>

            {/* ① 경기 일정 */}
            <section className="space-y-5">
              <SectionHeader icon={<Calendar size={13} />} title="이번 주 경기 일정"
                action={<MoreLink href="/community/schedule" />} />
              {schedules.length > 0
                ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedules.map((s) => <ScheduleCard key={s.id} s={s} onApply={() => setReserveTarget(s)} />)}
                </div>
                : <EmptyState message={`${region} 경기 일정이 없습니다`} />}
            </section>

            {/* ② 팀·크루 모집 */}
            <section className="space-y-5">
              <SectionHeader icon={<Shield size={13} />} title="팀·크루 모집"
                action={<MoreLink href="/community/teams" />} />
              {localTeams.length > 0
                ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{localTeams.map((t) => <TeamCard key={t.id} team={t} />)}</div>
                : <EmptyState message={`${region} 모집 중인 팀·크루가 없습니다`} />}
            </section>

            {/* ③ 지역 랭킹 */}
            <section className="space-y-5">
              <SectionHeader icon={<Trophy size={13} />} title={`${region} 랭킹`}
                action={<SegmentControl options={[{ key: "team", label: "팀 순위" }, { key: "player", label: "선수" }]} value={rankTypeLocal} onChange={setRankTypeLocal} />} />
              {rankTypeLocal === "team" ? (
                teamRanks.length > 0 ? (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                    <div className="grid px-5 py-3 text-[11px] font-semibold"
                      style={{ gridTemplateColumns: "2rem 1fr repeat(4, 3rem)", color: "var(--text-muted)", borderBottom: "1px solid var(--card-border)" }}>
                      <span>#</span><span>팀명</span><span className="text-center">승</span><span className="text-center">무</span><span className="text-center">패</span><span className="text-center">승점</span>
                    </div>
                    {teamRanks.map((r, i) => (
                      <div key={r.rank} className="grid px-5 py-4 items-center"
                        style={{
                          gridTemplateColumns: "2rem 1fr repeat(4, 3rem)",
                          background: i < 3 ? "var(--card-border)" : "var(--card-bg)",
                          borderTop: i > 0 ? "1px solid var(--card-border)" : "none",
                        }}>
                        <span className="font-bold text-sm">{i < 3 ? RANK_MEDAL[i] : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.rank}</span>}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                        <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.wins}</span>
                        <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.draws}</span>
                        <span className="text-center text-xs" style={{ color: "var(--text-muted)" }}>{r.losses}</span>
                        <span className="text-center text-sm font-bold" style={{ color: "var(--text-primary)" }}>{r.pts}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState message={`${region} 팀 랭킹 데이터가 없습니다`} />
              ) : (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  {[
                    { rank: 1, name: "한지훈", sport: "풋살", stat: "18골" },
                    { rank: 2, name: "김민수", sport: "축구", stat: "12골" },
                    { rank: 3, name: "윤태양", sport: "농구", stat: "28.4pts" },
                    { rank: 4, name: "권나연", sport: "배드민턴", stat: "24승" },
                    { rank: 5, name: "이준호", sport: "축구", stat: "9골" },
                  ].map((r, i) => (
                    <div key={r.rank} className="px-5 py-4 flex items-center gap-4"
                      style={{
                        background: i < 3 ? "var(--card-border)" : "var(--card-bg)",
                        borderTop: i > 0 ? "1px solid var(--card-border)" : "none",
                      }}>
                      <span className="w-7 text-center font-bold text-sm shrink-0">
                        {i < 3 ? RANK_MEDAL[i] : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.rank}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.sport}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{r.stat}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ④ 3컬럼 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 동네 게시판 */}
              <section className="space-y-4">
                <SectionHeader title="동네 게시판" action={<MoreLink href="/community/local" />} />
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  {mockLocalPosts.filter((p) => p.location === region).map((p, i) => (
                    <div key={p.id} className="px-4 py-4 cursor-pointer transition-opacity hover:opacity-70"
                      style={{ background: "var(--card-bg)", borderTop: i > 0 ? "1px solid var(--card-border)" : "none" }}>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.title}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{p.author} · {p.time}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 용병 급구 */}
              <section className="space-y-4">
                <SectionHeader title="용병 급구" icon={
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: "#ef444420", color: "#ef4444", border: "1px solid #ef444430" }}>
                    <Zap size={9} fill="#ef4444" />LIVE
                  </span>
                } />
                <div className="space-y-3">
                  {mockMercenary.filter((p) => p.location === region).map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: "var(--card-bg)", border: p.urgent ? "1px solid #ef444430" : "1px solid var(--card-border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        {p.urgent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: "#ef444420", color: "#ef4444" }}>급구</span>
                        )}
                        <SportBadge sport={p.sport} />
                      </div>
                      <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{p.needed}명 구함</p>
                      <div className="text-xs mt-2 space-y-1" style={{ color: "var(--text-muted)" }}>
                        <div className="flex items-center gap-2"><Clock size={11} />{p.time}</div>
                        <div className="flex items-center gap-2"><MapPin size={11} />{p.venue}</div>
                      </div>
                      <div className="mt-3"><SolidBtn fullWidth>참가 신청</SolidBtn></div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 내 주변 구장 */}
              <section className="space-y-4">
                <SectionHeader title="내 주변 구장" action={
                  <Link href="/venues" className="text-xs flex items-center gap-0.5 hover:opacity-60 transition-opacity"
                    style={{ color: "var(--text-muted)" }}>지도보기 <ChevronRight size={13} /></Link>
                } />
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  {mockVenues.map((v, i) => (
                    <div key={v.id} className="px-4 py-4 flex items-center justify-between cursor-pointer transition-opacity hover:opacity-70"
                      style={{ background: "var(--card-bg)", borderTop: i > 0 ? "1px solid var(--card-border)" : "none" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{v.name}</p>
                        <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <MapPin size={10} />{v.distance} · {v.price}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                        style={v.available
                          ? { background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }
                          : { background: "var(--card-border)", color: "var(--text-muted)" }}>
                        {v.available ? "예약가능" : "마감"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {/* ── FAB (글쓰기) ── */}
      {tab !== "마켓" && (
        <button onClick={() => setShowWrite(true)}
          className="fixed bottom-8 right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: "var(--btn-solid-bg)", color: "var(--btn-solid-color)" }}>
          <PenLine size={16} />
          <span className="text-sm font-semibold">글쓰기</span>
        </button>
      )}

      {showWrite && <WriteModal tab={tab} onClose={() => setShowWrite(false)} />}
      {reserveTarget && <ReserveModal s={reserveTarget} onClose={() => setReserveTarget(null)} />}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto pt-2">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>커뮤니티</h1>
      </div>
    }>
      <CommunityContent />
    </Suspense>
  );
}
