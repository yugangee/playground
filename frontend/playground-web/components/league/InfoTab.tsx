'use client'

import React, { useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { Field, inp, inpStyle } from './shared'
import type { League, LeagueRules, LeagueRegistration, LeagueVenue } from '@/types/manage'

export default function InfoTab({ league, isOrganizer, onUpdate }: {
  league: League; isOrganizer: boolean; onUpdate: (updated: Partial<League>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [rules, setRules] = useState<LeagueRules>(league.rules ?? {})
  const [reg, setReg] = useState<LeagueRegistration>(league.registration ?? {})
  const [venue, setVenue] = useState<LeagueVenue>(league.venue ?? {})
  const [awards, setAwards] = useState<string[]>(league.awards ?? [])
  const [awardsInput, setAwardsInput] = useState('')

  const setRule = (k: string, v: unknown) => setRules(r => ({ ...r, [k]: v }))
  const setRegField = (k: string, v: unknown) => setReg(r => ({ ...r, [k]: v }))
  const setVenueField = (k: string, v: unknown) => setVenue(ve => ({ ...ve, [k]: v }))

  const addAward = () => {
    const trimmed = awardsInput.trim()
    if (trimmed && !awards.includes(trimmed)) {
      setAwards(a => [...a, trimmed])
      setAwardsInput('')
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      // rules: 빈 값 제거 후 저장
      const cleanRules = Object.fromEntries(Object.entries(rules).filter(([, v]) => v != null))
      if (Object.keys(cleanRules).length > 0) body.rules = cleanRules
      // registration: 빈 값 제거 후 저장
      const cleanReg = Object.fromEntries(Object.entries(reg).filter(([, v]) => v != null))
      if (Object.keys(cleanReg).length > 0) body.registration = cleanReg
      if (venue.name || venue.address) body.venue = venue
      if (awards.length > 0) body.awards = awards
      // isPublic은 백엔드가 문자열로 저장하므로 String으로 변환
      body.isPublic = String(reg.visibility !== 'private')

      await manageFetch(`/league/${league.id}`, {
        method: 'PATCH', body: JSON.stringify(body),
      })
      onUpdate({ rules, registration: reg, venue, awards, isPublic: reg.visibility !== 'private' })
      setEditing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장 실패')
    } finally { setSaving(false) }
  }

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</h4>
      {children}
    </div>
  )

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{value ?? '-'}</span>
    </div>
  )

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>대회 정보 편집</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>취소</button>
            <button onClick={save} disabled={saving}
              className="rounded-lg bg-[var(--btn-solid-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--btn-solid-color)] btn-press disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 경기 규칙 편집 */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>경기 규칙</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="쿼터 수">
              <input type="number" value={rules.quartersPerMatch ?? ''} onChange={e => setRule('quartersPerMatch', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="쿼터당 시간(분)">
              <input type="number" value={rules.minutesPerQuarter ?? ''} onChange={e => setRule('minutesPerQuarter', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="하프타임(분)">
              <input type="number" value={rules.halftimeMinutes ?? ''} onChange={e => setRule('halftimeMinutes', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="교체 규정">
              <select value={rules.substitutionRule ?? 'free'} onChange={e => setRule('substitutionRule', e.target.value)} className={inp} style={inpStyle}>
                <option value="free">자유 교체</option>
                <option value="limited">제한 교체</option>
              </select>
            </Field>
            <Field label="경고 누적 기준">
              <input type="number" value={rules.yellowCardAccumulation ?? ''} onChange={e => setRule('yellowCardAccumulation', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="퇴장 시 출전정지">
              <input type="number" value={rules.redCardSuspension ?? ''} onChange={e => setRule('redCardSuspension', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="용병 제한(명)">
              <input type="number" value={rules.maxGuestsPerMatch ?? ''} onChange={e => setRule('maxGuestsPerMatch', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
          </div>
        </div>

        {/* 참가 설정 편집 */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>참가 설정</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="공개 설정">
              <select value={reg.visibility ?? 'public'} onChange={e => setRegField('visibility', e.target.value)} className={inp} style={inpStyle}>
                <option value="public">공개</option>
                <option value="private">비공개</option>
              </select>
            </Field>
            <Field label="참가비">
              <input type="number" value={reg.entryFee ?? ''} onChange={e => setRegField('entryFee', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="최소 팀 수">
              <input type="number" value={reg.minTeams ?? ''} onChange={e => setRegField('minTeams', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
            <Field label="최대 팀 수">
              <input type="number" value={reg.maxTeams ?? ''} onChange={e => setRegField('maxTeams', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} />
            </Field>
          </div>
          <Field label="참가 마감일">
            <input type="date" value={reg.registrationDeadline ?? ''} onChange={e => setRegField('registrationDeadline', e.target.value || undefined)} className={inp} style={inpStyle} />
          </Field>
        </div>

        {/* 장소 편집 */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>장소</h4>
          <Field label="경기장 이름">
            <input value={venue.name ?? ''} onChange={e => setVenueField('name', e.target.value || undefined)} className={inp} style={inpStyle} />
          </Field>
          <Field label="주소">
            <input value={venue.address ?? ''} onChange={e => setVenueField('address', e.target.value || undefined)} className={inp} style={inpStyle} />
          </Field>
          <Field label="주차 안내">
            <input value={venue.parkingInfo ?? ''} onChange={e => setVenueField('parkingInfo', e.target.value || undefined)} className={inp} style={inpStyle} />
          </Field>
        </div>

        {/* 시상 편집 */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>시상</h4>
          <div className="flex gap-2">
            <input value={awardsInput} onChange={e => setAwardsInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAward() } }}
              className={inp} style={inpStyle} placeholder="시상 항목 입력 후 Enter" />
            <button type="button" onClick={addAward}
              className="flex-shrink-0 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] btn-press">추가</button>
          </div>
          {awards.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {awards.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  {a}
                  <button onClick={() => setAwards(aw => aw.filter((_, idx) => idx !== i))} className="hover:opacity-60">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 읽기 전용 뷰
  return (
    <div className="space-y-4">
      {isOrganizer && (
        <div className="flex justify-end">
          <button onClick={() => setEditing(true)}
            className="rounded-lg bg-[var(--btn-solid-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--btn-solid-color)] btn-press">
            편집
          </button>
        </div>
      )}

      <InfoCard title="경기 규칙">
        <InfoRow label="쿼터 수" value={rules.quartersPerMatch ?? 4} />
        <InfoRow label="쿼터당 시간" value={rules.minutesPerQuarter ? `${rules.minutesPerQuarter}분` : '15분'} />
        <InfoRow label="하프타임" value={rules.halftimeMinutes ? `${rules.halftimeMinutes}분` : '5분'} />
        <InfoRow label="교체 규정" value={rules.substitutionRule === 'limited' ? `제한 (${rules.maxSubstitutions ?? '-'}회)` : '자유 교체'} />
        <InfoRow label="경고 누적 기준" value={`${rules.yellowCardAccumulation ?? 2}장 → 출전정지`} />
        <InfoRow label="퇴장 시 출전정지" value={`${rules.redCardSuspension ?? 1}경기`} />
        {league.type === 'tournament' && <InfoRow label="승부차기" value={rules.penaltyShootout !== false ? '사용' : '미사용'} />}
        <InfoRow label="경기당 용병 제한" value={`${rules.maxGuestsPerMatch ?? 3}명`} />
      </InfoCard>

      <InfoCard title="참가 정보">
        <InfoRow label="공개 설정" value={reg.visibility === 'private' ? '비공개 (초대 전용)' : '공개'} />
        <InfoRow label="참가비" value={reg.entryFee ? `${reg.entryFee.toLocaleString()}원` : '무료'} />
        <InfoRow label="참가팀 수 제한" value={`${reg.minTeams ?? 4}팀 ~ ${reg.maxTeams ?? 16}팀`} />
        {reg.registrationDeadline && <InfoRow label="참가 마감일" value={new Date(reg.registrationDeadline).toLocaleDateString('ko-KR')} />}
      </InfoCard>

      {(venue.name || venue.address) && (
        <InfoCard title="장소">
          {venue.name && <InfoRow label="경기장" value={venue.name} />}
          {venue.address && <InfoRow label="주소" value={venue.address} />}
          {venue.parkingInfo && <InfoRow label="주차 안내" value={venue.parkingInfo} />}
        </InfoCard>
      )}

      {awards.length > 0 && (
        <InfoCard title="시상">
          <div className="flex flex-wrap gap-2">
            {awards.map((a, i) => (
              <span key={i} className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                🏅 {a}
              </span>
            ))}
          </div>
        </InfoCard>
      )}

      {!venue.name && !venue.address && awards.length === 0 && !rules.quartersPerMatch && !reg.entryFee && (
        <div className="rounded-2xl border-2 border-dashed py-10 text-center text-sm"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          {isOrganizer ? '대회 정보를 설정해주세요. 상단의 "편집" 버튼을 클릭하세요.' : '대회 정보가 아직 설정되지 않았습니다.'}
        </div>
      )}
    </div>
  )
}
