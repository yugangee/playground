"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Shield, Trophy, Calendar, Users, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/m/clubs", icon: Shield, label: "클럽" },
    { href: "/m/league", icon: Trophy, label: "대회" },
    { href: "/m/schedule", icon: Calendar, label: "일정" },
    { href: "/m/team", icon: Users, label: "팀" },
    { href: "/m/mypage", icon: User, label: "MY" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t safe-area-inset-bottom"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
              pathname === href || pathname.startsWith(href + "/")
                ? "text-[var(--brand-primary)]"
                : ""
            }`}
            style={{ color: pathname === href || pathname.startsWith(href + "/") ? undefined : "var(--text-muted)" }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}