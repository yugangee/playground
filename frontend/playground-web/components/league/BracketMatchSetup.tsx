'use client'

import React, { useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { inp, inpStyle, lbl, lblStyle } from './shared'
import type { LeagueMatch, LeagueTeam } from './utils'

interface BracketMatchSetupProps {
  leagueId: string
  match: LeagueMatch
  teams: LeagueTeam[]
  teamNames: Record<string, string>
  onSave: () => void
  onClose: () => void
}

export default function BracketMatchSetup({ leagueId, match, teams, teamNames, onSave, onClose }: BracketMatchSetupProps) {
  const tn = (id: string) => teamNames[id] ?? id

  const isFirstRound = match.homeTeamId === 'TBD' || match.awayTeamId === 'TBD'
    || match.homeTeamId === 'BYE' || match.awayTeamId === 'BYE'
  const hasRealTeams = match.homeTeamId !== 'TBD' && match.awayTeamId !== 'TBD'
    && match.homeTeamId !== 'BYE' && match.awayTeamId !== 'BYE'

  const [homeTeamId, setHomeTeamId] = useState(
    match.homeTeamId === 'TBD' ? '' : match.homeTeamId
  )
  const [awayTeamId, setAwayTeamId] = useState(
    match.awayTeamId === 'TBD' ? '' : match.awayTeamId
  )
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduledAt && match.scheduledAt !== '미정' ? match.scheduledAt.slice(0, 16) : ''
  )
  const [venue, setVenue] = useState(match.venue === '미정' ? '' : (match.venue ?? ''))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}

      if (isFirstRound) {
        body.homeTeamId = homeTeamId || 'BYE'
        body.awayTeamId = awayTeamId || 'BYE'

        // BYE 매치 자동 완료
        if ((body.homeTeamId === 'BYE' || body.awayTeamId === 'BYE')
          && body.homeTeamId !== 'BYE' && body.awayTeamId !== 'BYE') {
          // 한쪽만 BYE
        }
        if (body.homeTeamId === 'BYE' && body.awayTeamId === 'BYE') {
          alert('양쪽 모두 BYE로 설정할 수 없습니다.')
          setSaving(false)
          return
        }
      }

      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString()
      if (venue) body.venue = venue

      await manageFetch(`/league/${leagueId}/matches/${match.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })

      // BYE 매치 자동 완료 처리
      const finalHome = (body.homeTeamId as string) ?? match.homeTeamId
      const finalAway = (body.awayTeamId as string) ?? match.awayTeamId
      if ((finalHome === 'BYE' || finalAway === 'BYE') && finalHome !== finalAway) {
        const winner = finalHome === 'BYE' ? finalAway : finalHome
        await manageFetch(`/league/${leagueId}/matches/${match.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed', homeScore: 0, awayScore: 0, winner }),
        })
      }

      onSave()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const availableForHome = teams.filter(t => t.teamId !== awayTeamId)
  const availableForAway = teams.filter(t => t.teamId !== homeTeamId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {match.round} — 경기 {match.matchNumber ? `#${match.matchNumber}` : ''} 설정
          </h3>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="space-y-4">
          {/* 팀 선택 (첫 라운드만 수정 가능) */}
          {isFirstRound ? (
            <>
              <div>
                <label className={lbl} style={lblStyle}>홈팀</label>
                <select value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)}
                  className={inp} style={inpStyle}>
                  <option value="">— BYE (부전승) —</option>
                  {availableForHome.map(t => (
                    <option key={t.teamId} value={t.teamId}>{tn(t.teamId)}</option>
                  ))}
                </select>
              </div>
              <div className="text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>VS</div>
              <div>
                <label className={lbl} style={lblStyle}>원정팀</label>
                <select value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)}
                  className={inp} style={inpStyle}>
                  <option value="">— BYE (부전승) —</option>
                  {availableForAway.map(t => (
                    <option key={t.teamId} value={t.teamId}>{tn(t.teamId)}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)' }}>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {hasRealTeams
                  ? `${tn(match.homeTeamId)} vs ${tn(match.awayTeamId)}`
                  : '이전 라운드 결과에 따라 자동 배정됩니다'}
              </div>
            </div>
          )}

          {/* 일시 / 장소 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblStyle}>일시</label>
              <input type="datetime-local" value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className={inp} style={inpStyle} />
            </div>
            <div>
              <label className={lbl} style={lblStyle}>장소</label>
              <input value={venue} onChange={e => setVenue(e.target.value)}
                placeholder="미정" className={inp} style={inpStyle} />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
