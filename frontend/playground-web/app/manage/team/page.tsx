'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import type { Team, TeamMember, PlayerStats, Uniform, Equipment, Recruitment } from '@/types/manage'

type PlayerStat = PlayerStats
type RecruitPost = Recruitment

type View = 'list' | 'create' | 'detail'
type TeamTab = 'members' | 'stats' | 'uniforms' | 'recruitment'

export default function TeamPage() {
  const [view, setView] = useState<View>('list')
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const { isLeader } = useTeam()

  const loadTeams = async () => {
    try {
      const data = await manageFetch('/team')
      setTeams(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTeams() }, [])

  const selectTeam = async (team: Team) => {
    setSelected(team)
    const data = await manageFetch(`/team/${team.id}/members`)
    setMembers(data)
    setView('detail')
  }

  if (loading) return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
    </div>
  )

  if (view === 'create') return <CreateTeamForm onSuccess={() => { loadTeams(); setView('list') }} onCancel={() => setView('list')} />
  if (view === 'detail' && selected) return <TeamDetail team={selected} members={members} onBack={() => setView('list')} onMembersChange={setMembers} isLeader={isLeader} />

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">팀 관리</h1>
          <p className="mt-1 text-sm text-slate-500">내가 속한 팀을 관리합니다</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          팀 만들기
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">아직 팀이 없습니다</p>
          <p className="mt-1 text-xs text-slate-400">팀을 만들어 선수들을 관리해보세요</p>
          <button
            onClick={() => setView('create')}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            첫 팀 만들기
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => selectTeam(team)}
              className="group rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:border-emerald-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white">
                  {team.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{team.name}</div>
                  <div className="text-xs text-slate-400">{team.region}</div>
                </div>
              </div>
              {team.description && (
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{team.description}</p>
              )}
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                <span>상세 보기</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateTeamForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', region: '', description: '', ageGroup: 'mixed', sportType: 'soccer', isPublic: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await manageFetch('/team', { method: 'POST', body: JSON.stringify({ ...form, activityDays: [] }) })
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '팀 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8 flex items-center gap-3">
        <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">팀 만들기</h1>
          <p className="mt-0.5 text-sm text-slate-500">새로운 축구팀을 등록하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
        <Field label="팀 이름" required>
          <input value={form.name} onChange={e => set('name', e.target.value)} required className={inp} placeholder="FC 서울" />
        </Field>
        <Field label="활동 지역" required>
          <input value={form.region} onChange={e => set('region', e.target.value)} required className={inp} placeholder="서울 강남구" />
        </Field>
        <Field label="팀 소개">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inp} rows={3} placeholder="팀 소개를 입력하세요" />
        </Field>
        <Field label="종목">
          <select value={form.sportType} onChange={e => set('sportType', e.target.value)} className={inp}>
            <optgroup label="⚽ 축구형 (대전형)">
              <option value="soccer">⚽ 축구</option>
              <option value="futsal">⚽ 풋살</option>
            </optgroup>
            <optgroup label="🏀 기타 대전형">
              <option value="basketball">🏀 농구</option>
              <option value="baseball">⚾ 야구</option>
              <option value="volleyball">🏐 배구</option>
              <option value="ice_hockey">🏒 아이스하키</option>
            </optgroup>
            <optgroup label="🏃 동아리형">
              <option value="running">🏃 러닝크루</option>
              <option value="snowboard">🏂 스노보드</option>
              <option value="badminton">🏸 배드민턴</option>
            </optgroup>
          </select>
        </Field>
        <Field label="연령대">
          <select value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} className={inp}>
            <option value="elementary">초등</option>
            <option value="middle">중등</option>
            <option value="high">고등</option>
            <option value="university">대학</option>
            <option value="worker">직장인</option>
            <option value="senior">시니어</option>
            <option value="mixed">혼합</option>
          </select>
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)}
            className="h-4 w-4 rounded accent-emerald-600" />
          공개 팀으로 설정
        </label>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? '생성 중...' : '팀 만들기'}
        </button>
      </form>
    </div>
  )
}

