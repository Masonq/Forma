import { openDB, type IDBPDatabase } from 'idb'
import type { PhotoEntry, SyncKind } from './types'

const KINDS: SyncKind[] = ['profile', 'place', 'workout', 'measurement', 'exercise']
let dbp: Promise<IDBPDatabase> | null = null

export function db() {
  if (!dbp) {
    dbp = openDB('forma', 1, {
      upgrade(d) {
        for (const k of KINDS) d.createObjectStore(k, { keyPath: 'id' })
        d.createObjectStore('outbox')
        d.createObjectStore('meta')
        d.createObjectStore('photos', { keyPath: 'id' })
      },
    })
  }
  return dbp
}

export async function loadAll(kind: SyncKind): Promise<any[]> {
  return (await db()).getAll(kind)
}

export async function put(kind: SyncKind, rec: { id: string }, queue = true) {
  const d = await db()
  const tx = d.transaction([kind, 'outbox'], 'readwrite')
  await tx.objectStore(kind).put(rec)
  if (queue) await tx.objectStore('outbox').put(Date.now(), `${kind}:${rec.id}`)
  await tx.done
}

export async function putMany(kind: SyncKind, recs: { id: string }[]) {
  const d = await db()
  const tx = d.transaction(kind, 'readwrite')
  for (const r of recs) await tx.store.put(r)
  await tx.done
}

export async function outbox(): Promise<{ kind: SyncKind; id: string }[]> {
  const keys = (await (await db()).getAllKeys('outbox')) as string[]
  return keys.map((k) => { const i = k.indexOf(':'); return { kind: k.slice(0, i) as SyncKind, id: k.slice(i + 1) } })
}

export async function getRec(kind: SyncKind, id: string) {
  return (await db()).get(kind, id)
}

export async function clearOutbox(keys: string[]) {
  const d = await db()
  const tx = d.transaction('outbox', 'readwrite')
  for (const k of keys) await tx.store.delete(k)
  await tx.done
}

export async function meta<T = any>(key: string): Promise<T | undefined> {
  return (await db()).get('meta', key)
}
export async function setMeta(key: string, val: any) {
  await (await db()).put('meta', val, key)
}

export async function wipeData() {
  const d = await db()
  const tx = d.transaction([...KINDS, 'outbox', 'meta'], 'readwrite')
  for (const k of [...KINDS, 'outbox', 'meta']) await tx.objectStore(k).clear()
  await tx.done
}

export async function photos(): Promise<PhotoEntry[]> {
  return (await (await db()).getAll('photos')).sort((a, b) => b.date - a.date)
}
export async function addPhoto(p: PhotoEntry) { await (await db()).put('photos', p) }
export async function deletePhoto(id: string) { await (await db()).delete('photos', id) }
