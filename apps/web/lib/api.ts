import { fetchAuthSession } from 'aws-amplify/auth'
import '@/lib/auth'

const BASE = process.env.NEXT_PUBLIC_API_URL!

async function getToken() {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString()
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return null
  return res.json()
}
