'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading) return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-500" />
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>로딩 중...</span>
      </div>
    </div>
  )
  if (!user) return null

  return <>{children}</>
}
