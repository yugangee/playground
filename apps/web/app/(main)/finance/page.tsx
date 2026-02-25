'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useTeam } from '@/contexts/TeamContext'
import type { Transaction, Due, Fine } from '@playground/shared'

type Tab = 'transactions' | 'dues' | 'fines' | 'settlement'

interface TeamMember { teamId: string; userId: string; role: string; number?: number; position?: string }

function memberLabel(m: TeamMember): string {
  const num = m.number != null ? `#${m.number}` : ''
  const pos = m.position ?? ''
  if (num || pos) return `${num} ${pos}`.trim()
  return m.userId.slice(0, 8)
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('transactions')
  const { currentTeam, isLeader } = useTeam()
  const teamId = currentTeam?.id ?? ''
  const [members, setMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    if (!teamId) return
    apiFetch(`/team/${teamId}/members`).then(setMembers).catch(() => {})
  }, [teamId])

  if (!teamId) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">먼저 팀을 만들거나 팀에 가입하세요</p>
    </div>
  )

  const tabs = [
    { key: 'transactions' as Tab, label: '장부' },
    { key: 'dues' as Tab, label: '회비' },
    { key: 'fines' as Tab, label: '벌금' },
    { key: 'settlement' as Tab, label: '정산' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">재정 관리</h1>
        <p className="mt-1 text-sm text-slate-500">장부, 회비, 벌금을 관리합니다</p>
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

      {tab === 'transactions' && <TransactionsTab teamId={teamId} isLeader={isLeader} />}
      {tab === 'dues' && <DuesTab teamId={teamId} isLeader={isLeader} members={members} />}
      {tab === 'fines' && <FinesTab teamId={teamId} isLeader={isLeader} members={members} />}
      {tab === 'settlement' && <SettlementTab teamId={teamId} isLeader={isLeader} members={members} />}
    </div>
  )
}

// ── Transactions ──────────────────────────────────────────────────────────────

