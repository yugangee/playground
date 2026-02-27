"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart, Users, BarChart2, ChevronLeft, ChevronRight,
  Shield, MessageCircle, Landmark, Clapperboard, UserSearch,
  User, Sun, Moon, Globe, Trophy, Settings, ArrowLeftRight,
  Calendar, Search, Star,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTeam } from "@/context/TeamContext";

const generalNavItems = [
  { href: "/clubs",          label: "클럽 탐색",        icon: Shield },
  { href: "/league",         label: "리그 탐색",        icon: Trophy },
  { href: "/league/kja-51",  label: "🏆 기자협회 대회", icon: Trophy, highlight: true },
  { href: "/players",        label: "선수 탐색",        icon: UserSearch },
  { href: "/schedule",       label: "일정·참석",        icon: Calendar },
  { href: "/chat",           label: "채팅",             icon: MessageCircle },
  { href: "/community",      label: "커뮤니티",         icon: Globe },
  { href: "/market",         label: "마켓",             icon: ShoppingCart },
  { href: "/team",           label: "팀 관리",          icon: Users },
  { href: "/finance",        label: "팀 매니지먼트",    icon: Landmark },
  { href: "/report",         label: "AI 리포트",        icon: BarChart2 },
  { href: "/video",          label: "AI 영상분석",      icon: Clapperboard },
];

const manageNavItems = [
  { href: "/manage/team",     label: "팀 관리",          icon: Users },
  { href: "/manage/schedule", label: "경기 일정",         icon: Calendar },
  { href: "/manage/league",   label: "리그 & 토너먼트",   icon: Trophy },
  { href: "/manage/finance",  label: "재정 관리",         icon: Landmark },
  { href: "/manage/social",   label: "소셜",              icon: Star },
  { href: "/manage/discover", label: "탐색",              icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { teams, currentTeam, setCurrentTeam } = useTeam();
  const [teamOpen, setTeamOpen] = useState(false);

  const isManageMode = pathname.startsWith("/manage");
  const navItems = isManageMode ? manageNavItems : generalNavItems;

  const handleModeToggle = () => {
    if (isManageMode) {
      router.push("/");
    } else {
      router.push("/manage/team");
    }
  };

  return (
    <aside
      className={`sticky top-0 h-screen border-r flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}
    >
      {/* 헤더 */}
      <div className="px-4 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--card-border)" }}>
        {!collapsed && (
          <Link href="/" className="font-bold text-xl tracking-tight transition-colors uppercase" style={{ color: "var(--text-primary)" }}>
            Playground
          </Link>
        )}
        <button
          onClick={() => setCollapsed(p => !p)}
          className={`transition-colors ${collapsed ? "mx-auto" : ""}`}
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* 관리 모드: 팀 선택 드롭다운 */}
      {isManageMode && !collapsed && (
        <div className="relative px-3 py-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <button
            onClick={() => setTeamOpen(v => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--card-bg)]"
            style={{ color: "var(--text-secondary)" }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "var(--accent, #10b981)" }}
            >
              {currentTeam ? currentTeam.name.charAt(0).toUpperCase() : "?"}
            </div>
            <span className="flex-1 truncate text-left text-[13px]">
              {currentTeam?.name ?? "팀 없음"}
            </span>
            <ChevronRight
              size={12}
              className={`shrink-0 transition-transform duration-200 ${teamOpen ? "rotate-90" : ""}`}
              style={{ color: "var(--text-muted)" }}
            />
          </button>

          {teamOpen && teams.length > 0 && (
            <div
              className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-xl shadow-2xl"
              style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)" }}
            >
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => { setCurrentTeam(team); setTeamOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--sidebar-bg)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                    style={{ background: "var(--accent, #10b981)" }}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`truncate ${currentTeam?.id === team.id ? "font-semibold" : ""}`}
                    style={{ color: currentTeam?.id === team.id ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {team.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 모드 배지 (펼쳐진 상태) */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: isManageMode ? "rgba(16,185,129,0.15)" : "var(--card-bg)",
              color: isManageMode ? "#10b981" : "var(--text-muted)",
            }}
          >
            <Settings size={10} />
            {isManageMode ? "관리 모드" : "일반 모드"}
          </span>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, ...rest }) => {
          const highlight = (rest as { highlight?: boolean }).highlight;
          const active = pathname === href || (href !== "/league" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "text-white bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30"
                  : highlight
                  ? "hover:bg-[var(--card-bg)] border border-fuchsia-500/20"
                  : "hover:bg-[var(--card-bg)]"
              } ${collapsed ? "justify-center" : ""}`}
              style={active ? undefined : highlight ? { color: "#e879f9" } : { color: "var(--text-muted)" }}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* 모드 전환 버튼 */}
      <div className="px-2 pb-1" style={{ borderTop: "1px solid var(--card-border)" }}>
        <button
          onClick={handleModeToggle}
          className={`mt-2 flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--card-bg)] ${collapsed ? "justify-center" : ""}`}
          style={{ color: "var(--text-muted)" }}
          title={collapsed ? (isManageMode ? "일반 모드로" : "관리 모드로") : undefined}
        >
          <ArrowLeftRight size={18} className="shrink-0" />
          {!collapsed && (isManageMode ? "일반 모드로" : "관리 모드로")}
        </button>
      </div>

      {/* 하단 유저 영역 */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: "1px solid var(--card-border)" }}>
        <Link href="/mypage" className={`flex items-center gap-3 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div
            className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-fuchsia-500/40 flex items-center justify-center"
            style={{ background: "var(--card-bg)" }}
          >
            {user?.avatar ? (
              <Image src={user.avatar} alt={user.name} fill className="object-cover" />
            ) : (
              <User size={16} style={{ color: "var(--text-muted)" }} />
            )}
          </div>
          {!collapsed && (
            <span className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>
              {user?.name || "로그인"}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--card-bg)]"
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark"
              ? <Sun size={15} style={{ color: "var(--text-muted)" }} />
              : <Moon size={15} style={{ color: "var(--text-muted)" }} />}
          </button>
        )}
      </div>
    </aside>
  );
}
