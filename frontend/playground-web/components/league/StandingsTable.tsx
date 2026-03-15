'use client'

import React, { useState } from 'react'
import { Empty } from './shared'
import type { LeagueMatch } from './utils'

export interface Standing {
  teamId: string
  w: number; d: number; l: number
  gf: number; ga: number; gd: number
  pts: number; form: string[]
}

function TeamDetailModal({ teamId, teamName, matches, tn, onClose }: {
  teamId: string; teamName: string; matches: LeagueMatch[]; tn: (id: string) => string; onClose: () => void
}) {
  const teamMatches = matches
    .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'completed')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  const h2h = new Map<string, { w: number; d: number; l: number; gf: number; ga: number }>()
  teamMatches.forEach(m => {
    const isHome = m.homeTeamId === teamId
    const oppId = isHome ? m.awayTeamId : m.homeTeamId
    const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
    const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
    const rec = h2h.get(oppId) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 }
    rec.gf += my; rec.ga += op
    if (my > op) rec.w++; else if (my === op) rec.d++; else rec.l++
    h2h.set(oppId, rec)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{teamName}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>경기 결과</h3>
        {teamMatches.length === 0 ? <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>완료된 경기 없음</div> : (
          <div className="space-y-2 mb-5">
            {teamMatches.map(m => {
              const isHome = m.homeTeamId === teamId
              const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
              const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
              const result = my > op ? 'W' : my === op ? 'D' : 'L'
              const oppId = isHome ? m.awayTeamId : m.homeTeamId
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ background: result === 'W' ? 'rgba(16,185,129,0.06)' : result === 'L' ? 'rgba(239,68,68,0.06)' : 'rgba(148,163,184,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-5 w-5 rounded-full text-[10px] font-bold leading-5 text-center"
                      style={{ color: '#fff', background: result === 'W' ? '#10b981' : result === 'D' ? '#94a3b8' : '#ef4444' }}>{result}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{isHome ? 'vs' : '@'}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{tn(oppId)}</span>
                  </div>
                  <span className="font-mono font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{my}:{op}</span>
                </div>
              )
            })}
          </div>
        )}

        {h2h.size > 0 && (
          <>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>상대별 전적</h3>
            <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['상대', '승', '무', '패', '득', '실'].map(h => (
                      <th key={h} className="px-3 py-2 text-center first:text-left" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(h2h.entries()).map(([oppId, rec]) => (
                    <tr key={oppId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{tn(oppId)}</td>
                      <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{rec.w}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.d}</td>
                      <td className="px-3 py-2 text-center text-red-500">{rec.l}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.gf}</td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>{rec.ga}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function StandingsTable({ standings, tn, currentTeamId, matches }: {
  standings: Standing[]
  tn: (id: string) => string; currentTeamId: string; matches?: LeagueMatch[]
}) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null)

  if (standings.length === 0) return <Empty text="완료된 경기가 없습니다" />

  const medalBg = (i: number) => {
    if (i === 0) return 'rgba(16,185,129,0.08)'
    if (i === 1) return 'rgba(148,163,184,0.08)'
    if (i === 2) return 'rgba(245,158,11,0.08)'
    return undefined
  }

  const zoneBorder = (i: number) => {
    if (i === 0) return '3px solid #10b981'
    if (standings.length > 5 && i >= standings.length - 1) return '3px solid #ef4444'
    return undefined
  }

  const getHomeAway = (teamId: string) => {
    if (!matches) return null
    const teamMatches = matches.filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'completed')
    let hw = 0, hd = 0, hl = 0, hgf = 0, hga = 0, aw = 0, ad = 0, al = 0, agf = 0, aga = 0
    teamMatches.forEach(m => {
      const isHome = m.homeTeamId === teamId
      const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0)
      const op = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0)
      if (isHome) { hgf += my; hga += op; if (my > op) hw++; else if (my === op) hd++; else hl++ }
      else { agf += my; aga += op; if (my > op) aw++; else if (my === op) ad++; else al++ }
    })
    return { hw, hd, hl, hgf, hga, aw, ad, al, agf, aga }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> 우승권</span>
        {standings.length > 5 && <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> 강등권</span>}
      </div>

      <div className="overflow-hidden rounded-2xl shadow-sm" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                {['#', '팀', '경기', '승', '무', '패', '득', '실', '득실', '폼', '승점'].map(h => (
                  <th key={h} className="px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wide first:text-left" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const ha = getHomeAway(s.teamId)
                return (
                  <React.Fragment key={s.teamId}>
                    <tr className="cursor-pointer hover:bg-[var(--hover-overlay)] transition-all"
                      style={{ borderBottom: '1px solid var(--card-border)', background: medalBg(i), borderLeft: zoneBorder(i) }}
                      onClick={() => setExpandedTeam(expandedTeam === s.teamId ? null : s.teamId)}>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={i === 0 ? { background: '#10b981', color: '#fff' }
                            : i === 1 ? { background: '#94a3b8', color: '#fff' }
                            : i === 2 ? { background: '#f59e0b', color: '#fff' }
                            : { color: 'var(--text-muted)' }}>{i + 1}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                            style={{ background: s.teamId === currentTeamId ? '#10b981' : 'var(--btn-solid-bg)' }}>
                            {tn(s.teamId).charAt(0)}
                          </div>
                          <span className="cursor-pointer font-medium hover:underline"
                            style={{ color: s.teamId === currentTeamId ? '#10b981' : 'var(--text-primary)' }}
                            onClick={e => { e.stopPropagation(); setDetailTeamId(s.teamId) }}>
                            {tn(s.teamId)}
                            {s.teamId === currentTeamId && <span className="ml-1 text-[10px]">★</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.w + s.d + s.l}</td>
                      <td className="px-3 py-3.5 text-center font-semibold text-emerald-600">{s.w}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.d}</td>
                      <td className="px-3 py-3.5 text-center text-red-500">{s.l}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.gf}</td>
                      <td className="px-3 py-3.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.ga}</td>
                      <td className="px-3 py-3.5 text-center font-semibold" style={{ color: s.gd > 0 ? '#10b981' : s.gd < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {s.gd > 0 ? `+${s.gd}` : s.gd}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {s.form.map((f, fi) => (
                            <span key={fi} className="inline-block h-4 w-4 rounded-full text-[9px] font-bold leading-4 text-center"
                              style={{ color: '#fff', background: f === 'W' ? '#10b981' : f === 'D' ? '#94a3b8' : '#ef4444' }}>{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.pts}</td>
                    </tr>
                    {expandedTeam === s.teamId && ha && (
                      <tr style={{ background: 'rgba(128,128,128,0.04)' }}>
                        <td colSpan={11} className="px-6 py-3">
                          <div className="flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <div><span className="font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>홈</span> {ha.hw}승 {ha.hd}무 {ha.hl}패 (득 {ha.hgf} / 실 {ha.hga})</div>
                            <div><span className="font-semibold mr-2" style={{ color: 'var(--text-primary)' }}>원정</span> {ha.aw}승 {ha.ad}무 {ha.al}패 (득 {ha.agf} / 실 {ha.aga})</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailTeamId && matches && (
        <TeamDetailModal
          teamId={detailTeamId}
          teamName={tn(detailTeamId)}
          matches={matches}
          tn={tn}
          onClose={() => setDetailTeamId(null)}
        />
      )}
    </div>
  )
}
