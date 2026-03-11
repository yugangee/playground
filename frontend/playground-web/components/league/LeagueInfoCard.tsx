'use client'

import React from 'react'
import { ROUND_ORDER, type LeagueMatch, type LeagueTeam } from './utils'
import type { League } from '@/types/manage'

export default function LeagueInfoCard({ league, teams, matches }: {
  league: League; teams: LeagueTeam[]; matches: LeagueMatch[]
}) {
  const completed = matches.filter(m => m.status === 'completed').length
  const total = matches.length
  const currentRound = (() => {
    if (matches.length === 0) return '-'
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
    { label: '대회 형식', value: league.type === 'tournament' ? '토너먼트' : '리그', icon: league.type === 'tournament' ? '🏆' : '📊' },
    { label: '참가팀', value: `${teams.length}팀`, icon: '👥' },
    { label: '경기 진행', value: total > 0 ? `${completed}/${total}` : '-', icon: '⚽' },
    { label: league.type === 'tournament' ? '현재 라운드' : '진행률', value: league.type === 'tournament' ? currentRound : (total > 0 ? `${Math.round((completed / total) * 100)}%` : '-'), icon: '📍' },
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