function TransactionsTab({ teamId, isLeader }: { teamId: string; isLeader: boolean }) {
  const [items, setItems] = useState<Transaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'income', amount: '', description: '', date: today() })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try { setItems(await apiFetch(`/finance/transactions?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { load() }, [teamId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch('/finance/transactions', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), teamId }) })
      setForm({ type: 'income', amount: '', description: '', date: today() })
      setShowForm(false)
      load()
    } finally { setLoading(false) }
  }

  const income = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0)
  const expense = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0)
  const balance = income - expense

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            수입
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">+{income.toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span></div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
            지출
          </div>
          <div className="mt-2 text-2xl font-bold text-red-500">-{expense.toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span></div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            잔액
          </div>
          <div className={`mt-2 text-2xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
            {balance.toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span>
          </div>
        </div>
      </div>

      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            내역 추가
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">새 내역 추가</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>구분</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                <option value="income">수입</option>
                <option value="expense">지출</option>
              </select>
            </div>
            <div>
              <label className={lbl}>금액 (원)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className={inp} placeholder="50,000" />
            </div>
            <div>
              <label className={lbl}>날짜</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className={inp} />
            </div>
            <div>
              <label className={lbl}>내용</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inp} placeholder="구장 대여비" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? '추가 중...' : '추가'}
          </button>
        </form>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">재정 내역은 대표만 추가할 수 있습니다.</p>
      )}

      {items.length === 0 ? <Empty text="내역이 없습니다" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">날짜</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">내용</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-slate-500">{t.date}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{t.description}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Dues ──────────────────────────────────────────────────────────────────────

function DuesTab({ teamId, isLeader, members }: { teamId: string; isLeader: boolean; members: TeamMember[] }) {
  const [items, setItems] = useState<Due[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', amount: '', description: '', dueDate: '' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try { setItems(await apiFetch(`/finance/dues?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { load() }, [teamId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch('/finance/dues', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), teamId }) })
      setForm({ userId: '', amount: '', description: '', dueDate: '' })
      setShowForm(false)
      load()
    } finally { setLoading(false) }
  }

  const markPaid = async (id: string) => {
    await apiFetch(`/finance/dues/${id}/pay`, { method: 'PATCH' })
    load()
  }

  const unpaid = items.filter(i => !i.paid)
  const paid = items.filter(i => i.paid)

  const memberName = (uid: string) => {
    const m = members.find(m => m.userId === uid)
    return m ? memberLabel(m) : uid.slice(0, 8)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
            미납
          </div>
          <div className="mt-2 text-2xl font-bold text-red-500">{unpaid.reduce((s, i) => s + i.amount, 0).toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span></div>
          <div className="mt-1 text-xs text-slate-400">{unpaid.length}명</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            납부 완료
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{paid.reduce((s, i) => s + i.amount, 0).toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span></div>
          <div className="mt-1 text-xs text-slate-400">{paid.length}명</div>
        </div>
      </div>

      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            회비 등록
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">회비 등록</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>선수</label>
              <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required className={inp}>
                <option value="">선수 선택</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>금액 (원)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className={inp} placeholder="30,000" />
            </div>
            <div>
              <label className={lbl}>내용</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inp} placeholder="1월 회비" />
            </div>
            <div>
              <label className={lbl}>납부 기한</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inp} />
            </div>
          </div>
              <button type="submit" disabled={loading}
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {loading ? '등록 중...' : '등록'}
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">회비 등록은 대표만 할 수 있습니다.</p>
      )}

      {items.length === 0 ? <Empty text="회비 내역이 없습니다" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">선수</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">내용</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">금액</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">기한</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(d => (
                <tr key={d.id} className={`hover:bg-slate-50/50 ${d.paid ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{memberName(d.userId)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{d.description}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">{d.amount.toLocaleString()}원</td>
                  <td className="px-5 py-3.5 text-slate-500">{d.dueDate ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {d.paid
                      ? <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">납부</span>
                      : isLeader
                        ? <button onClick={() => markPaid(d.id)} className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-200">미납</button>
                        : <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600">미납</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Fines ─────────────────────────────────────────────────────────────────────

function FinesTab({ teamId, isLeader, members }: { teamId: string; isLeader: boolean; members: TeamMember[] }) {
  const [items, setItems] = useState<Fine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId: '', amount: '', reason: '' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try { setItems(await apiFetch(`/finance/fines?teamId=${teamId}`)) } catch {}
  }
  useEffect(() => { load() }, [teamId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiFetch('/finance/fines', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), teamId }) })
      setForm({ userId: '', amount: '', reason: '' })
      setShowForm(false)
      load()
    } finally { setLoading(false) }
  }

  const markPaid = async (id: string) => {
    await apiFetch(`/finance/fines/${id}/pay`, { method: 'PATCH' })
    load()
  }

  const memberName = (uid: string) => {
    const m = members.find(m => m.userId === uid)
    return m ? memberLabel(m) : uid.slice(0, 8)
  }

  return (
    <div className="space-y-5">
      {isLeader ? (
        <>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            벌금 부과
          </button>
          {showForm && (
            <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">벌금 부과</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={lbl}>선수</label>
                  <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} required className={inp}>
                    <option value="">선수 선택</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{memberLabel(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>금액 (원)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className={inp} placeholder="5,000" />
                </div>
                <div>
                  <label className={lbl}>사유</label>
                  <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required className={inp} placeholder="지각" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="mt-4 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                {loading ? '부과 중...' : '부과'}
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">벌금 부과는 대표만 할 수 있습니다.</p>
      )}

      {items.length === 0 ? <Empty text="벌금 내역이 없습니다" /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">선수</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">사유</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">금액</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(f => (
                <tr key={f.id} className={`hover:bg-slate-50/50 ${f.paid ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{memberName(f.userId)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{f.reason}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-red-500">{f.amount.toLocaleString()}원</td>
                  <td className="px-5 py-3.5 text-center">
                    {f.paid
                      ? <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">납부</span>
                      : isLeader
                        ? <button onClick={() => markPaid(f.id)} className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-200">미납</button>
                        : <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600">미납</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Settlement ────────────────────────────────────────────────────────────────

function SettlementTab({ teamId, isLeader, members }: { teamId: string; isLeader: boolean; members: TeamMember[] }) {
  const [totalCost, setTotalCost] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const total = Number(totalCost) || 0
  const count = selectedIds.size
  const perPerson = count > 0 ? Math.ceil(total / count) : 0

  const save = async () => {
    if (!total || !count) return
    setSaving(true)
    try {
      await apiFetch('/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'expense',
          amount: total,
          description: `구장비 정산 (${count}명, 인당 ${perPerson.toLocaleString()}원)`,
          date: today(),
          teamId,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setTotalCost('')
      setSelectedIds(new Set())
    } finally { setSaving(false) }
  }

  if (!isLeader) return (
    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">정산 기능은 대표만 사용할 수 있습니다.</p>
  )

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold text-slate-700">경기 비용 1/N 정산</h3>

        <div className="mb-5">
          <label className={lbl}>구장비 총액 (원)</label>
          <input
            type="number"
            value={totalCost}
            onChange={e => setTotalCost(e.target.value)}
            className={inp}
            placeholder="예: 150,000"
          />
        </div>

        <div className="mb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className={lbl}>참가 선수 선택</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedIds(new Set(members.map(m => m.userId)))}
                className="text-xs text-emerald-600 hover:underline">전체 선택</button>
              <button type="button" onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:underline">초기화</button>
            </div>
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-slate-400">팀원이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {members.map(m => (
                <label key={m.userId} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  selectedIds.has(m.userId)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                  <input type="checkbox" className="sr-only" checked={selectedIds.has(m.userId)} onChange={() => toggle(m.userId)} />
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${selectedIds.has(m.userId) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  {memberLabel(m)}
                </label>
              ))}
            </div>
          )}
        </div>

        {count > 0 && total > 0 && (
          <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{count}명 참가 · 인당 부담금</span>
              <span className="text-2xl font-bold text-emerald-600">{perPerson.toLocaleString()}<span className="ml-1 text-sm font-normal text-slate-400">원</span></span>
            </div>
            <div className="mt-1 text-xs text-slate-400">총 {total.toLocaleString()}원 ÷ {count}명 (올림)</div>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !total || !count}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {saved ? '저장됨!' : saving ? '저장 중...' : '정산 내역 저장'}
        </button>
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
      {text}
    </div>
  )
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const lbl = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'
const inp = 'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
