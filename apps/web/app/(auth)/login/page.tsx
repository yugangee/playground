'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import '@/lib/auth'
import { signIn, signOut as amplifySignOut } from 'aws-amplify/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { refresh, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) router.replace('/team')
  }, [authLoading, user, router])

  if (authLoading) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn({ username: email, password })
      await refresh()
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'UserAlreadyAuthenticatedException') {
        // 이미 로그인된 세션이 남아있는 경우 - sign out 후 재시도
        try {
          await amplifySignOut()
          await signIn({ username: email, password })
          await refresh()
        } catch (retryErr) {
          setError(retryErr instanceof Error ? retryErr.message : '로그인에 실패했습니다')
        }
        return
      }
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mt-1.5 text-sm text-slate-500">계정에 로그인하여 팀을 관리하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
          회원가입
        </Link>
      </div>
    </>
  )
}
