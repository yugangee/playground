'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTeam } from '@/contexts/TeamContext'
import { useAuth } from '@/contexts/AuthContext'

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
  )
}

function IconBanknotes({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  )
}

function IconMagnifyingGlass({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function RoleBadge({ isLeader }: { isLeader: boolean }) {
  return isLeader ? (
    <span className="ml-1 flex-shrink-0 rounded-md bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
      대표
    </span>
  ) : (
    <span className="ml-1 flex-shrink-0 rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
      선수
    </span>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function IconChartBar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function IconPhoto({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

type NavItem = { href: string; label: string; Icon: React.FC<{ className?: string }>; comingSoon?: true }

const navItems: NavItem[] = [
  { href: '/team',     label: '팀 관리',         Icon: IconUsers },
  { href: '/schedule', label: '경기 일정',        Icon: IconCalendar },
  { href: '/league',   label: '리그 & 토너먼트',  Icon: IconTrophy },
  { href: '/finance',  label: '재정 관리',        Icon: IconBanknotes },
  { href: '/social',   label: '소셜',             Icon: IconStar },
  { href: '/discover', label: '탐색',             Icon: IconMagnifyingGlass },
  { href: '/stats',    label: '경기 기록·통계',   Icon: IconChartBar, comingSoon: true },
  { href: '/media',    label: '미디어 아카이브',  Icon: IconPhoto,    comingSoon: true },
  { href: '/ai',       label: 'AI 분석',          Icon: IconSparkles, comingSoon: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { teams, currentTeam, setCurrentTeam } = useTeam()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-[18px]">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5c0 0-3 3-3 9.5s3 9.5 3 9.5M12 2.5c0 0 3 3 3 9.5s-3 9.5-3 9.5M2.5 12h19M4 7h16M4 17h16" />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">Playground</span>
      </div>

      {/* Team selector */}
      <div className="relative border-b border-slate-800 px-3 py-3">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
            {currentTeam ? currentTeam.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="flex-1 truncate text-left text-[13px]">
            {currentTeam?.name ?? '팀 없음'}
          </span>
          <IconChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && teams.length > 0 && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => { setCurrentTeam(team); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-slate-700"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-600 text-xs font-bold text-white">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span className={`truncate ${currentTeam?.id === team.id ? 'font-semibold text-white' : 'text-slate-300'}`}>
                  {team.name}
                </span>
                <RoleBadge isLeader={team.leaderId === user?.userId} />
                {currentTeam?.id === team.id && (
                  <IconCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, Icon, comingSoon }) => {
            if (comingSoon) {
              return (
                <div
                  key={href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium opacity-40"
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <span className="flex-1 text-slate-400">{label}</span>
                  <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Soon
                  </span>
                </div>
              )
            }
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mypage */}
      <div className="border-t border-slate-800 px-3 py-3">
        <Link
          href="/mypage"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
            pathname.startsWith('/mypage')
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          <IconUser className="h-4 w-4 flex-shrink-0" />
          마이페이지
        </Link>
      </div>
    </aside>
  )
}
