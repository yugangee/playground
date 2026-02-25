'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import type { Team, League } from '@/types/manage'

type Tab = 'teams' | 'leagues'

const AGE_GROUPS = [
  { value: '', label: '전체 연령' },
  { value: 'elementary', label: '초등' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
  { value: 'university', label: '대학' },
  { value: 'worker', label: '직장인' },
  { value: 'senior', label: '시니어' },
  { value: 'mixed', label: '혼합' },
]

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('teams')

  const tabs = [
    { key: 'teams' as Tab, label: '팀' },
    { key: 'leagues' as Tab, label: '리그 & 토너먼트' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">탐색</h1>
        <p className="mt-1 text-sm text-slate-500">팀, 리그, 토너먼트를 탐색합니다</p>
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

      {tab === 'teams' && <TeamsDiscover />}
      {tab === 'leagues' && <LeaguesDiscover />}
    </div>
  )
}

function TeamsDiscover() {
  const [teams, setTeams] = useState<(Team & { hasOpenRecruitment?: boolean })[]>([])
  const [region, setRegion] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [onlyRecruiting, setOnlyRecruiting] = useState(false)
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (region) params.set('region', region)
      if (ageGroup) params.set('ageGroup', ageGroup)
      if (onlyRecruiting) params.set('recruiting', 'true')
      setTeams(await manageFetch(`/discover/teams?${params}`))
    } finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  const favorite = async (teamId: string) => {
    await manageFetch('/social/favorites', { method: 'POST', body: JSON.stringify({ targetId: teamId, targetType: 'team' }) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input value={region} onChange={e => setRegion(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          placeholder="지역 검색 (예: 서울)" />
        <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10">
          {AGE_GROUPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button
          onClick={() => setOnlyRecruiting(v => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
            onlyRecruiting
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${onlyRecruiting ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          모집 중만 보기
        </button>
        <button onClick={search} disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      {teams.length === 0 ? <Empty text="검색 결과가 없습니다" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t => (
            <div key={t.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-base font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.region}</div>
                  </div>
                </div>
                <button onClick={() => favorite(t.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-amber-50 hover:text-amber-400"
                  title="즐겨찾기">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {AGE_GROUPS.find(a => a.value === t.ageGroup)?.label ?? t.ageGroup}
                </span>
                {t.hasOpenRecruitment && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">모집중</span>
                )}
              </div>
              {t.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{t.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LeaguesDiscover() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [region, setRegion] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (region) params.set('region', region)
      if (type) params.set('type', type)
      setLeagues(await manageFetch(`/discover/leagues?${params}`))
    } finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  const favorite = async (leagueId: string) => {
    await manageFetch('/social/favorites', { method: 'POST', body: JSON.stringify({ targetId: leagueId, targetType: 'league' }) })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <input value={region} onChange={e => setRegion(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          placeholder="지역 검색" />
        <select value={type} onChange={e => setType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10">
          <option value="">전체 유형</option>
          <option value="league">리그</option>
          <option value="tournament">토너먼트</option>
        </select>
        <button onClick={search} disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      {leagues.length === 0 ? <Empty text="검색 결과가 없습니다" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map(l => (
            <div key={l.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{l.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      l.type === 'tournament' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {l.type === 'tournament' ? '토너먼트' : '리그'}
                    </span>
                  </div>
                </div>
                <button onClick={() => favorite(l.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-amber-50 hover:text-amber-400"
                  title="즐겨찾기">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                </button>
              </div>
              {l.region && <div className="text-sm text-slate-500">{l.region}</div>}
              {l.startDate && <div className="mt-1 text-xs text-slate-400">{l.startDate} ~ {l.endDate ?? '미정'}</div>}
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
