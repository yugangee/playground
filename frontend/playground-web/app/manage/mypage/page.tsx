'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { manageFetch } from '@/lib/manageFetch'
import type { Team } from '@/types/manage'
import { LogOut, User, Mail, Edit2, Check, X, Shield } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }
  return { toasts, show }
}

export default function MypagePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [saving, setSaving] = useState(false)
  const { toasts, show } = useToast()

  useEffect(() => {
    if (user?.name) setName(user.name)
    manageFetch('/team').then(setTeams).catch(() => { })
  }, [user?.name])

  const saveName = async () => {
    setSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        show('이름이 저장됐습니다', 'success')
        setEditingName(false)
      } else {
        show('저장에 실패했습니다', 'error')
      }
    } catch {
      show('저장 중 오류가 발생했습니다', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : (user?.name?.charAt(0).toUpperCase() ?? '?')

  return (
    <div className="max-w-lg relative">
      {/* Toast 알림 */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-xl border animate-toast-in"
            style={{
              background: t.type === 'success'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.15))',
              borderColor: t.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              color: t.type === 'success' ? '#10b981' : '#ef4444',
              backdropFilter: 'blur(8px)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>마이페이지</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>프로필과 내 팀을 확인합니다</p>
      </div>

      {/* Profile Card */}
      <div
        className="mb-5 rounded-2xl p-6"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* 아바타 + 이름/이메일 */}
        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}
          >
            {initials}
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {name || '이름 없음'}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email ?? '-'}</div>
          </div>
        </div>

        <div className="space-y-4" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
          {/* 이메일 */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              <Mail size={11} />
              이메일
            </label>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email ?? '-'}</div>
          </div>

          {/* 이름 */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              <User size={11} />
              이름
            </label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right, #c026d3, #7c3aed)' }}
                >
                  <Check size={14} />
                  {saving ? '저장 중' : '저장'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-xl p-2.5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{name || '—'}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#c026d3' }}
                >
                  <Edit2 size={11} />
                  수정
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Teams */}
      <div
        className="mb-5 rounded-2xl p-6"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        <h2 className="mb-4 font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield size={15} className="text-fuchsia-400" />
          내 팀
          <span
            className="ml-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(192,38,211,0.12)', color: '#c026d3' }}
          >
            {teams.length}
          </span>
        </h2>
        {teams.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>소속된 팀이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {teams.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.region}</div>
                  </div>
                </div>
                {t.leaderId === user?.username && (
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(192,38,211,0.12)', color: '#c026d3' }}
                  >
                    대표
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-colors hover:opacity-90"
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444',
        }}
      >
        <LogOut size={15} />
        로그아웃
      </button>
    </div>
  )
}
