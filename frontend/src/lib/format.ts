import type { Lang } from '../data/exercises'
import { tr } from './i18n'

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))

const LB = 2.20462

export function fmtNum(n: number, lang: Lang, digits = 1): string {
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'sr' ? 'sr-Latn-RS' : 'ru-RU', { maximumFractionDigits: digits }).format(r)
}

// вес хранится в кг; показываем в выбранных единицах
export const toUnit = (kg: number, u: 'kg' | 'lb') => (u === 'kg' ? kg : kg * LB)
export const fromUnit = (v: number, u: 'kg' | 'lb') => (u === 'kg' ? v : v / LB)
export function fmtW(kg: number, u: 'kg' | 'lb', lang: Lang) {
  return `${fmtNum(toUnit(kg, u), lang, u === 'kg' ? 2 : 1)} ${tr(lang, u)}`
}
export const weightStep = (u: 'kg' | 'lb') => (u === 'kg' ? 2.5 : 5)

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function fmtDuration(ms: number, lang: Lang) {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} ${tr(lang, 'min')}`
  const h = Math.floor(min / 60)
  const m = min % 60
  const hs = lang === 'ru' ? 'ч' : 'h'
  return m ? `${h} ${hs} ${m} ${tr(lang, 'min')}` : `${h} ${hs}`
}

export function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// 0 = понедельник
export const weekday = (ts: number) => (new Date(ts).getDay() + 6) % 7
export function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }
export function startOfWeek(ts: number) { return startOfDay(ts) - weekday(ts) * 86400000 }

export const wdayShort = (lang: Lang, i: number) => tr(lang, 'wday_short').split('|')[i]
export const monthShort = (lang: Lang, m: number) => tr(lang, 'month_short').split('|')[m]
export const monthFull = (lang: Lang, m: number) => tr(lang, 'month_full').split('|')[m]

export function fmtDate(ts: number, lang: Lang, withYear = false) {
  const d = new Date(ts)
  const base = `${d.getDate()} ${monthShort(lang, d.getMonth()).toLowerCase()}`
  return withYear || d.getFullYear() !== new Date().getFullYear() ? `${base} ${d.getFullYear()}` : base
}

export const e1rm = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30))
