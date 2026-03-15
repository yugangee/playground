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
          <Link href="/league" className="rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[var(--hover-overlay)] active:scale-[0.98] transition-all"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            대회 탐색 →
          </Link>

          {isLeader && (
            <button onClick={() => setView('create')}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--btn-solid-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--btn-solid-color)] btn-press">
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
          ? <Empty text={isLeader ? '아직 주최한 대회가 없습니다' : '팀 관리자(매니저) 이상만 대회를 만들 수 있습니다'} />
          : <LeagueGrid leagues={leagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId}
              onDelete={async (l) => {
                if (!confirm(`"${l.name}" 대회를 삭제하시겠습니까?\n참가팀과 경기 기록이 모두 삭제됩니다.`)) return
                try { await manageFetch(`/league/${l.id}`, { method: 'DELETE' }); load() }
                catch (e) { alert(e instanceof Error ? e.message : '삭제 실패') }
              }} />
      )}

      {mainTab === 'participated' && (
        loadingParticipated ? <Spinner /> : participatedLeagues.length === 0
          ? <Empty text="참가 중인 대회가 없습니다" />
          : <LeagueGrid leagues={participatedLeagues} onSelect={l => { setSelected(l); setView('detail') }} currentTeamId={teamId}
              onDelete={async (l) => {
                if (!confirm(`"${l.name}" 대회에서 탈퇴하시겠습니까?`)) return
                try { await manageFetch(`/league/${l.id}/teams/${teamId}`, { method: 'DELETE' }); loadParticipated() }
                catch (e) { alert(e instanceof Error ? e.message : '탈퇴 실패') }
              }} />
      )}
    </div>
  )
}

function LeagueGrid({ leagues, onSelect, currentTeamId, onDelete }: { leagues: League[]; onSelect: (l: League) => void; currentTeamId: string; onDelete?: (l: League) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leagues.map(l => (
        <button key={l.id}
          onClick={() => onSelect(l)}
          className="group relative rounded-2xl p-5 text-left card-hover"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {onDelete && (
            <span role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onDelete(l) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(l) } }}
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: 'var(--text-muted)' }}
              title="삭제">
              <svg className="h-4 w-4 transition-colors hover:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </span>
          )}
          <div className="mb-3 flex items-center justify-center gap-2">
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
