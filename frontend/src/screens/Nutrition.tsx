import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { BarcodeScanner } from '../components/Scanner'
import { BarChart, Empty, Ring, Sheet, goBack } from '../components/ui'
import { fmtNum, monthShort, startOfDay, uid } from '../lib/format'
import { useT } from '../lib/i18n'
import { type FoodHit, dayTotals, itemKcal, lookupBarcode, searchFood, targets } from '../lib/nutrition'
import { useStore } from '../lib/store'
import type { Meal, MealItem, MealSlot } from '../lib/types'

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
const DAY = 86400000

export default function Nutrition() {
  const { t, lang } = useT()
  const s = useStore()
  const [day, setDay] = useState(() => startOfDay(Date.now()))
  const [add, setAdd] = useState<MealSlot | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [edit, setEdit] = useState<{ meal: Meal; item: MealItem } | null>(null)

  const lastWeight = useMemo(() => {
    const ms = [...s.measurements].filter((m) => m.weight).sort((a, b) => b.date - a.date)
    return ms[0]?.weight
  }, [s.measurements])
  const tg = targets(s.profile, lastWeight)
  const dayMeals = s.meals.filter((m) => m.date === day)
  const tot = dayTotals(dayMeals)
  const today = startOfDay(Date.now())

  const week = useMemo(() => {
    const out: { v: number; l: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d0 = today - i * DAY
      const v = dayTotals(s.meals.filter((m) => m.date === d0)).kcal
      const dt = new Date(d0)
      out.push({ v: Math.round(v), l: `${dt.getDate()}` })
    }
    return out
  }, [s.meals, today])

  const dateLabel = (d: number) => {
    if (d === today) return t('nu_today')
    if (d === today - DAY) return t('nu_yesterday')
    const dt = new Date(d)
    return `${dt.getDate()} ${monthShort(lang, dt.getMonth()).toLowerCase()}`
  }

  const addItem = (slot: MealSlot, it: MealItem) => {
    const meal = dayMeals.find((m) => m.slot === slot)
    if (meal) s.saveMeal({ ...meal, items: [...meal.items, it] })
    else s.saveMeal({ id: uid(), updatedAt: Date.now(), date: day, slot, items: [it] })
  }
  const saveItem = (meal: Meal, it: MealItem) => {
    s.saveMeal({ ...meal, items: meal.items.map((x) => (x.id === it.id ? it : x)) })
  }
  const removeItem = (meal: Meal, id: string) => {
    const items = meal.items.filter((x) => x.id !== id)
    if (items.length) s.saveMeal({ ...meal, items })
    else s.deleteMeal(meal.id)
  }

  const left = Math.round(tg.kcal - tot.kcal)
  return (
    <div className="page">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{t('nu_title')}</div>
        <button className="iconbtn ghost" onClick={() => setGoalOpen(true)} aria-label={t('nu_goal')}><Icon name="goal" size={20} /></button>
      </div>

      <div className="day-nav">
        <button className="iconbtn ghost" onClick={() => setDay(day - DAY)} aria-label="‹"><Icon name="back" size={18} /></button>
        <div className="h3">{dateLabel(day)}</div>
        <button className="iconbtn ghost" style={{ visibility: day >= today ? 'hidden' : 'visible' }} onClick={() => setDay(Math.min(today, day + DAY))} aria-label="›"><Icon name="chevR" size={18} /></button>
      </div>

      <div className="card nu-summary">
        <Ring value={Math.min(1, tot.kcal / tg.kcal)} size={92} stroke={9} color={tot.kcal > tg.kcal ? 'var(--red)' : 'var(--accent)'}>
          <div className="nu-ring num">
            <b>{fmtNum(Math.round(tot.kcal), lang, 0)}</b>
            <span className="small muted">/ {fmtNum(tg.kcal, lang, 0)}</span>
          </div>
        </Ring>
        <div className="nu-macros">
          {([['p', tot.p, tg.p, 'var(--blue)'], ['f', tot.f, tg.f, 'var(--accent)'], ['c', tot.c, tg.c, 'var(--green)']] as const).map(([k, v, g, col]) => (
            <div key={k} className="mbar">
              <span>{t('nu_' + k)}</span>
              <span className="track"><i style={{ width: `${Math.min(100, (v / g) * 100)}%`, background: col }} /></span>
              <span className="v num">{fmtNum(Math.round(v), lang, 0)}/{fmtNum(g, lang, 0)}{t('nu_g')}</span>
            </div>
          ))}
        </div>
        <div className="small muted" style={{ gridColumn: '1 / -1', marginTop: 2 }}>
          {left >= 0 ? t('nu_left', { n: fmtNum(left, lang, 0) }) : t('nu_over', { n: fmtNum(-left, lang, 0) })}
        </div>
      </div>

      {SLOTS.map((slot) => {
        const meal = dayMeals.find((m) => m.slot === slot)
        const kcal = meal ? Math.round(meal.items.reduce((a, it) => a + itemKcal(it), 0)) : 0
        return (
          <div className="section" key={slot}>
            <div className="section-head">
              <div className="h3">{t('nu_' + slot)}</div>
              {kcal > 0 && <span className="small muted num">{fmtNum(kcal, lang, 0)} {t('nu_kcal')}</span>}
            </div>
            <div className="list">
              {meal?.items.map((it) => (
                <button className="li" key={it.id} onClick={() => setEdit({ meal, item: it })}>
                  <div className="li-main">
                    <div className="li-title ellipsis">{it.name}</div>
                    <div className="li-sub num">{fmtNum(it.grams, lang, 0)} {t('nu_g')} · {fmtNum(Math.round(itemKcal(it)), lang, 0)} {t('nu_kcal')}</div>
                  </div>
                  <Icon name="chevR" size={16} />
                </button>
              ))}
              <button className="li add" onClick={() => setAdd(slot)}>
                <Icon name="plus" size={18} /><span>{t('nu_add')}</span>
              </button>
            </div>
          </div>
        )
      })}

      <div className="section">
        <div className="section-head"><div className="h3">{t('nu_week')}</div></div>
        <div className="card">
          {week.some((w) => w.v > 0)
            ? <BarChart values={week.map((w) => w.v)} labels={week.map((w) => w.l)} fmt={(v) => fmtNum(v, lang, 0)} />
            : <Empty icon="plate" text={t('nu_empty')} />}
        </div>
      </div>

      {add && <AddSheet slot={add} onClose={() => setAdd(null)} onPick={(it) => { addItem(add, it); setAdd(null) }} />}
      {edit && (
        <ItemSheet
          item={edit.item}
          onClose={() => setEdit(null)}
          onSave={(it) => { saveItem(edit.meal, it); setEdit(null) }}
          onDelete={() => { removeItem(edit.meal, edit.item.id); setEdit(null) }}
        />
      )}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title={t('nu_goal')}>
        <p className="sub" style={{ marginTop: 0 }}>{t('nu_goal_d', { n: fmtNum(tg.kcal, lang, 0) })}</p>
        <input className="field" inputMode="numeric" style={{ marginTop: 12 }} defaultValue={s.profile.kcalGoal || ''} placeholder={String(tg.kcal)}
          onChange={(e) => {
            const v = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
            s.setProfile({ kcalGoal: v >= 1000 && v <= 8000 ? v : undefined })
          }} />
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setGoalOpen(false)}>{t('done')}</button>
      </Sheet>
    </div>
  )
}

