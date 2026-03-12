'use client'

import React from 'react'
import { ROUND_ORDER, type LeagueMatch, type LeagueTeam } from './utils'
import type { League } from '@/types/manage'

export default function LeagueInfoCard({ league, teams, matches }: {
  league: League; teams: LeagueTeam[]; matches: LeagueMatch[]
}) {
  const completed = matches.filter(m => m.status === 'completed').length
  const total = matches.length
  const isTournament = league.type === 'tournament'

  const totalGoals = matches.filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + (m.goals?.length ?? 0), 0)

  // 다음 경기 날짜 (Date.now() 사용 회피 — pure render)
  const nextMatchLabel = (() => {
    const nextMatch = matches
      .filter(m => m.status !== 'completed')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
    if (!nextMatch) return '-'
    return new Date(nextMatch.scheduledAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  })()

  // 모집중
  if (league.status === 'recruiting') {
    const maxTeams = league.registration?.maxTeams
    const entryFee = league.registration?.entryFee
    const deadline = league.registration?.registrationDeadline

    const cards = [
      { label: '참가팀', value: maxTeams ? `${teams.length} / ${maxTeams}팀` : `${teams.length}팀`, icon: '👥' },
      { label: '참가비', value: entryFee ? `${entryFee.toLocaleString()}원` : '무료', icon: '💰' },
      { label: '마감일', value: deadline ? new Date(deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '미정', icon: '📅' },
    ]

    return (
      <div className="mb-6 grid grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4 text-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-lg mb-1">{c.icon}</div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</div>
          </div>
        ))}
      </div>
    )
  }

  // 토너먼트
  if (isTournament) {
    const currentRound = (() => {
      if (total === 0) return '-'
      const pending = matches.filter(m => m.status !== 'completed')
      if (pending.length === 0) return '완료'
      const rounds = pending.map(m => m.round).filter(Boolean)
      if (rounds.length === 0) return '-'
      const order = [...ROUND_ORDER, '3/4위전']
      const sorted = [...new Set(rounds)].sort((a, b) => {
        const ai = order.indexOf(a!); const bi = order.indexOf(b!)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      return sorted[0] ?? '-'
    })()

    const cards = [
      { label: '참가팀', value: `${teams.length}팀`, icon: '👥' },
      { label: '현재 라운드', value: currentRound, icon: '📍' },
      { label: '경기 진행', value: total > 0 ? `${completed}/${total}` : '-', icon: '⚽' },
      { label: '총 골', value: totalGoals > 0 ? `${totalGoals}골` : '-', icon: '🥅' },
    ]

    return (
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4 text-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="text-lg mb-1">{c.icon}</div>
            <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</div>
          </div>
        ))}
      </div>
    )
  }

  // 리그
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const cards = [
    { label: '참가팀', value: `${teams.length}팀`, icon: '👥' },
    { label: '진행률', value: total > 0 ? `${progressPct}%` : '-', icon: '📊' },
    { label: '총 골', value: totalGoals > 0 ? `${totalGoals}골` : '-', icon: '🥅' },
    { label: '다음 경기', value: nextMatchLabel, icon: '📅' },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl p-4 text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="text-lg mb-1">{c.icon}</div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
