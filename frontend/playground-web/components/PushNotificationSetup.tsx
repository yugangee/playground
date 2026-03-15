'use client'

import { useEffect, useState } from 'react'
import { manageFetch } from '@/lib/manageFetch'
import { useAuth } from '@/context/AuthContext'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function PushNotificationSetup() {
  const { user } = useAuth()
  const [shown, setShown] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!('PushManager' in window) || !VAPID_PUBLIC_KEY) return
    if (localStorage.getItem('push_dismissed')) return
    if (Notification.permission !== 'default') return
    const t = setTimeout(() => setShown(true), 6000)
    return () => clearTimeout(t)
  }, [user])

  const subscribe = async () => {
    setRequesting(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setShown(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await manageFetch('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(sub.toJSON()),
      })
      setShown(false)
    } catch (e) {
      console.error('Push subscribe error:', e)
    } finally {
      setRequesting(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem('push_dismissed', '1')
    setShown(false)
  }

  if (!shown) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-sm rounded-2xl border border-violet-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-sm sm:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-xl">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">푸시 알림 받기</p>
          <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
            경기 일정·참석 요청·공지사항을 실시간으로 받아보세요.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={subscribe}
              disabled={requesting}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {requesting ? '처리 중...' : '알림 받기'}
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 transition-colors">
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