function TeamDetail({ team, members, onBack, onMembersChange, isLeader }: {
  team: Team
  members: TeamMember[]
  onBack: () => void
  onMembersChange: (m: TeamMember[]) => void
  isLeader: boolean
}) {
  const [tab, setTab] = useState<TeamTab>('members')
  const [copyLabel, setCopyLabel] = useState('초대 링크')

  const copyInvite = async () => {
    try {
      const data = await manageFetch(`/team/${team.id}/invite`, { method: 'POST' })
      await navigator.clipboard.writeText(data.inviteUrl)
      setCopyLabel('복사됨!')
      setTimeout(() => setCopyLabel('초대 링크'), 1500)
    } catch {
      setCopyLabel('오류')
      setTimeout(() => setCopyLabel('초대 링크'), 1500)
    }
  }

  const TABS: { key: TeamTab; label: string }[] = [
    { key: 'members',     label: '팀원' },
    { key: 'stats',       label: '스탯' },
    { key: 'uniforms',    label: '유니폼·용품' },
    { key: 'recruitment', label: '모집 공고' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white">
            {team.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
            <p className="text-sm text-slate-500">{team.region} · {members.length}명</p>
          </div>
          {isLeader && (
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              {copyLabel}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'members'     && <MembersTab     team={team} members={members} onMembersChange={onMembersChange} isLeader={isLeader} />}
      {tab === 'stats'       && <StatsTab       team={team} members={members} isLeader={isLeader} />}
      {tab === 'uniforms'    && <UniformEquipTab team={team} members={members} isLeader={isLeader} />}
      {tab === 'recruitment' && <RecruitmentTab  team={team} isLeader={isLeader} />}
    </div>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ team, members, onMembersChange, isLeader }: {
  team: Team
  members: TeamMember[]
  onMembersChange: (m: TeamMember[]) => void
  isLeader: boolean
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({})

  const startEdit = (m: TeamMember) => {
    setEditingId(m.userId)
    setEditForm({ number: m.number, position: m.position, phone: m.phone })
  }

  const saveEdit = async (userId: string) => {
    await manageFetch(`/team/${team.id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    })
    onMembersChange(members.map(m => m.userId === userId ? { ...m, ...editForm } : m))
    setEditingId(null)
  }

  if (members.length === 0) return <Empty text="등록된 선수가 없습니다" />

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">선수</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">역할</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">등번호</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">포지션</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">연락처</th>
            {isLeader && <th className="px-5 py-3.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {members.map(m => (
            <tr key={m.userId} className="hover:bg-slate-50/50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {m.userId.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-900">{m.userId}</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  m.role === 'leader' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {m.role === 'leader' ? '대표' : '선수'}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-600">
                {editingId === m.userId
                  ? <input type="number" value={editForm.number ?? ''} onChange={e => setEditForm(f => ({ ...f, number: Number(e.target.value) }))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-500" />
                  : <span className="font-mono">{m.number ?? '—'}</span>}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {editingId === m.userId
                  ? <input value={editForm.position ?? ''} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-500" placeholder="FW, MF..." />
                  : m.position ?? '—'}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {editingId === m.userId
                  ? <input type="tel" value={editForm.phone ?? ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-emerald-500" placeholder="010-0000-0000" />
                  : m.phone
                    ? <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-emerald-600 hover:underline">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                        {m.phone}
                      </a>
                    : <span className="text-slate-300">—</span>}
              </td>
              {isLeader && (
                <td className="px-5 py-4 text-right">
                  {editingId === m.userId
                    ? <button onClick={() => saveEdit(m.userId)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">저장</button>
                    : <button onClick={() => startEdit(m)} className="text-xs text-slate-400 hover:text-slate-600">수정</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ team, members, isLeader }: { team: Team; members: TeamMember[]; isLeader: boolean }) {
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<PlayerStat>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    manageFetch(`/team/${team.id}/stats`)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [team.id])

  const getStat = (userId: string) => stats.find(s => s.userId === userId) ?? { teamId: team.id, userId }

  const saveEdit = async (userId: string) => {
    await manageFetch(`/team/${team.id}/stats/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    })
    setStats(prev => {
      const existing = prev.find(s => s.userId === userId)
      if (existing) return prev.map(s => s.userId === userId ? { ...s, ...editForm } : s)
      return [...prev, { teamId: team.id, userId, ...editForm }]
    })
    setEditingId(null)
  }

  if (loading) return <Spinner />

  const COLS = [
    { key: 'games',   label: '경기' },
    { key: 'goals',   label: '골' },
    { key: 'assists', label: '어시스트' },
    { key: 'wins',    label: '승' },
    { key: 'draws',   label: '무' },
    { key: 'losses',  label: '패' },
  ] as const

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">선수</th>
            {COLS.map(c => (
              <th key={c.key} className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</th>
            ))}
            {isLeader && <th className="px-5 py-3.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {members.map(m => {
            const s = getStat(m.userId)
            const editing = editingId === m.userId
            return (
              <tr key={m.userId} className="hover:bg-slate-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {m.userId.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900">{m.userId}</span>
                  </div>
                </td>
                {COLS.map(c => (
                  <td key={c.key} className="px-4 py-4 text-center text-slate-600">
                    {editing
                      ? <input
                          type="number"
                          min={0}
                          value={(editForm as unknown as Record<string, number | undefined>)[c.key] ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, [c.key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-emerald-500"
                        />
                      : <span className="font-mono">{(s as unknown as Record<string, number | undefined>)[c.key] ?? '—'}</span>
                    }
                  </td>
                ))}
                {isLeader && (
                  <td className="px-5 py-4 text-right">
                    {editing
                      ? <button onClick={() => saveEdit(m.userId)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">저장</button>
                      : <button onClick={() => { setEditingId(m.userId); setEditForm({ games: s.games, goals: s.goals, assists: s.assists, wins: s.wins, draws: s.draws, losses: s.losses }) }} className="text-xs text-slate-400 hover:text-slate-600">수정</button>
                    }
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Uniform & Equipment Tab ──────────────────────────────────────────────────

function UniformEquipTab({ team, members, isLeader }: { team: Team; members: TeamMember[]; isLeader: boolean }) {
  const [uniforms, setUniforms] = useState<Uniform[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUniform, setEditingUniform] = useState<string | null>(null)
  const [uniformForm, setUniformForm] = useState<Partial<Uniform>>({})
  const [newEquip, setNewEquip] = useState({ name: '', quantity: '', notes: '' })
  const [addingEquip, setAddingEquip] = useState(false)

  useEffect(() => {
    Promise.all([
      manageFetch(`/team/${team.id}/uniforms`),
      manageFetch(`/team/${team.id}/equipment`),
    ]).then(([u, e]) => {
      setUniforms(u)
      setEquipment(e)
    }).finally(() => setLoading(false))
  }, [team.id])

  const getUniform = (userId: string) => uniforms.find(u => u.userId === userId) ?? { teamId: team.id, userId }

  const saveUniform = async (userId: string) => {
    await manageFetch(`/team/${team.id}/uniforms/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(uniformForm),
    })
    setUniforms(prev => {
      const existing = prev.find(u => u.userId === userId)
      if (existing) return prev.map(u => u.userId === userId ? { ...u, ...uniformForm } : u)
      return [...prev, { teamId: team.id, userId, ...uniformForm }]
    })
    setEditingUniform(null)
  }

  const addEquipment = async () => {
    const item = await manageFetch(`/team/${team.id}/equipment`, {
      method: 'POST',
      body: JSON.stringify({ name: newEquip.name, quantity: newEquip.quantity ? Number(newEquip.quantity) : undefined, notes: newEquip.notes || undefined }),
    })
    setEquipment(prev => [...prev, item])
    setNewEquip({ name: '', quantity: '', notes: '' })
    setAddingEquip(false)
  }

  const deleteEquipment = async (id: string) => {
    await manageFetch(`/team/${team.id}/equipment/${id}`, { method: 'DELETE' })
    setEquipment(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      {/* Uniforms section */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-slate-700">유니폼 현황</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">선수</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">번호</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">사이즈</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">지급</th>
                {isLeader && <th className="px-5 py-3.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map(m => {
                const u = getUniform(m.userId)
                const editing = editingUniform === m.userId
                return (
                  <tr key={m.userId} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-medium text-slate-900">{m.userId}</td>
                    <td className="px-5 py-4 text-center text-slate-600">
                      {editing
                        ? <input type="number" value={uniformForm.number ?? ''} onChange={e => setUniformForm(f => ({ ...f, number: e.target.value ? Number(e.target.value) : undefined }))}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-emerald-500" />
                        : <span className="font-mono">{u.number ?? '—'}</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-center text-slate-600">
                      {editing
                        ? <input value={uniformForm.size ?? ''} onChange={e => setUniformForm(f => ({ ...f, size: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-emerald-500" placeholder="M, L..." />
                        : u.size ?? '—'
                      }
                    </td>
                    <td className="px-5 py-4 text-center">
                      {editing
                        ? <input type="checkbox" checked={uniformForm.issued ?? false} onChange={e => setUniformForm(f => ({ ...f, issued: e.target.checked }))}
                            className="h-4 w-4 accent-emerald-600" />
                        : u.issued
                          ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">지급</span>
                          : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">미지급</span>
                      }
                    </td>
                    {isLeader && (
                      <td className="px-5 py-4 text-right">
                        {editing
                          ? <button onClick={() => saveUniform(m.userId)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">저장</button>
                          : <button onClick={() => { setEditingUniform(m.userId); setUniformForm({ number: u.number, size: u.size, issued: u.issued }) }} className="text-xs text-slate-400 hover:text-slate-600">수정</button>
                        }
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">팀 용품 재고</h2>
          {isLeader && (
            <button onClick={() => setAddingEquip(v => !v)}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              추가
            </button>
          )}
        </div>

        {addingEquip && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-3 gap-3">
              <input value={newEquip.name} onChange={e => setNewEquip(f => ({ ...f, name: e.target.value }))}
                placeholder="용품명 *" className={inp} />
              <input type="number" value={newEquip.quantity} onChange={e => setNewEquip(f => ({ ...f, quantity: e.target.value }))}
                placeholder="수량" className={inp} />
              <input value={newEquip.notes} onChange={e => setNewEquip(f => ({ ...f, notes: e.target.value }))}
                placeholder="메모" className={inp} />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addEquipment} disabled={!newEquip.name}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">등록</button>
              <button onClick={() => setAddingEquip(false)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-100">취소</button>
            </div>
          </div>
        )}

        {equipment.length === 0 ? (
          <Empty text="등록된 용품이 없습니다" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">용품</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">수량</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">메모</th>
                  {isLeader && <th className="px-5 py-3.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {equipment.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-medium text-slate-900">{e.name}</td>
                    <td className="px-5 py-4 text-center font-mono text-slate-600">{e.quantity ?? '—'}</td>
                    <td className="px-5 py-4 text-slate-500">{e.notes ?? '—'}</td>
                    {isLeader && (
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => deleteEquipment(e.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Recruitment Tab ──────────────────────────────────────────────────────────

function RecruitmentTab({ team, isLeader }: { team: Team; isLeader: boolean }) {
  const [posts, setPosts] = useState<RecruitPost[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', positions: '' })

  useEffect(() => {
    manageFetch(`/team/${team.id}/recruitment`)
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [team.id])

  const create = async () => {
    const item = await manageFetch(`/team/${team.id}/recruitment`, {
      method: 'POST',
      body: JSON.stringify({ title: form.title, positions: form.positions || undefined }),
    })
    setPosts(prev => [item, ...prev])
    setForm({ title: '', positions: '' })
    setAdding(false)
  }

  const close = async (id: string) => {
    await manageFetch(`/team/${team.id}/recruitment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isOpen: false }),
    })
    setPosts(prev => prev.map(p => p.id === id ? { ...p, isOpen: false } : p))
  }

  const remove = async (id: string) => {
    await manageFetch(`/team/${team.id}/recruitment/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div>
      {isLeader && (
        <div className="mb-6">
          {adding ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="공고 제목 *" className={inp} />
                <input value={form.positions} onChange={e => setForm(f => ({ ...f, positions: e.target.value }))}
                  placeholder="모집 포지션 (FW, MF 등)" className={inp} />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={create} disabled={!form.title}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">등록</button>
                <button onClick={() => setAdding(false)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-100">취소</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              모집 공고 등록
            </button>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <Empty text="등록된 모집 공고가 없습니다" />
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.isOpen ? '모집중' : '마감'}
                  </span>
                  <span className="font-semibold text-slate-900">{p.title}</span>
                </div>
                {p.positions && (
                  <p className="mt-1.5 text-xs text-slate-500">모집 포지션: {p.positions}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</p>
              </div>
              {isLeader && (
                <div className="ml-4 flex flex-shrink-0 gap-2">
                  {p.isOpen && (
                    <button onClick={() => close(p.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">마감</button>
                  )}
                  <button onClick={() => remove(p.id)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">삭제</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-emerald-500">*</span>}
      </label>
      {children}
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

function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
    </div>
  )
}

const inp = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
