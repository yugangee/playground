"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserCircle, LogOut, Shield, Trophy, Calendar, Users, UserSearch, MessageSquare } from "lucide-react";

const navItems = [
  { href: "/clubs", label: "클럽 탐색", icon: Shield },
  { href: "/league", label: "리그 탐색", icon: Trophy },
  { href: "/players", label: "선수 탐색", icon: UserSearch },
  { href: "/schedule", label: "일정", icon: Calendar },
  { href: "/team", label: "팀 관리", icon: Users },
  { href: "/community", label: "커뮤니티", icon: MessageSquare },
];

export default function HeaderAuth() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}
    >
      {/* 상단: 로고 + 유저 */}
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-black text-xl tracking-tight uppercase" style={{ color: "var(--text-primary)" }}>
          Playground
        </Link>

        {/* 우측 유저 영역 */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-5" />
          ) : user ? (
            <>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{user.name}님</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium transition-colors flex items-center gap-1 hover:text-white"
                style={{ color: "var(--text-muted)" }}
              >
                <LogOut size={14} />
              </button>
              <Link href="/mypage" className="transition-colors hover:text-white" style={{ color: "var(--text-muted)" }} title="마이페이지">
                <UserCircle size={18} />
              </Link>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium transition-colors hover:text-white" style={{ color: "var(--text-muted)" }}>
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 하단: 네비게이션 메뉴 - 로그인한 경우만 표시 */}
      {user && (
        <nav className="flex items-center justify-center gap-[60px] px-6 pb-0">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
                  active
                    ? "text-white"
                    : "hover:text-white"
                }`}
                style={active ? undefined : { color: "var(--text-muted)" }}
              >
                <Icon size={16} />
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
