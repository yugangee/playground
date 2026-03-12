'use client'

import React, { useState, useEffect } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { AGE_GROUP_LABEL, SPORT_TYPE_LABEL } from './shared'
import type { Team, TeamMember } from '@/types/manage'

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
        style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

export default function TeamDetailModal({ team, onClose }: {
  team: Team; onClose: () => void
}) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    manageFetch(`/team/${team.id}/members`)
      .then(data => setMembers(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [team.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--card-border)' }}>

        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name}
                className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ background: 'var(--btn-solid-bg)' }}>
                {team.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {team.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {team.region && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{team.region}</span>
                )}
                {team.sportType && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                    {SPORT_TYPE_LABEL[team.sportType] ?? team.sportType}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 설명 */}
        {team.description && (
          <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>{team.description}</p>
        )}

        {/* 정보 그리드 */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {team.ageGroup && <InfoChip label="연령대" value={AGE_GROUP_LABEL[team.ageGroup] ?? team.ageGroup} />}
          <InfoChip label="활동일" value={team.activityDays?.join(', ') || '-'} />
          {team.activityTime && <InfoChip label="활동 시간" value={team.activityTime} />}
          <InfoChip label="창단일" value={new Date(team.createdAt).toLocaleDateString('ko-KR')} />
        </div>

        {/* 멤버 목록 */}
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}>
          멤버 ({members.length})
        </h3>
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
          </div>
        ) : members.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>멤버 정보 없음</div>
        ) : (
          <div className="space-y-1.5">
            {members.map(m => (
              <div key={m.userId} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {m.name}
                  </span>
                  {m.role === 'leader' && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                      주장
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {m.position || ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
