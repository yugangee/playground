'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

interface TeamInfo {
  id: string
  name: string
  region?: string
  description?: string
}

function JoinContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [team, setTeam] = useState<TeamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 초대 링크입니다.')
      setLoading(false)
      return
    }
    apiFetch(`/team/invite/${token}`)
      .then(data => setTeam(data.team))
      .catch(() => setError('초대 링크를 찾을 수 없거나 만료되었습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  const join = async () => {
    setJoining(true)
    try {
      await apiFetch(`/team/invite/${token}/join`, { method: 'POST' })
      setDone(true)
      setTimeout(() => router.push('/team'), 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '가입에 실패했습니다.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
    </div>
  )

  if (done) return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
        <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <p className="text-base font-semibold text-slate-900">팀 가입 완료!</p>
      <p className="text-sm text-slate-500">팀 페이지로 이동합니다...</p>
    </div>
  )

  return (
    <div className="flex flex-col items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white">
            {team ? team.name.charAt(0) : '?'}
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {team ? `${team.name}에 초대받았습니다` : '팀 초대'}
          </h1>
          {team?.region && <p className="mt-1 text-sm text-slate-500">{team.region}</p>}
          {team?.description && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{team.description}</p>}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </div>
        ) : (
          <button
            onClick={join}
            disabled={joining || !team}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {joining ? '가입 중...' : '팀 가입하기'}
          </button>
        )}

        <button onClick={() => router.push('/')} className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50">
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <Suspense fallback={
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
        </div>
      }>
        <JoinContent />
      </Suspense>
    </div>
  )
}
