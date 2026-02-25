'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'

interface Friend { userId: string; friendId: string; createdAt: string }
interface Favorite { userId: string; targetId: string; targetType: string; createdAt: string }

type Tab = 'friends' | 'favorites'

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>('friends')

  const tabs = [
    { key: 'friends' as Tab, label: '친구' },
    { key: 'favorites' as Tab, label: '즐겨찾기' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">소셜</h1>
        <p className="mt-1 text-sm text-slate-500">친구 추가, 즐겨찾기 팀을 관리합니다</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'friends' && <FriendsTab />}
      {tab === 'favorites' && <FavoritesTab />}
    </div>
  )
}

function FriendsTab() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => { try { setFriends(await manageFetch('/social/friends')) } catch {} }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!input.trim()) return
    setLoading(true)
    try { await manageFetch('/social/friends', { method: 'POST', body: JSON.stringify({ friendId: input.trim() }) }); setInput(''); load() }
    finally { setLoading(false) }
  }

  const remove = async (friendId: string) => {
    await manageFetch(`/social/friends/${friendId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className={inp} placeholder="친구 userId 입력 후 Enter" />
        <button onClick={add} disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
          추가
        </button>
      </div>

      {friends.length === 0 ? <Empty text="친구가 없습니다" /> : (
        <div className="space-y-2">
          {friends.map(f => (
            <div key={f.friendId} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {f.friendId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{f.friendId}</div>
                  <div className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString('ko-KR')}</div>
                </div>
              </div>
              <button onClick={() => remove(f.friendId)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FavoritesTab() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [input, setInput] = useState('')
  const [type, setType] = useState('team')
  const [loading, setLoading] = useState(false)

  const load = async () => { try { setFavorites(await manageFetch('/social/favorites')) } catch {} }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!input.trim()) return
    setLoading(true)
    try { await manageFetch('/social/favorites', { method: 'POST', body: JSON.stringify({ targetId: input.trim(), targetType: type }) }); setInput(''); load() }
    finally { setLoading(false) }
  }

  const remove = async (targetId: string) => {
    await manageFetch(`/social/favorites/${targetId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <select value={type} onChange={e => setType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10">
          <option value="team">팀</option>
          <option value="league">리그</option>
        </select>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className={inp} placeholder="ID 입력" />
        <button onClick={add} disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
          추가
        </button>
      </div>

      {favorites.length === 0 ? <Empty text="즐겨찾기가 없습니다" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map(f => (
            <div key={f.targetId} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white ${
                  f.targetType === 'team' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}>
                  {f.targetId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{f.targetId}</div>
                  <span className={`text-xs font-medium ${f.targetType === 'team' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {f.targetType === 'team' ? '팀' : '리그'}
                  </span>
                </div>
              </div>
              <button onClick={() => remove(f.targetId)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}

const inp = 'flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
