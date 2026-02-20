"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Users, BarChart2, ChevronLeft, ChevronRight, Shield, MessageCircle, Landmark, Clapperboard, UserSearch, User } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/clubs",   label: "클럽 탐색",   icon: Shield },
  { href: "/players", label: "선수 탐색",   icon: UserSearch },
  { href: "/chat",    label: "채팅",        icon: MessageCircle },
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

  return (
    <aside className={`sticky top-0 h-screen border-r border-white/10 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`} style={{ background: "#111111" }}>
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <Link href="/" className="text-white font-bold text-xl tracking-tight hover:text-gray-300 transition-colors uppercase">
            Playground
          </Link>
        )}
        <button onClick={() => setCollapsed(p => !p)} className={`text-gray-500 hover:text-white transition-colors ${collapsed ? "mx-auto" : ""}`}>
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
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <Link href="/mypage" className={`border-t border-white/10 px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors ${collapsed ? "justify-center" : ""}`}>
        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-fuchsia-500/40 bg-white/5 flex items-center justify-center">
          {user?.avatar ? (
            <Image src={user.avatar} alt={user.name} fill className="object-cover" />
          ) : (
            <User size={16} className="text-gray-600" />
          )}
        </div>
        {!collapsed && <span className="text-sm font-medium text-gray-300 truncate">{user?.name || "로그인"}</span>}
      </Link>
    </aside>
  );
}
