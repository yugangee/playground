// Playground Service Worker — 오프라인 캐싱
const CACHE_VERSION = 'playground-v1'
const STATIC_CACHE  = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`

// 앱 셸: 최초 설치 시 캐시할 핵심 파일
const APP_SHELL = ['/', '/manifest.json', '/icons/icon.svg']

// ── 설치 ──────────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// ── 활성화 (구버전 캐시 정리) ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('playground-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── 인터셉트 ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // GET 요청만 처리, 크로스 오리진·API 요청은 제외
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/uploads/')) return // S3 user uploads

  // ① Next.js 정적 에셋 (_next/static/) — 캐시 우선
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          caches.open(STATIC_CACHE).then(cache => cache.put(request, res.clone()))
          return res
        })
      })
    )
    return
  }

  // ② 페이지 내비게이션 — 네트워크 우선, 실패 시 캐시
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, res.clone()))
          return res
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/'))
        )
    )
    return
  }

  // ③ 기타 — 네트워크 우선, 실패 시 캐시 폴백
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})

// ── 웹 푸시 알림 ──────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Playground', {
      body: data.body ?? '',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: data.tag ?? 'playground',
      data: { url: data.url ?? '/' },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
