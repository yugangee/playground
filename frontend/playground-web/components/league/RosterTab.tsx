'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import type { LeagueRosterPlayer } from '@/types/manage'
import { inp, inpStyle, Empty } from './shared'
import type { LeagueTeam } from './utils'

interface RosterTabProps {
  leagueId: string
  teams: LeagueTeam[]
  teamNames: Record<string, string>
  isOrganizer: boolean
  leagueStatus: string
  maxPlayers?: number
}

interface EditingPlayer {
  playerId: string
  name: string
  jerseyNumber: number
  department: string
  verified: boolean
}

export default function RosterTab({ leagueId, teams, teamNames, isOrganizer, leagueStatus, maxPlayers = 30 }: RosterTabProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.teamId ?? '')
  const [roster, setRoster] = useState<LeagueRosterPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<EditingPlayer[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [error, setError] = useState('')

  const tn = (id: string) => teamNames[id] ?? id

  const loadRoster = useCallback(async (teamId: string) => {
    if (!teamId) return
    setLoading(true)
    setError('')
    try {
      const data = await manageFetch(`/league/${leagueId}/rosters/${teamId}`)
      const players: LeagueRosterPlayer[] = Array.isArray(data) ? data : data?.players ?? []
      setRoster(players)
    } catch {
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    if (selectedTeamId) {
      loadRoster(selectedTeamId)
      setIsEditMode(false)
    }
  }, [selectedTeamId, loadRoster])

  const startEdit = () => {
    setEditing(roster.map(p => ({
      playerId: p.playerId,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      department: p.department ?? '',
      verified: p.verified,
    })))
    setIsEditMode(true)
  }

  const cancelEdit = () => {
    setIsEditMode(false)
    setEditing([])
    setError('')
  }

  const addPlayer = () => {
    if (editing.length >= maxPlayers) {
      setError(`최대 ${maxPlayers}명까지 등록할 수 있습니다`)
      return
    }
    const nextId = `new-${Date.now()}`
    const usedNumbers = new Set(editing.map(p => p.jerseyNumber))
    let nextNumber = 1
    while (usedNumbers.has(nextNumber) && nextNumber <= 99) nextNumber++

    setEditing(prev => [...prev, {
      playerId: nextId,
      name: '',
      jerseyNumber: nextNumber,
      department: '',
      verified: false,
    }])
  }

  const removePlayer = (idx: number) => {
    setEditing(prev => prev.filter((_, i) => i !== idx))
  }

  const updatePlayer = (idx: number, field: keyof EditingPlayer, value: string | number | boolean) => {
    setEditing(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const saveRoster = async () => {
    setError('')
    // Validation
    const names = editing.filter(p => p.name.trim())
    if (names.length === 0) {
      setError('최소 1명 이상의 선수를 등록하세요')
      return
    }
    const emptyNames = editing.filter(p => !p.name.trim())
    if (emptyNames.length > 0) {
      setError('이름이 비어있는 선수가 있습니다')
      return
    }
    const numbers = editing.map(p => p.jerseyNumber)
    const dupNumbers = numbers.filter((n, i) => numbers.indexOf(n) !== i)
    if (dupNumbers.length > 0) {
      setError(`등번호 중복: ${[...new Set(dupNumbers)].join(', ')}`)
      return
    }
    const invalidNumbers = numbers.filter(n => n < 1 || n > 99)
    if (invalidNumbers.length > 0) {
      setError('등번호는 1~99 범위여야 합니다')
      return
    }

    setSaving(true)
    try {
      await manageFetch(`/league/${leagueId}/rosters/${selectedTeamId}`, {
        method: 'PUT',
        body: JSON.stringify({
          players: editing.map(p => ({
            playerId: p.playerId.startsWith('new-') ? `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : p.playerId,
            name: p.name.trim(),
            jerseyNumber: p.jerseyNumber,
            department: p.department.trim() || undefined,
            verified: p.verified,
          })),
        }),
      })
      await loadRoster(selectedTeamId)
      setIsEditMode(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const deletePlayer = async (playerId: string) => {
    if (!confirm('이 선수를 로스터에서 삭제하시겠습니까?')) return
    try {
      await manageFetch(`/league/${leagueId}/rosters/${selectedTeamId}/${playerId}`, { method: 'DELETE' })
      await loadRoster(selectedTeamId)
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  const importFromTeamMembers = async () => {
    if (!selectedTeamId) return
    try {
      // 1) Manage API (pg-team-members)
      let members: Array<{ userId: string; name?: string; number?: number; position?: string }> = []
      try {
        const m = await manageFetch(`/team/${selectedTeamId}/members`)
        if (Array.isArray(m)) members = m
      } catch { /* ignore */ }

      // 2) Auth API (playground-club-members) — teamId를 clubId로 시도
      const AUTH_API = process.env.NEXT_PUBLIC_API_URL
      if (AUTH_API) {
        try {
          const r = await fetch(`${AUTH_API}/club-members/${selectedTeamId}`)
          if (r.ok) {
            const data = await r.json()
            const clubMembers: Array<{ email?: string; name?: string; jerseyNumber?: number; position?: string }> = data.members ?? data ?? []
            // 중복 제거 후 병합
            const existingIds = new Set(members.map(m => m.userId))
            for (const cm of clubMembers) {
              const id = cm.email ?? ''
              if (id && !existingIds.has(id)) {
                existingIds.add(id)
                members.push({ userId: id, name: cm.name ?? id.split('@')[0], number: cm.jerseyNumber, position: cm.position })
              }
            }
          }
        } catch { /* Auth API 접근 불가 시 무시 */ }
      }

      if (members.length === 0) {
        setError('등록된 팀 멤버가 없습니다')
        return
      }
      const usedNumbers = new Set<number>()
      const imported: EditingPlayer[] = members.map(m => {
        let num = m.number ?? 1
        while (usedNumbers.has(num) && num <= 99) num++
        usedNumbers.add(num)
        return {
          playerId: m.userId,
          name: m.name ?? '',
          jerseyNumber: num,
          department: m.position ?? '',
          verified: false,
        }
      })
      setEditing(imported)
      setIsEditMode(true)
    } catch {
      setError('팀 멤버를 불러올 수 없습니다')
    }
  }

  return (
    <div className="flex gap-4 flex-col sm:flex-row">
      {/* 좌측: 팀 리스트 */}
      <div className="sm:w-48 flex-shrink-0">
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)' }}>
            참가팀 ({teams.length})
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {teams.map(t => (
              <button key={t.teamId} onClick={() => { setSelectedTeamId(t.teamId); setIsEditMode(false) }}
                className="w-full px-3 py-2.5 text-left text-sm transition-colors truncate"
                style={selectedTeamId === t.teamId
                  ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)', fontWeight: 600 }
                  : { color: 'var(--text-primary)' }
                }>
                {tn(t.teamId)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 우측: 로스터 테이블 */}
      <div className="flex-1 min-w-0">
        {!selectedTeamId ? (
          <Empty text="팀을 선택하세요" />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tn(selectedTeamId)} 로스터</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isEditMode ? `${editing.length}/${maxPlayers}명` : `${roster.length}/${maxPlayers}명`}
                </span>
              </div>
              {isOrganizer && (
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button onClick={cancelEdit} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                        취소
                      </button>
                      <button onClick={saveRoster} disabled={saving}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                        style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                        {saving ? '저장 중...' : '저장'}
                      </button>
                    </>
                  ) : (
                    <button onClick={startEdit}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                      편집
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mx-4 mt-3 rounded-lg px-3 py-2 text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            {/* Edit mode */}
            {isEditMode ? (
              <div className="p-4 space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-[50px_1fr_1fr_60px_40px] gap-2 px-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  <span>번호</span>
                  <span>이름</span>
                  <span>소속/직함</span>
                  <span className="text-center">검인</span>
                  <span />
                </div>
                {editing.map((player, idx) => (
                  <div key={player.playerId} className="grid grid-cols-[50px_1fr_1fr_60px_40px] gap-2 items-center">
                    <input type="number" value={player.jerseyNumber}
                      onChange={e => updatePlayer(idx, 'jerseyNumber', Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                      className={inp} style={{ ...inpStyle, padding: '6px 8px', fontSize: '13px' }} min={1} max={99} />
                    <input value={player.name}
                      onChange={e => updatePlayer(idx, 'name', e.target.value)}
                      className={inp} style={{ ...inpStyle, padding: '6px 8px', fontSize: '13px' }} placeholder="이름" />
                    <input value={player.department}
                      onChange={e => updatePlayer(idx, 'department', e.target.value)}
                      className={inp} style={{ ...inpStyle, padding: '6px 8px', fontSize: '13px' }} placeholder="소속" />
                    <div className="flex justify-center">
                      <input type="checkbox" checked={player.verified}
                        onChange={e => updatePlayer(idx, 'verified', e.target.checked)}
                        className="h-4 w-4 rounded accent-emerald-600" />
                    </div>
                    <button onClick={() => removePlayer(idx)}
                      className="flex items-center justify-center text-red-400 hover:text-red-500 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {editing.length < maxPlayers && (
                  <button onClick={addPlayer}
                    className="w-full rounded-lg py-2 text-xs font-medium hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
                    style={{ color: 'var(--btn-solid-bg)', border: '1px dashed var(--card-border)' }}>
                    + 선수 추가
                  </button>
                )}
              </div>
            ) : (
              /* View mode */
              roster.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  등록된 선수가 없습니다
                  {isOrganizer && leagueStatus !== 'finished' && (
                    <div className="mt-3 flex justify-center gap-2">
                      <button onClick={importFromTeamMembers}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ color: 'var(--btn-solid-bg)', border: '1px solid var(--card-border)' }}>
                        팀 멤버 불러오기
                      </button>
                      <button onClick={startEdit}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                        직접 등록
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>등번호</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>이름</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>소속/직함</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>검인</th>
                        {isOrganizer && leagueStatus !== 'finished' && (
                          <th className="px-4 py-2.5 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }} />
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {roster.sort((a, b) => a.jerseyNumber - b.jerseyNumber).map((player, idx) => (
                        <tr key={player.playerId} style={{ borderBottom: '1px solid var(--card-border)' }}
                          className="transition-colors hover:bg-[var(--card-border)]">
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                              style={{ background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }}>
                              {player.jerseyNumber}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{player.name}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{player.department ?? '-'}</td>
                          <td className="px-4 py-2.5 text-center">
                            {player.verified
                              ? <span className="text-emerald-500 text-xs font-semibold">확인</span>
                              : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>미확인</span>
                            }
                          </td>
                          {isOrganizer && leagueStatus !== 'finished' && (
                            <td className="px-4 py-2.5 text-center">
                              {leagueStatus !== 'ongoing' && (
                                <button onClick={() => deletePlayer(player.playerId)}
                                  className="text-red-400 hover:text-red-500 transition-colors"
                                  title="선수 삭제">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
