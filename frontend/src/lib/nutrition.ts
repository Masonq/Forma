import type { Meal, MealItem, Profile } from './types'

// — Цели по калориям и БЖУ —
// Базу считаем от веса и цели; пользователь может переопределить kcalGoal в профиле.
export interface Targets { kcal: number; p: number; f: number; c: number }

export function targets(profile: Profile, weightKg?: number): Targets {
  const w = weightKg && weightKg > 30 ? weightKg : 75
  let kcal = w * 31
  if (profile.goal === 'mass' || profile.goal === 'strength') kcal *= 1.12
  if (profile.goal === 'cut') kcal *= 0.85
  if (profile.kcalGoal && profile.kcalGoal >= 1000) kcal = profile.kcalGoal
  const p = Math.round(w * (profile.goal === 'cut' ? 2.0 : profile.goal === 'mass' ? 1.8 : 1.6))
  const f = Math.round(w * 0.9)
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4))
  return { kcal: Math.round(kcal), p, f, c }
}

export const itemKcal = (it: MealItem) => (it.kcal100 * it.grams) / 100
export const itemP = (it: MealItem) => (it.p100 * it.grams) / 100
export const itemF = (it: MealItem) => (it.f100 * it.grams) / 100
export const itemC = (it: MealItem) => (it.c100 * it.grams) / 100

export function dayTotals(meals: Meal[]) {
  let kcal = 0, p = 0, f = 0, c = 0
  for (const m of meals) for (const it of m.items) { kcal += itemKcal(it); p += itemP(it); f += itemF(it); c += itemC(it) }
  return { kcal, p, f, c }
}

// — Open Food Facts —
export interface FoodHit { name: string; brand?: string; barcode?: string; kcal100: number; p100: number; f100: number; c100: number }

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : typeof v === 'string' ? parseFloat(v) || 0 : 0)

function fromProduct(pr: any): FoodHit | null {
  const n = pr?.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (!kcal) kcal = num(n.energy_100g) / 4.184
  const name = pr?.product_name_ru || pr?.product_name || pr?.generic_name
  if (!name || !kcal) return null
  return {
    name: String(name).slice(0, 80),
    brand: pr.brands ? String(pr.brands).split(',')[0].slice(0, 40) : undefined,
    barcode: pr.code || undefined,
    kcal100: Math.round(kcal),
    p100: Math.round(num(n.proteins_100g) * 10) / 10,
    f100: Math.round(num(n.fat_100g) * 10) / 10,
    c100: Math.round(num(n.carbohydrates_100g) * 10) / 10,
  }
}

const FIELDS = 'code,product_name,product_name_ru,generic_name,brands,nutriments'

export async function lookupBarcode(code: string): Promise<FoodHit | null> {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`)
    if (!r.ok) return null
    const j = await r.json()
    return j?.product ? fromProduct(j.product) : null
  } catch { return null }
}

export async function searchFood(q: string, lang: string): Promise<FoodHit[]> {
  try {
    const cc = lang === 'ru' ? 'ru' : lang === 'sr' ? 'rs' : 'world'
    const u = `https://${cc}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`
    const r = await fetch(u)
    if (!r.ok) return []
    const j = await r.json()
    return ((j?.products as any[]) ?? []).map(fromProduct).filter(Boolean) as FoodHit[]
  } catch { return [] }
}
