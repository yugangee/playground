"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Users, BarChart2, ChevronLeft, ChevronRight, Shield, MessageCircle, Landmark, Clapperboard, UserSearch, User, Sun, Moon, Globe } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/clubs",   label: "클럽 탐색",   icon: Shield },
  { href: "/players", label: "선수 탐색",   icon: UserSearch },
  { href: "/chat",    label: "채팅",        icon: MessageCircle },
  { href: "/community", label: "커뮤니티",   icon: Globe },
  { href: "/market",  label: "마켓",       icon: ShoppingCart },
  { href: "/team",    label: "팀 관리",     icon: Users },
  { href: "/finance", label: "팀 매니지먼트", icon: Landmark },
  { href: "/report",  label: "AI 리포트",   icon: BarChart2 },
  { href: "/video",   label: "AI 영상분석", icon: Clapperboard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className={`sticky top-0 h-screen border-r flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`} style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}>
      <div className="px-4 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--card-border)" }}>
        {!collapsed && (
          <Link href="/" className="font-bold text-xl tracking-tight transition-colors uppercase" style={{ color: "var(--text-primary)" }}>
            Playground
          </Link>
        )}
        <button onClick={() => setCollapsed(p => !p)} className={`transition-colors ${collapsed ? "mx-auto" : ""}`} style={{ color: "var(--text-muted)" }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "text-white bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30"
                  : "hover:bg-[var(--card-bg)]"
              } ${collapsed ? "justify-center" : ""}`}
              style={active ? undefined : { color: "var(--text-muted)" }}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: "1px solid var(--card-border)" }}>
        <Link href="/mypage" className={`flex items-center gap-3 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-fuchsia-500/40 flex items-center justify-center" style={{ background: "var(--card-bg)" }}>
            {user?.avatar ? (
              <Image src={user.avatar} alt={user.name} fill className="object-cover" />
            ) : (
              <User size={16} style={{ color: "var(--text-muted)" }} />
            )}
          </div>
          {!collapsed && <span className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>{user?.name || "로그인"}</span>}
        </Link>
        {!collapsed && (
          <button onClick={toggle} className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--card-bg)]" title={theme === "dark" ? "라이트 모드" : "다크 모드"}>
            {theme === "dark" ? <Sun size={15} style={{ color: "var(--text-muted)" }} /> : <Moon size={15} style={{ color: "var(--text-muted)" }} />}
          </button>
        )}
      </div>
    </aside>
  );
}
