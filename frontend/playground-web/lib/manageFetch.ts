const BASE = process.env.NEXT_PUBLIC_MANAGE_API_URL || process.env.NEXT_PUBLIC_API_URL

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

export async function manageFetch(path: string, options: RequestInit = {}) {
  if (!BASE) throw new Error('API URL이 설정되지 않았습니다. 환경변수를 확인하세요.')
  const token = getToken()
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
