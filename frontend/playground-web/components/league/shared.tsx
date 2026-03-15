'use client'

import React, { useState, useEffect } from 'react'
import { manageFetch } from '@/lib/manageFetch'

// ── Label maps ───────────────────────────────────────────────────────────────

export const AGE_GROUP_LABEL: Record<string, string> = {
  elementary: '초등', middle: '중등', high: '고등',
  university: '대학', worker: '직장인', senior: '시니어', mixed: '혼합',
}

export const SPORT_TYPE_LABEL: Record<string, string> = {
  soccer: '축구', futsal: '풋살', basketball: '농구', baseball: '야구',
  volleyball: '배구', ice_hockey: '아이스하키',
  running: '러닝크루', snowboard: '스노보드', badminton: '배드민턴',
}

// ── Form style constants ─────────────────────────────────────────────────────

export const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide'
export const lblStyle = { color: 'var(--text-muted)' }
export const inp = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all'
export const inpStyle: React.CSSProperties = {
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
}

// ── Badges ───────────────────────────────────────────────────────────────────

export function TypeBadge({ type }: { type: string }) {
  const style: React.CSSProperties = type === 'tournament'
    ? { background: 'rgba(147,51,234,0.12)', color: 'var(--brand-primary)' }
    : { background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
      {type === 'tournament' ? '토너먼트' : '리그'}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    recruiting: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    ongoing: { background: 'rgba(16,185,129,0.15)', color: '#10b981' },
    finished: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    pending: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    completed: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  }
  const labels: Record<string, string> = { recruiting: '모집중', ongoing: '진행중', finished: '종료', pending: '대기', completed: '완료' }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={styles[status] ?? { background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}>
      {labels[status] ?? status}
    </span>
  )
}

// ── Layout helpers ───────────────────────────────────────────────────────────

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed py-14 text-center text-sm"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
      {text}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
    </div>
  )
}

export function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:opacity-70"
      style={{ color: 'var(--text-muted)' }}>
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
    </button>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      {children}
    </div>
  )
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: 'var(--btn-solid-bg)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Team Search / Invite ─────────────────────────────────────────────────────

export function TeamSearchInvite({ onInvite }: { onInvite: (teamId: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [focused, setFocused] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    manageFetch('/discover/teams').then((data: { id: string; name: string }[]) => {
      setAllTeams(data ?? [])
    }).catch(() => {})
  }, [])

  const results = query.trim() ? allTeams.filter(t => t.name?.toLowerCase().includes(query.toLowerCase())) : []
  const showDropdown = focused && query.trim().length > 0

  const handleInvite = async (team: { id: string; name: string }) => {
    setInviting(team.id)
    try { await onInvite(team.id); setQuery(''); setFocused(false) }
    catch (e) { alert(e instanceof Error ? e.message : '초대 실패') }
    finally { setInviting(null) }
  }

  return (
    <div className="relative max-w-xs">
      <input value={query} onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
        className={inp} style={inpStyle} placeholder="팀 이름으로 검색" />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl shadow-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {results.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--hover-overlay)] transition-colors">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
              <button onClick={() => handleInvite(t)} disabled={inviting === t.id}
                className="rounded-lg bg-[var(--btn-solid-bg)] px-3 py-1 text-xs font-semibold text-[var(--btn-solid-color)] hover:bg-[var(--hover-overlay)] transition-colors disabled:opacity-50">
                {inviting === t.id ? '초대 중...' : '초대'}
              </button>
            </div>
          ))}
        </div>
      )}
      {showDropdown && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
          검색 결과가 없습니다
        </div>
      )}
    </div>
  )
}
