'use client'

import React, { useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { BackBtn, Field, inp, inpStyle } from './shared'
import type { LeagueRules, LeagueRegistration, LeagueVenue } from '@/types/manage'

interface WizardProps {
  teamId: string
  onSuccess: () => void
  onCancel: () => void
}

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['기본 정보', '경기 규칙', '참가 설정', '장소/시상']

export default function CreateWizard({ teamId, onSuccess, onCancel }: WizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: 기본 정보
  const [form, setForm] = useState({
    name: '', type: 'league', region: '', startDate: '', endDate: '', description: '', isPublic: true, organizerTeamId: teamId,
    bracketSize: 8 as 4 | 8 | 16 | 32,
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  // Step 2: 경기 규칙
  const [rules, setRules] = useState<LeagueRules>({
    quartersPerMatch: 4,
    minutesPerQuarter: 15,
    halftimeMinutes: 5,
    substitutionRule: 'free',
    maxSubstitutions: undefined,
    yellowCardAccumulation: 2,
    redCardSuspension: 1,
    penaltyShootout: true,
    maxGuestsPerMatch: 3,
  })
  const setRule = (k: string, v: unknown) => setRules(r => ({ ...r, [k]: v }))

  // Step 3: 참가 설정
  const [reg, setReg] = useState<LeagueRegistration>({
    visibility: 'public',
    entryFee: undefined,
    minTeams: 4,
    maxTeams: 16,
    registrationDeadline: undefined,
  })
  const setRegField = (k: string, v: unknown) => setReg(r => ({ ...r, [k]: v }))

  // Step 4: 장소/시상
  const [venue, setVenue] = useState<LeagueVenue>({})
  const setVenueField = (k: string, v: unknown) => setVenue(ve => ({ ...ve, [k]: v }))
  const [awardsInput, setAwardsInput] = useState('')
  const [awards, setAwards] = useState<string[]>([])

  const addAward = () => {
    const trimmed = awardsInput.trim()
    if (trimmed && !awards.includes(trimmed)) {
      setAwards(a => [...a, trimmed])
      setAwardsInput('')
    }
  }
  const removeAward = (idx: number) => setAwards(a => a.filter((_, i) => i !== idx))

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        ...form,
        bracketSize: form.type === 'tournament' ? form.bracketSize : undefined,
        isPublic: reg.visibility === 'public' ? true : form.isPublic,
        rules,
        registration: reg,
        venue: (venue.name || venue.address) ? venue : undefined,
        awards: awards.length > 0 ? awards : undefined,
      }
      await manageFetch('/league', { method: 'POST', body: JSON.stringify(body) })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '생성 실패')
    } finally { setLoading(false) }
  }

  const canNext = step === 1 ? !!form.name : true
  const next = () => { if (step < 4) setStep((step + 1) as Step) }
  const prev = () => { if (step > 1) setStep((step - 1) as Step) }

  return (
    <div className="max-w-lg">
      <div className="mb-8 flex items-center gap-3">
        <BackBtn onClick={onCancel} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>대회 만들기</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>새로운 대회를 개설하세요</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <React.Fragment key={i}>
              {i > 0 && <div className="h-px flex-1" style={{ background: isDone ? 'var(--btn-solid-bg)' : 'var(--card-border)' }} />}
              <button
                onClick={() => { if (isDone || isActive) setStep(stepNum) }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={isActive
                  ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                  : isDone
                    ? { color: 'var(--btn-solid-bg)' }
                    : { color: 'var(--text-muted)' }}>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={isActive
                    ? { background: 'rgba(255,255,255,0.2)', color: 'var(--btn-solid-color)' }
                    : isDone
                      ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                      : { background: 'var(--card-border)', color: 'var(--text-muted)' }}>
                  {isDone ? '✓' : stepNum}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

        {/* Step 1: 기본 정보 */}
        {step === 1 && (
          <>
            <Field label="이름" required>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} style={inpStyle} placeholder="2025 봄 리그" />
            </Field>
            <Field label="유형">
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inp} style={inpStyle}>
                <option value="league">리그 (라운드 로빈)</option>
                <option value="tournament">토너먼트 (단판 승부)</option>
              </select>
            </Field>
            {form.type === 'tournament' && (
              <Field label="대진표 규모">
                <div className="grid grid-cols-4 gap-2">
                  {([4, 8, 16, 32] as const).map(size => (
                    <button key={size} type="button"
                      onClick={() => set('bracketSize', size)}
                      className="rounded-xl py-3 text-sm font-semibold transition-all"
                      style={form.bracketSize === size
                        ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
                        : { color: 'var(--text-muted)', border: '1px solid var(--card-border)' }
                      }>
                      {size}강
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {form.bracketSize}팀 이하 참가 가능 · 부전승(BYE) 자동 적용
                </p>
              </Field>
            )}
            <Field label="지역">
              <input value={form.region} onChange={e => set('region', e.target.value)} className={inp} style={inpStyle} placeholder="서울" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="시작일">
                <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp} style={inpStyle} />
              </Field>
              <Field label="종료일">
                <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp} style={inpStyle} />
              </Field>
            </div>
            <Field label="설명">
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inp} style={inpStyle} rows={3} placeholder="대회에 대한 설명을 입력하세요" />
            </Field>
          </>
        )}

        {/* Step 2: 경기 규칙 */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="쿼터 수">
                <input type="number" value={rules.quartersPerMatch ?? ''} onChange={e => setRule('quartersPerMatch', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={1} max={8} />
              </Field>
              <Field label="쿼터당 시간(분)">
                <input type="number" value={rules.minutesPerQuarter ?? ''} onChange={e => setRule('minutesPerQuarter', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={1} />
              </Field>
            </div>
            <Field label="하프타임(분)">
              <input type="number" value={rules.halftimeMinutes ?? ''} onChange={e => setRule('halftimeMinutes', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={0} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="교체 규정">
                <select value={rules.substitutionRule ?? 'free'} onChange={e => setRule('substitutionRule', e.target.value)} className={inp} style={inpStyle}>
                  <option value="free">자유 교체</option>
                  <option value="limited">제한 교체</option>
                </select>
              </Field>
              {rules.substitutionRule === 'limited' && (
                <Field label="최대 교체 수">
                  <input type="number" value={rules.maxSubstitutions ?? ''} onChange={e => setRule('maxSubstitutions', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={1} />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="경고 누적 기준(장)">
                <input type="number" value={rules.yellowCardAccumulation ?? ''} onChange={e => setRule('yellowCardAccumulation', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={1} />
              </Field>
              <Field label="퇴장 시 출전정지(경기)">
                <input type="number" value={rules.redCardSuspension ?? ''} onChange={e => setRule('redCardSuspension', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={1} />
              </Field>
            </div>
            <Field label="경기당 용병 제한(명)">
              <input type="number" value={rules.maxGuestsPerMatch ?? ''} onChange={e => setRule('maxGuestsPerMatch', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={0} />
            </Field>
            {form.type === 'tournament' && (
              <label className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={rules.penaltyShootout ?? true} onChange={e => setRule('penaltyShootout', e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600" />
                동점 시 승부차기 진행
              </label>
            )}
          </>
        )}

        {/* Step 3: 참가 설정 */}
        {step === 3 && (
          <>
            <Field label="공개 설정">
              <select value={reg.visibility ?? 'public'} onChange={e => { setRegField('visibility', e.target.value); set('isPublic', e.target.value === 'public') }} className={inp} style={inpStyle}>
                <option value="public">공개 (누구나 탐색·참가 가능)</option>
                <option value="private">비공개 (초대 전용)</option>
              </select>
            </Field>
            <Field label="참가비 (원)">
              <input type="number" value={reg.entryFee ?? ''} onChange={e => setRegField('entryFee', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} placeholder="0" min={0} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="최소 참가팀">
                <input type="number" value={reg.minTeams ?? ''} onChange={e => setRegField('minTeams', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={2} />
              </Field>
              <Field label="최대 참가팀">
                <input type="number" value={reg.maxTeams ?? ''} onChange={e => setRegField('maxTeams', e.target.value ? Number(e.target.value) : undefined)} className={inp} style={inpStyle} min={2} />
              </Field>
            </div>
            <Field label="참가 마감일">
              <input type="date" value={reg.registrationDeadline ?? ''} onChange={e => setRegField('registrationDeadline', e.target.value || undefined)} className={inp} style={inpStyle} />
            </Field>
          </>
        )}

        {/* Step 4: 장소/시상 */}
        {step === 4 && (
          <>
            <Field label="경기장 이름">
              <input value={venue.name ?? ''} onChange={e => setVenueField('name', e.target.value || undefined)} className={inp} style={inpStyle} placeholder="서울 월드컵경기장" />
            </Field>
            <Field label="주소">
              <input value={venue.address ?? ''} onChange={e => setVenueField('address', e.target.value || undefined)} className={inp} style={inpStyle} placeholder="서울시 마포구..." />
            </Field>
            <Field label="주차 안내">
              <input value={venue.parkingInfo ?? ''} onChange={e => setVenueField('parkingInfo', e.target.value || undefined)} className={inp} style={inpStyle} placeholder="주차 가능 여부 및 안내" />
            </Field>
            <Field label="시상 항목">
              <div className="flex gap-2">
                <input value={awardsInput} onChange={e => setAwardsInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAward() } }}
                  className={inp} style={inpStyle} placeholder="우승, MVP, 득점왕..." />
                <button type="button" onClick={addAward}
                  className="flex-shrink-0 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] hover:opacity-85">
                  추가
                </button>
              </div>
              {awards.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {awards.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {a}
                      <button onClick={() => removeAward(i)} className="hover:opacity-60">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </>
        )}

        {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>{error}</div>}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button type="button" onClick={prev}
              className="rounded-xl px-5 py-3 text-sm font-semibold transition-colors hover:opacity-85"
              style={{ color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
              이전
            </button>
          )}
          <div className="flex-1" />
          {step < 4 && step > 1 && (
            <button type="button" onClick={submit} disabled={loading}
              className="rounded-xl px-5 py-3 text-sm font-medium transition-colors hover:opacity-85"
              style={{ color: 'var(--text-muted)' }}>
              건너뛰고 만들기
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={next} disabled={!canNext}
              className="rounded-xl bg-[var(--btn-solid-bg)] px-5 py-3 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
              다음
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={loading}
              className="rounded-xl bg-[var(--btn-solid-bg)] px-5 py-3 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? '생성 중...' : '만들기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