// — Добавление продукта: поиск с автопоиском, сканер, вручную —
function AddSheet({ slot, onClose, onPick }: { slot: MealSlot; onClose: () => void; onPick: (it: MealItem) => void }) {
  const { t, lang } = useT()
  const s = useStore()
  const [view, setView] = useState<'search' | 'scan' | 'manual'>('search')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<FoodHit[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<FoodHit | null>(null)
  const [scanMiss, setScanMiss] = useState<string | null>(null)
  const seq = useRef(0)

  const recents = useMemo(() => {
    const seen = new Set<string>()
    const out: MealItem[] = []
    for (const m of [...s.meals].sort((a, b) => b.updatedAt - a.updatedAt)) {
      for (const it of m.items) {
        const k = it.barcode || it.name.toLowerCase()
        if (!seen.has(k)) { seen.add(k); out.push(it) }
        if (out.length >= 10) return out
      }
    }
    return out
  }, [s.meals])

  // автопоиск с задержкой
  useEffect(() => {
    const qq = q.trim()
    if (qq.length < 2) { setHits(null); setBusy(false); return }
    setBusy(true)
    const n = ++seq.current
    const timer = setTimeout(async () => {
      const res = await searchFood(qq, lang)
      if (seq.current === n) { setHits(res); setBusy(false) }
    }, 450)
    return () => clearTimeout(timer)
  }, [q, lang])

  const onCode = async (code: string) => {
    setView('search'); setBusy(true)
    const hit = await lookupBarcode(code)
    setBusy(false)
    if (hit) { setPicked(hit); setScanMiss(null) } else { setScanMiss(code); setView('manual') }
  }

  if (picked) return <GramsSheet hit={picked} onClose={onClose} onBack={() => setPicked(null)} onPick={onPick} />

  return (
    <Sheet open onClose={onClose} title={t('nu_add_to', { n: t('nu_' + slot).toLowerCase() })}>
      {view === 'search' && (
        <>
          <div className="food-search">
            <Icon name="search" size={19} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nu_search_ph')} autoFocus autoCorrect="off" spellCheck={false} enterKeyHint="search" />
            {q && <button className="fs-clear" onClick={() => setQ('')} aria-label={t('close')}><Icon name="close" size={16} /></button>}
          </div>
          <div className="food-actions">
            <button onClick={() => { setScanMiss(null); setView('scan') }}><Icon name="camera" size={18} />{t('nu_tab_scan')}</button>
            <button onClick={() => { setScanMiss(null); setView('manual') }}><Icon name="edit" size={18} />{t('nu_tab_manual')}</button>
          </div>
          {busy && (
            <div className="food-list">
              {[0, 1, 2, 3].map((i) => <div className="food-row skel" key={i}><span className="fthumb" /><span className="fmain"><i style={{ width: '62%' }} /><i style={{ width: '38%' }} /></span></div>)}
            </div>
          )}
          {!busy && hits && (
            <div className="food-list">
              {hits.length === 0 && <div className="small muted" style={{ padding: 14 }}>{t('nu_nothing')}</div>}
              {hits.map((h, i) => <FoodRow key={h.barcode ?? i} name={h.name} brand={h.brand} kcal={h.kcal100} photo={h.photo} onClick={() => setPicked(h)} />)}
            </div>
          )}
          {!busy && !hits && (
            <div className="food-list">
              {recents.length > 0 && <div className="small muted" style={{ padding: '10px 2px 4px' }}>{t('nu_recent')}</div>}
              {recents.map((it) => (
                <FoodRow key={it.id} name={it.name} brand={it.brand} kcal={it.kcal100}
                  onClick={() => setPicked({ name: it.name, brand: it.brand, barcode: it.barcode, kcal100: it.kcal100, p100: it.p100, f100: it.f100, c100: it.c100 })} />
              ))}
              {recents.length === 0 && <Empty icon="plate" text={t('nu_search_hint')} />}
            </div>
          )}
        </>
      )}
      {view === 'scan' && (
        <div style={{ marginTop: 4 }}>
          <BarcodeScanner onCode={onCode} onError={() => setView('manual')} />
          <button className="btn line" style={{ marginTop: 12 }} onClick={() => setView('search')}>{t('back')}</button>
        </div>
      )}
      {view === 'manual' && (
        <>
          {scanMiss && <div className="banner" style={{ marginTop: 4 }}><Icon name="info" size={18} />{t('nu_scan_miss', { n: scanMiss })}</div>}
          <ManualForm onPick={onPick} />
          <button className="btn line" style={{ marginTop: 10 }} onClick={() => { setScanMiss(null); setView('search') }}>{t('back')}</button>
        </>
      )}
    </Sheet>
  )
}

function FoodRow({ name, brand, kcal, photo, onClick }: { name: string; brand?: string; kcal: number; photo?: string; onClick: () => void }) {
  const { t } = useT()
  return (
    <button className="food-row" onClick={onClick}>
      <span className="fthumb">{photo ? <img src={photo} alt="" loading="lazy" /> : <Icon name="plate" size={20} />}</span>
      <span className="fmain">
        <span className="fname ellipsis">{name}</span>
        {brand && <span className="small muted ellipsis">{brand}</span>}
      </span>
      <span className="fkcal num">{kcal}<small> {t('nu_kcal')}</small></span>
      <span className="fadd"><Icon name="plus" size={16} /></span>
    </button>
  )
}

function GramsSheet({ hit, onClose, onBack, onPick }: { hit: FoodHit; onClose: () => void; onBack: () => void; onPick: (it: MealItem) => void }) {
  const { t, lang } = useT()
  const [grams, setGrams] = useState(100)
  const kcal = Math.round((hit.kcal100 * grams) / 100)
  return (
    <Sheet open onClose={onClose} title={hit.name} right={<button className="iconbtn ghost" onClick={onBack} aria-label={t('back')}><Icon name="back" size={18} /></button>}>
      <div className="gs-head">
        {hit.photo && <span className="fthumb big"><img src={hit.photo} alt="" /></span>}
        <div>
          {hit.brand && <div className="small muted">{hit.brand}</div>}
          <div className="small muted num">{hit.kcal100} {t('nu_kcal')}/100{t('nu_g')}</div>
        </div>
      </div>
      <div className="grams-row">
        {[50, 100, 150, 200].map((g) => <button key={g} className={`chip ${grams === g ? 'on' : ''}`} onClick={() => setGrams(g)}>{g} {t('nu_g')}</button>)}
      </div>
      <input className="field num" inputMode="numeric" style={{ marginTop: 10 }} value={grams} onChange={(e) => setGrams(Math.min(3000, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))} />
      <div className="small muted num" style={{ marginTop: 8 }}>
        {fmtNum(kcal, lang, 0)} {t('nu_kcal')} · {t('nu_p')} {fmtNum((hit.p100 * grams) / 100, lang, 0)} · {t('nu_f')} {fmtNum((hit.f100 * grams) / 100, lang, 0)} · {t('nu_c')} {fmtNum((hit.c100 * grams) / 100, lang, 0)}
      </div>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={!grams} onClick={() => onPick({ id: uid(), name: hit.name, brand: hit.brand, barcode: hit.barcode, grams, kcal100: hit.kcal100, p100: hit.p100, f100: hit.f100, c100: hit.c100 })}>
        <Icon name="plus" size={20} />{t('nu_add')}
      </button>
    </Sheet>
  )
}

function ManualForm({ onPick }: { onPick: (it: MealItem) => void }) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [grams, setGrams] = useState(100)
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [f, setF] = useState('')
  const [c, setC] = useState('')
  const n = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0)
  return (
    <div style={{ marginTop: 12 }}>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('nu_name_ph')} maxLength={60} />
      <div className="nu-grid">
        <label>{t('nu_grams')}<input className="field num" inputMode="numeric" value={grams} onChange={(e) => setGrams(Math.min(3000, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))} /></label>
        <label>{t('nu_kcal')}/100{t('nu_g')}<input className="field num" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="0" /></label>
        <label>{t('nu_p')}<input className="field num" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="0" /></label>
        <label>{t('nu_f')}<input className="field num" inputMode="decimal" value={f} onChange={(e) => setF(e.target.value)} placeholder="0" /></label>
        <label>{t('nu_c')}<input className="field num" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} placeholder="0" /></label>
      </div>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={!name.trim() || !n(kcal) || !grams}
        onClick={() => onPick({ id: uid(), name: name.trim(), grams, kcal100: n(kcal), p100: n(p), f100: n(f), c100: n(c) })}>
        <Icon name="plus" size={20} />{t('nu_add')}
      </button>
    </div>
  )
}

function ItemSheet({ item, onClose, onSave, onDelete }: { item: MealItem; onClose: () => void; onSave: (it: MealItem) => void; onDelete: () => void }) {
  const { t, lang } = useT()
  const [grams, setGrams] = useState(item.grams)
  return (
    <Sheet open onClose={onClose} title={item.name}>
      <div className="grams-row">
        {[50, 100, 150, 200].map((g) => <button key={g} className={`chip ${grams === g ? 'on' : ''}`} onClick={() => setGrams(g)}>{g} {t('nu_g')}</button>)}
      </div>
      <input className="field num" inputMode="numeric" style={{ marginTop: 10 }} value={grams} onChange={(e) => setGrams(Math.min(3000, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))} />
      <div className="small muted num" style={{ marginTop: 8 }}>{fmtNum(Math.round((item.kcal100 * grams) / 100), lang, 0)} {t('nu_kcal')}</div>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={!grams} onClick={() => onSave({ ...item, grams })}>{t('done')}</button>
      <button className="btn line" style={{ marginTop: 10, color: 'var(--red)' }} onClick={onDelete}><Icon name="trash" size={20} />{t('delete')}</button>
    </Sheet>
  )
}
