'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { manageFetch } from '@/lib/manageFetch'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface InviteInfo {
  invite: { teamId: string; expiresAt: string }
  team: { id: string; name: string; region: string; description?: string; ageGroup: string } | null
}

const AGE_LABEL: Record<string, string> = {
  elementary: '초등', middle: '중등', high: '고등',
  university: '대학', worker: '직장인', senior: '시니어', mixed: '혼합',
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" /></div>}>
      <JoinContent />
    </Suspense>
  )
}

function JoinContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const token = params.get('token') ?? ''

  const [info, setInfo]     = useState<InviteInfo | null>(null)
  const [phase, setPhase]   = useState<'loading' | 'ready' | 'joining' | 'done' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!token) { setPhase('error'); setErrMsg('초대 링크가 올바르지 않습니다.'); return }
    manageFetch(`/team/invite/${token}`)
      .then((data: InviteInfo) => { setInfo(data); setPhase('ready') })
      .catch(() => { setPhase('error'); setErrMsg('초대 링크가 만료되었거나 존재하지 않습니다.') })
  }, [token])

  const join = async () => {
    if (!user) {
      // 로그인 후 돌아올 수 있게 저장
      sessionStorage.setItem('join_token', token)
      router.push(`/login?redirect=/join?token=${token}`)
      return
    }
    setPhase('joining')
    try {
      await manageFetch(`/team/invite/${token}/join`, { method: 'POST' })
      setPhase('done')
    } catch (e: unknown) {
      setPhase('error')
      setErrMsg(e instanceof Error ? e.message : '팀 가입에 실패했습니다.')
    }
  }

  if (authLoading || phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{errMsg}</p>
          <Link href="/" className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}>
            홈으로
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}>
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {info?.team?.name ?? '팀'}에 합류했어요!
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>이제 일정·채팅·경기 기록을 함께 관리할 수 있어요</p>
          </div>
          <Link href="/schedule" className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}>
            일정 보러 가기
          </Link>
        </div>
      </div>
    )
  }

  const team = info?.team
  const expiry = info?.invite.expiresAt ? new Date(info.invite.expiresAt) : null
  const expired = expiry ? expiry < new Date() : false

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        {/* 초대 헤더 */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}>
            {team?.name?.charAt(0) ?? '?'}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            팀 초대
          </p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {team?.name ?? '알 수 없는 팀'}
          </h1>
          {team?.region && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {team.region} · {AGE_LABEL[team.ageGroup] ?? team.ageGroup}
            </p>
          )}
          {team?.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {team.description}
            </p>
          )}
        </div>

        {/* 정보 카드 */}
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <svg className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            팀 멤버로 합류하게 됩니다
          </div>
          {expiry && (
            <div className="flex items-center gap-2.5 text-sm" style={{ color: expired ? '#f87171' : 'var(--text-secondary)' }}>
              <svg className="h-4 w-4 shrink-0" style={{ color: expired ? '#f87171' : 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {expired
                ? '초대 링크가 만료되었습니다'
                : `유효기간: ${expiry.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
            </div>
          )}
        </div>

        {/* 로그인 안내 (미로그인) */}
        {!user && (
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            가입하려면 로그인이 필요합니다.{' '}
            <Link href={`/signup?redirect=/join?token=${token}`} className="font-semibold" style={{ color: '#a78bfa' }}>
              회원가입
            </Link>{' '}
            으로 30초 안에 완료하세요.
          </p>
        )}

        {/* CTA */}
        <button
          onClick={join}
          disabled={expired || phase === 'joining'}
          className="w-full rounded-2xl py-4 text-base font-bold text-white transition-opacity disabled:opacity-50"
          style={{ background: expired ? 'var(--card-border)' : 'linear-gradient(to right, #c026d3, #7c3aed)' }}
        >
          {phase === 'joining' ? '가입 중...' : expired ? '만료된 초대' : `${team?.name ?? '팀'} 합류하기`}
        </button>
      </div>
    </div>
  )
}
