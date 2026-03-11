'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { manageFetch } from '@/lib/manageFetch'
import { useTeam } from '@/context/TeamContext'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import type { League } from '@/types/manage'
import { TypeBadge, StatusBadge, Spinner, Empty } from '@/components/league/shared'
import CreateWizard from '@/components/league/CreateWizard'
import LeagueDetail from '@/components/league/LeagueDetail'

type View = 'list' | 'create' | 'detail'
type MainTab = 'mine' | 'participated'

export default function LeaguePage() {
  return (
    <Suspense fallback={
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--text-primary)' }} />
      </div>
    }>
      <LeaguePageInner />
    </Suspense>
  )
}

function LeaguePageInner() {
  const { currentTeam, isLeader } = useTeam()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const deepLinkLeagueId = searchParams.get('leagueId')

  const teamId = currentTeam?.id ?? ''
  const [view, setView] = useState<View>('list')
  const [mainTab, setMainTab] = useState<MainTab>('mine')
  const [leagues, setLeagues] = useState<League[]>([])
  const [participatedLeagues, setParticipatedLeagues] = useState<League[]>([])
  const [selected, setSelected] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingParticipated, setLoadingParticipated] = useState(false)

  const load = async () => {
    if (!teamId) { setLoading(false); return }
    try { setLeagues(await manageFetch(`/league?organizerTeamId=${teamId}`)) }
    catch { setLeagues([]) }
    finally { setLoading(false) }
  }

  const loadParticipated = async () => {
    if (!teamId) return
    setLoadingParticipated(true)
    try {
      const data: League[] = await manageFetch(`/league?participantTeamId=${teamId}`)
      setParticipatedLeagues((data ?? []).filter(l => l.organizerTeamId !== teamId))
    } catch {
      setParticipatedLeagues([])
    } finally {
      setLoadingParticipated(false)
    }
  }

  useEffect(() => { load() }, [teamId])
  useEffect(() => { if (mainTab === 'participated') loadParticipated() }, [mainTab, teamId])

  // 딥링크: ?leagueId=xxx → 해당 리그 자동 열기
  const [deepLinkResolved, setDeepLinkResolved] = useState(false)
  useEffect(() => {
    if (!deepLinkLeagueId || deepLinkResolved || loading) return

    const inMine = leagues.find(l => l.id === deepLinkLeagueId)
    if (inMine) {
      setSelected(inMine)
      setView('detail')
      setMainTab('mine')
      setDeepLinkResolved(true)
      return
    }

    if (!loadingParticipated && participatedLeagues.length === 0 && !deepLinkResolved) {
      loadParticipated()
      return
    }

    const inParticipated = participatedLeagues.find(l => l.id === deepLinkLeagueId)
    if (inParticipated) {
      setSelected(inParticipated)
      setView('detail')
      setMainTab('participated')
      setDeepLinkResolved(true)
      return
    }

    if (!loadingParticipated && !deepLinkResolved) {
      manageFetch(`/league/${deepLinkLeagueId}`)
        .then((data: League) => {
          if (data) { setSelected(data); setView('detail') }
        })
        .catch(() => {})
        .finally(() => setDeepLinkResolved(true))
    }
  }, [deepLinkLeagueId, deepLinkResolved, loading, leagues, participatedLeagues, loadingParticipated])

  if (view === 'create') {
    return (
      <div className="mx-auto max-w-5xl">
        <CreateWizard teamId={teamId} onSuccess={() => { load(); setView('list') }} onCancel={() => setView('list')} />
      </div>
    )
  }

  if (view === 'detail' && selected) {
    const isOrganizer = !!(user?.sub && selected.organizerId === user.sub)
    return (
      <div className="mx-auto max-w-5xl">
        <LeagueDetail
          league={selected}
          onBack={() => { setView('list'); setSelected(null) }}
          isOrganizer={isOrganizer}
          currentTeamId={teamId}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>대회 관리</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>주최하거나 참가한 대회를 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/league" className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            대회 탐색 →
          </Link>

          {isLeader && (
            <button onClick={() => setView('create')}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] transition-colors hover:opacity-85">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              만들기
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {([['mine', '주최한 대회'], ['participated', '참가 중인 대회']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMainTab(k)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
            style={mainTab === k
              ? { background: 'var(--btn-solid-bg)', color: 'var(--btn-solid-color)' }
              : { color: 'var(--text-muted)' }
            }>
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'mine' && (
        loading ? <Spinner /> : leagues.length === 0
          ? <Empty text={isLeader ? '아직 주최한 대회가 없습니다' : '팀 리더만 대회를 만들 수 있습니다'} />
          : <LeagueGrid leagues={leagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId} />
      )}

      {mainTab === 'participated' && (
        loadingParticipated ? <Spinner /> : participatedLeagues.length === 0
          ? <Empty text="참가 중인 대회가 없습니다" />
          : <LeagueGrid leagues={participatedLeagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId} />
      )}
    </div>
  )
}

function LeagueGrid({ leagues, onSelect, currentTeamId }: { leagues: League[]; onSelect: (l: League) => void; currentTeamId: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leagues.map(l => (
        <button key={l.id}
          onClick={() => onSelect(l)}
          className="group rounded-2xl p-6 text-left transition-all hover:opacity-90"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="mb-3 flex items-center justify-between">
            <TypeBadge type={l.type} />
            <StatusBadge status={l.status} />
          </div>
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{l.name}</div>
          {l.region && <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{l.region}</div>}
          {l.startDate && (
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {l.startDate} ~ {l.endDate ?? '미정'}
            </div>
          )}
          {l.organizerTeamId === currentTeamId && (
            <div className="mt-2 text-xs font-medium" style={{ color: '#10b981' }}>주최</div>
          )}
          <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'var(--btn-solid-bg)' }}>
            <span>상세 보기</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}
