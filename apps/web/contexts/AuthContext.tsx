'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import '@/lib/auth'
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth'

interface AuthUser {
  userId: string
  username: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const u = await getCurrentUser()
      setUser(prev =>
        prev?.userId === u.userId && prev?.username === u.username
          ? prev
          : { userId: u.userId, username: u.username }
      )
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await amplifySignOut()
    setUser(null)
  }

  useEffect(() => { refresh() }, [])

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
