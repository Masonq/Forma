import { useMemo, useState } from 'react'
import { Icon, PLACE_ICON } from '../components/Icon'
import { Sheet, navigate } from '../components/ui'
import { fmtDate, startOfDay, wdayShort, weekday } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { estimateMinutes, exById, generate, placeFor } from '../lib/training'
import { ctx, startWorkout } from '../lib/workout'

export default function Program() {
  const { t, p, l, lang } = useT()
  const s = useStore()
  const [open, setOpen] = useState<number | null>(null)
  const today = startOfDay(Date.now())
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => today + i * 86400000 + 12 * 3600000), [today])
  const c = ctx()
  const plans = useMemo(() => days.map((ts) => {
    const wd = weekday(ts)
    if (!s.profile.days.includes(wd)) return null
    const place = placeFor(c, ts)
    return { ts, place, ...generate(c, ts, place) }
  }), [s.profile.updatedAt, s.places, s.workouts.length])

  const toggleDay = (d: number) => {
    const on = s.profile.days.includes(d)
    const next = on ? s.profile.days.filter((x) => x !== d) : [...s.profile.days, d].sort()
    if (!next.length) return
    s.setProfile({ days: next })
  }
  const setDayPlace = (d: number, pid: string) => s.setProfile({ dayPlace: { ...s.profile.dayPlace, [String(d)]: pid } })
  const opened = open !== null ? plans[open] : null

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6 }}>
        <h1 className="h1">{t('prog_title')}</h1>
        <button className="iconbtn" title={t('prog_rebuild')} aria-label={t('prog_rebuild')} onClick={() => { s.setProfile({ seed: s.profile.seed + 1 }); s.showToast(t('prog_rebuilt')) }}><Icon name="refresh" size={20} /></button>
      </div>

      <div className="section">
        <div className="section-head"><div className="h3">{t('prog_days')}</div><span className="small muted">{s.profile.days.length >= 4 ? `${t('split_upper')} / ${t('split_lower')}` : t('split_full')}</span></div>
        <div className="week">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const on = s.profile.days.includes(d)
            return (
              <button key={d} className="wd" onClick={() => toggleDay(d)} aria-pressed={on}>
                <span className="dot" style={on ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}>{wdayShort(lang, d).slice(0, 2)}</span>
              </button>
            )
          })}
        </div>
        {s.places.length > 1 && (
          <div className="list" style={{ marginTop: 14 }}>
            {s.profile.days.map((d) => {
              const pid = s.profile.dayPlace[String(d)] ?? s.profile.defaultPlace
              return (
                <div className="li" key={d}>
                  <div className="li-main" style={{ flex: 'none', width: 52 }}><div className="li-title">{wdayShort(lang, d)}</div></div>
                  <div className="chips" style={{ margin: 0, padding: '8px 0', flex: 1 }}>
                    {s.places.map((pl) => (
                      <button key={pl.id} className={`chip ${pid === pl.id ? 'on' : ''}`} onClick={() => setDayPlace(d, pl.id)}><Icon name={PLACE_ICON[pl.kind]} size={16} />{pl.name}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head"><div className="h3">{t('prog_week')}</div></div>
        <div className="stack">
          {plans.map((pl, i) => {
            const ts = days[i]
            const label = `${wdayShort(lang, weekday(ts))}, ${fmtDate(ts, lang)}`
            if (!pl) return (
              <div key={i} className="card tight row" style={{ opacity: 0.7 }}>
                <div className="li-ic" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Icon name="moon" size={20} /></div>
                <div className="grow"><div style={{ fontWeight: 600 }}>{label}</div><div className="small muted">{t('prog_rest')}</div></div>
              </div>
            )
            return (
              <button key={i} className="card tight row press" style={{ textAlign: 'left' }} onClick={() => setOpen(i)}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: i === 0 ? 'var(--accent)' : 'var(--surface-2)', color: i === 0 ? 'var(--accent-ink)' : 'var(--text)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={PLACE_ICON[pl.place.kind]} size={20} /></div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div className="small muted inline-meta"><span>{t(pl.title)}</span><span>{pl.place.name}</span><span>{pl.items.length} {p(pl.items.length, 'today_exercises')}</span><span>{estimateMinutes(pl.items)} {t('min')}</span></div>
                </div>
                <Icon name="chevR" className="chev" />
              </button>
            )
          })}
        </div>
      </div>

      <Sheet open={!!opened} onClose={() => setOpen(null)} title={opened ? t(opened.title) : ''}>
        {opened && (
          <>
            <div className="list">
              {opened.items.map((it) => {
                const ex = exById(it.exerciseId, s.custom)!
                const work = it.sets.filter((x) => x.kind === 'work')
                return (
                  <button key={it.id} className="li" onClick={() => { setOpen(null); navigate(`/exercise/${ex.id}`) }}>
                    <div className="li-main"><div className="li-title">{l(ex.name)}</div><div className="li-sub">{ex.primary.map((m) => t('m_' + m)).join(', ')}</div></div>
                    <div className="li-val num">{work.length} × {ex.mode === 't' ? `${it.repHigh} ${t('sec')}` : it.repLow !== it.repHigh ? `${it.repLow}–${it.repHigh}` : it.repHigh}</div>
                  </button>
                )
              })}
            </div>
            {open === 0 && (
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => { setOpen(null); startWorkout(opened.place, opened.items, opened.title) }}>
                <Icon name="play" size={18} fill stroke={0} />{t('today_start')}
              </button>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
