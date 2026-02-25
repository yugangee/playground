'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import '@/lib/auth'
import { signUp, confirmSignUp } from 'aws-amplify/auth'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'signup' | 'confirm'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { name, email } },
      })
      setStep('confirm')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'confirm') {
    return (
      <>
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">이메일 인증</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{email}</span>로 발송된<br />
            인증 코드를 입력하세요
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">인증 코드</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="6자리 코드"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg font-mono tracking-[0.5em] outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
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
            {loading ? '확인 중...' : '인증 완료'}
          </button>
        </form>

        <button
          onClick={() => setStep('signup')}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600"
        >
          ← 돌아가기
        </button>
      </>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mt-1.5 text-sm text-slate-500">Playground에 오신 걸 환영합니다</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="실명 입력"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
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
            placeholder="8자 이상"
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
          {loading ? '처리 중...' : '가입하기'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
          로그인
        </Link>
      </div>
    </>
  )
}
