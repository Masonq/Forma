import * as db from './db'
import { setChangeListener, useStore } from './store'
import type { SyncKind } from './types'

const API = '/api'

async function req(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
  const token = await db.meta<string>('token')
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (r.status === 401) {
    await db.setMeta('token', undefined)
    throw new Error('auth')
  }
  if (!r.ok) throw new Error(`http ${r.status}`)
  return r.json()
}

export async function ensureAccount(): Promise<boolean> {
  if (await db.meta('token')) return true
  try {
    const r = await req('/auth/guest', {})
    await db.setMeta('token', r.token)
    await db.setMeta('key', r.key)
    return true
  } catch { return false }
}

export async function accountKey(): Promise<string | undefined> {
  const k = await db.meta<string>('key')
  if (k) return k
  try {
    const r = await req('/auth/key')
    await db.setMeta('key', r.key)
    return r.key
  } catch { return undefined }
}

let running = false
let again = false

export async function syncNow() {
  if (running) { again = true; return }
  running = true
  const st = useStore.getState()
  try {
    if (!navigator.onLine || !(await ensureAccount())) { st.setSynced(false); return }
    const box = await db.outbox()
    const stamps: Record<string, number> = {}
    const changes = []
    const d = await db.db()
    for (const { kind, id } of box) {
      const rec = await d.get(kind, id)
      stamps[`${kind}:${id}`] = await d.get('outbox', `${kind}:${id}`)
      if (rec) changes.push({ kind, id, data: rec, updatedAt: rec.updatedAt ?? 0, deleted: !!rec.deleted })
    }
    const since = (await db.meta<number>('cursor')) ?? 0
    const res = await req('/sync', { since, changes })
    // отметить отправленное, если запись не менялась во время запроса
    const sent: string[] = []
    for (const k of Object.keys(stamps)) if ((await d.get('outbox', k)) === stamps[k]) sent.push(k)
    await db.clearOutbox(sent)
    const byKind: Record<string, any[]> = {}
    for (const c of res.changes as { kind: SyncKind; data: any }[]) {
      const local = await d.get(c.kind, c.data.id)
      if (local && (local.updatedAt ?? 0) >= (c.data.updatedAt ?? 0)) continue
      await d.put(c.kind, c.data)
      ;(byKind[c.kind] ??= []).push(c.data)
    }
    for (const [k, recs] of Object.entries(byKind)) st.applyRemote(k as SyncKind, recs)
    await db.setMeta('cursor', res.cursor)
    st.setSynced((await db.outbox()).length === 0)
  } catch {
    st.setSynced(false)
  } finally {
    running = false
    if (again) { again = false; setTimeout(syncNow, 300) }
  }
}

let timer: number | undefined
export function scheduleSync(delay = 1500) {
  clearTimeout(timer)
  timer = window.setTimeout(syncNow, delay)
}

export function startSync() {
  setChangeListener(() => { useStore.getState().setSynced(false); scheduleSync() })
  window.addEventListener('online', () => scheduleSync(200))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleSync(300) })
  setInterval(() => scheduleSync(0), 60000)
  scheduleSync(500)
}

export async function recover(key: string): Promise<boolean> {
  try {
    const r = await fetch(API + '/auth/recover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim().toUpperCase() }),
    })
    if (!r.ok) return false
    const j = await r.json()
    await db.wipeData()
    await db.setMeta('token', j.token)
    await db.setMeta('key', j.key)
    await db.setMeta('cursor', 0)
    await syncNow()
    await useStore.getState().init()
    return true
  } catch { return false }
}

// ——— Пуш о конце отдыха ———
const b64 = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export async function pushState(): Promise<'on' | 'off' | 'denied' | 'install' | 'unsupported'> {
  if (isIOS() && !isStandalone()) return 'install'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && (await db.meta('pushOn')) ? 'on' : 'off'
}

export async function enablePush(): Promise<boolean> {
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false
    if (!(await ensureAccount())) return false
    const { key } = await req('/push/key')
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) })
    await req('/push/subscribe', sub.toJSON())
    await db.setMeta('pushOn', true)
    return true
  } catch { return false }
}

export async function disablePush() {
  await db.setMeta('pushOn', false)
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) { await req('/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe() }
  } catch { /* сеть */ }
}

export async function scheduleRestPush(at: number, title: string, body: string) {
  if (!(await db.meta('pushOn'))) return
  try { await req('/push/schedule', { tag: 'rest', at, title, body }) } catch { /* без сети — сработает звук в приложении */ }
}
export async function cancelRestPush() {
  if (!(await db.meta('pushOn'))) return
  try { await req('/push/cancel', { tag: 'rest' }) } catch { /* ignore */ }
}
