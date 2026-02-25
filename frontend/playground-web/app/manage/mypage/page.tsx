'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { manageFetch } from '@/lib/manageFetch'
import type { Team } from '@/types/manage'

const API = process.env.NEXT_PUBLIC_API_URL

export default function MypagePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
    manageFetch('/team').then(setTeams).catch(() => {})
  }, [user?.name])

  const saveName = async () => {
    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      setEditingName(false)
    } finally { setSaving(false) }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const initials = name ? name.slice(0, 2).toUpperCase() : (user?.name?.charAt(0).toUpperCase() ?? '?')

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">마이페이지</h1>
        <p className="mt-1 text-sm text-slate-500">프로필과 내 팀을 확인합니다</p>
      </div>

      {/* Profile Card */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">{name || '이름 없음'}</div>
            <div className="text-sm text-slate-400">{user?.email ?? '-'}</div>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-50 pt-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">이메일</label>
            <div className="text-sm text-slate-700">{user?.email ?? '-'}</div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">이름</label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={name} onChange={e => setName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" />
                <button onClick={saveName} disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => setEditingName(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{name || '—'}</span>
                <button onClick={() => setEditingName(true)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                  수정
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Teams */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">내 팀 <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{teams.length}</span></h2>
        {teams.length === 0 ? (
          <p className="text-sm text-slate-400">소속된 팀이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {teams.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.region}</div>
                  </div>
                </div>
                {t.leaderId === user?.username && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">대표</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
        </svg>
        로그아웃
      </button>
    </div>
  )
}
