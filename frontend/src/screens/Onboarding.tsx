import { useEffect, useMemo, useRef, useState } from 'react'
import type { Equip, Lang } from '../data/exercises'
import { EQUIPMENT, PLACE_DEFAULTS, levelsFromTest, type PlaceKind } from '../data/skills'
import { Icon, Logo, PLACE_ICON } from '../components/Icon'
import { Clock, Sheet, Toggle } from '../components/ui'
import { fmtClock, uid, wdayShort } from '../lib/format'
import { pick, tr } from '../lib/i18n'
import { useStore } from '../lib/store'
import { isIOS, isStandalone, recover } from '../lib/sync'
import type { Goal, Level, Place } from '../lib/types'

const KINDS: PlaceKind[] = ['gym', 'home', 'street', 'travel', 'custom']
const GOALS: { v: Goal; icon: string; color: string }[] = [
  { v: 'mass', icon: 'muscle', color: 'var(--red)' }, { v: 'cut', icon: 'flame', color: 'var(--accent)' },
  { v: 'strength', icon: 'barbell', color: 'var(--blue)' }, { v: 'shape', icon: 'bolt', color: 'var(--green)' },
  { v: 'health', icon: 'heart', color: 'var(--red)' },
]

export function PlatesArt() {
  return (
    <svg className="plates" viewBox="0 0 300 260" aria-hidden="true">
      <defs>
        <radialGradient id="pl" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></radialGradient>
      </defs>
      {[
        { x: 150, y: 120, r: 105, c: '#d7263d', l: '25' }, { x: 205, y: 150, r: 92, c: '#2b59c3', l: '20' },
        { x: 245, y: 175, r: 78, c: '#f2c14e', l: '15' }, { x: 270, y: 200, r: 60, c: '#2e9e5b', l: '10' },
      ].map((p, i) => (
        <g key={i}>
          <ellipse cx={p.x} cy={p.y} rx={p.r * 0.5} ry={p.r} fill={p.c} />
          <ellipse cx={p.x} cy={p.y} rx={p.r * 0.5} ry={p.r} fill="url(#pl)" />
          <ellipse cx={p.x} cy={p.y} rx={p.r * 0.34} ry={p.r * 0.7} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="2" />
          <ellipse cx={p.x} cy={p.y} rx={p.r * 0.09} ry={p.r * 0.18} fill="#1a1b1e" />
          <text x={p.x - p.r * 0.2} y={p.y - p.r * 0.38} fontSize={p.r * 0.2} fill="rgba(255,255,255,.75)" fontFamily="Unbounded Variable" fontWeight="700" transform={`skewY(-8)`}>{p.l}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Onboarding() {
  const st = useStore()
  const [lang, setLang] = useState<Lang>(st.profile.lang)
  const t = (k: string, v?: Record<string, string | number>) => tr(lang, k, v)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [kinds, setKinds] = useState<PlaceKind[]>([])
  const [customName, setCustomName] = useState('')
  const [equip, setEquip] = useState<Record<string, Equip[]>>({})
  const [dbMax, setDbMax] = useState<Record<string, number>>({ gym: 40 })
  const [quiet, setQuiet] = useState(true)
  const [small, setSmall] = useState(false)
  const [days, setDays] = useState<number[]>([0, 2, 4])
  const [dayKind, setDayKind] = useState<Record<number, PlaceKind>>({})
  const [test, setTest] = useState({ pushups: 0, squats: 0, plank: 0 })
  const [keyOpen, setKeyOpen] = useState(false)

  const equipKinds = kinds.filter((k) => k !== 'travel')
  const hasHome = kinds.includes('home') || kinds.includes('custom')
  const showInstall = isIOS() && !isStandalone()

  type StepId = 'lang' | 'goal' | 'level' | 'places' | `equip:${string}` | 'flat' | 'days' | 'test' | 'install'
  const flow: StepId[] = useMemo(() => {
    const f: StepId[] = ['lang', 'goal', 'level', 'places', ...equipKinds.map((k) => `equip:${k}` as StepId)]
    if (hasHome) f.push('flat')
    f.push('days', 'test')
    if (showInstall) f.push('install')
    return f
  }, [equipKinds.join(), hasHome, showInstall])

  const cur = step === 0 ? null : flow[step - 1]
  const total = flow.length

  const canNext = () => {
    if (cur === 'goal') return !!goal
    if (cur === 'level') return !!level
    if (cur === 'places') return kinds.length > 0 && (!kinds.includes('custom') || customName.trim().length > 0)
    if (cur === 'days') return days.length > 0
    return true
  }

  const finish = () => {
    const now = Date.now()
    const places: Place[] = kinds.map((k, i) => ({
      id: uid(), updatedAt: now, kind: k, order: i,
      name: k === 'custom' ? customName.trim() : pick(lang, PLACE_DEFAULTS[k].name),
      equip: k === 'travel' ? [] : equip[k] ?? PLACE_DEFAULTS[k].equip,
      dbMax: dbMax[k], quiet: (k === 'home' || k === 'custom' || k === 'travel') ? quiet : false,
      small: (k === 'home' || k === 'custom' || k === 'travel') ? small : false,
    }))
    places.forEach((p) => st.savePlace(p))
    const idOf = (k: PlaceKind) => places.find((p) => p.kind === k)?.id ?? places[0].id
    const dayPlace: Record<string, string> = {}
    for (const d of days) dayPlace[String(d)] = idOf(dayKind[d] ?? kinds[0])
    st.setProfile({
      name: name.trim(), lang, goal: goal ?? 'shape', level: level ?? 'new', days: [...days].sort(), dayPlace,
      defaultPlace: places[0].id, skill: levelsFromTest(test),
      test: { ...test, at: now }, onboarded: true,
    })
  }

  const next = () => {
    if (step >= total) { finish(); return }
    setStep(step + 1)
    window.scrollTo(0, 0)
  }

  if (step === 0) {
    return (
      <div className="ob ob-welcome">
        <div className="ob-bg" aria-hidden="true"><img src="/media/welcome.webp" alt="" /></div>
        <div className="ob-top"><Logo /></div>
        <div className="ob-hero">
          <h1>{t('ob_hero')}</h1>
          <p className="sub" style={{ maxWidth: '30ch' }}>{t('ob_hero_sub')}</p>
        </div>
        <div className="ob-foot">
          <button className="btn primary" onClick={() => setStep(1)}>{t('ob_start')}</button>
          <button className="btn line" onClick={() => setKeyOpen(true)}><Icon name="key" size={20} />{t('ob_have_key')}</button>
        </div>
        <KeySheet open={keyOpen} onClose={() => setKeyOpen(false)} lang={lang} />
      </div>
    )
  }

  return (
    <div className="ob">
      <div className="ob-top">
        <button className="iconbtn ghost" onClick={() => setStep(step - 1)} aria-label={t('back')}><Icon name="back" /></button>
        <div className="ob-progress"><i style={{ width: `${(step / total) * 100}%` }} /></div>
        <div className="ob-count num">{step > flow.indexOf('places') + 1 ? t('ob_step', { a: step, b: total }) : ''}</div>
      </div>
      <div className="ob-body">
        {cur === 'lang' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_lang')}</h2>
            <div className="stack" style={{ marginTop: 18 }}>
              {([['ru', 'Русский'], ['sr', 'Srpski'], ['en', 'English']] as [Lang, string][]).map(([v, l]) => (
                <button key={v} className={`opt ${lang === v ? 'on' : ''}`} onClick={() => { setLang(v); st.setProfile({ lang: v }) }}>
                  <div className="opt-ic"><Icon name="globe" /></div>
                  <div className="grow opt-t">{l}</div>
                  <div className="check">{lang === v && <Icon name="check" size={16} stroke={2.4} />}</div>
                </button>
              ))}
            </div>
            <label className="label" style={{ marginTop: 26 }}>{t('ob_name')}</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ob_name_ph')} maxLength={32} autoComplete="nickname" />
          </>
        )}

        {cur === 'goal' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_goal')}</h2>
            <p className="sub">{t('ob_goal_sub')}</p>
            <div className="stack" style={{ marginTop: 18 }}>
              {GOALS.map((g) => (
                <button key={g.v} className={`opt ${goal === g.v ? 'on' : ''}`} onClick={() => setGoal(g.v)}>
                  <div className="opt-ic" style={{ color: g.color }}><Icon name={g.icon} /></div>
                  <div className="grow"><div className="opt-t">{t('goal_' + g.v)}</div><div className="opt-d">{t('goal_' + g.v + '_d')}</div></div>
                  <div className="check">{goal === g.v && <Icon name="check" size={16} stroke={2.4} />}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {cur === 'level' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_level')}</h2>
            <div className="stack" style={{ marginTop: 18 }}>
              {(['new', 'mid', 'pro'] as Level[]).map((l, i) => (
                <button key={l} className={`opt ${level === l ? 'on' : ''}`} onClick={() => setLevel(l)}>
                  <div className="opt-ic"><LevelBars n={i + 1} /></div>
                  <div className="grow"><div className="opt-t">{t('level_' + l)}</div><div className="opt-d">{t('level_' + l + '_d')}</div></div>
                  <div className="check">{level === l && <Icon name="check" size={16} stroke={2.4} />}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {cur === 'places' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_places')}</h2>
            <p className="sub">{t('ob_places_sub')}</p>
            <div className="stack" style={{ marginTop: 18 }}>
              {KINDS.map((k) => {
                const on = kinds.includes(k)
                return (
                  <button key={k} className={`opt ${on ? 'on' : ''}`} onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])}>
                    <div className="opt-ic"><Icon name={PLACE_ICON[k]} /></div>
                    <div className="grow"><div className="opt-t">{pick(lang, PLACE_DEFAULTS[k].name)}</div><div className="opt-d">{t('place_' + k + '_d')}</div></div>
                    <div className="check sq">{on && <Icon name="check" size={16} stroke={2.4} />}</div>
                  </button>
                )
              })}
            </div>
            {kinds.includes('custom') && (
              <input className="field" style={{ marginTop: 12 }} value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={t('place_custom_name')} maxLength={28} autoFocus />
            )}
          </>
        )}

        {cur?.startsWith('equip:') && (() => {
          const k = cur.split(':')[1] as PlaceKind
          const list = equip[k] ?? PLACE_DEFAULTS[k].equip
          const setList = (l: Equip[]) => setEquip({ ...equip, [k]: l })
          const placeName = k === 'custom' ? customName : pick(lang, PLACE_DEFAULTS[k].name)
          return (
            <EquipPicker lang={lang} title={t('ob_equip', { place: placeName })} list={list} onChange={setList}
              dbMax={dbMax[k]} onDbMax={(v) => setDbMax({ ...dbMax, [k]: v })} showNothing={k !== 'gym'} />
          )
        })()}

        {cur === 'flat' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_flat')}</h2>
            <div className="list" style={{ marginTop: 18 }}>
              <div className="li"><div className="li-ic"><Icon name="moon" size={20} /></div><div className="li-main"><div className="li-title">{t('quiet')}</div><div className="li-sub">{t('quiet_d')}</div></div><Toggle on={quiet} onChange={setQuiet} label={t('quiet')} /></div>
              <div className="li"><div className="li-ic"><Icon name="grid" size={20} /></div><div className="li-main"><div className="li-title">{t('small')}</div><div className="li-sub">{t('small_d')}</div></div><Toggle on={small} onChange={setSmall} label={t('small')} /></div>
            </div>
          </>
        )}

        {cur === 'days' && (
          <>
            <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_days')}</h2>
            <p className="sub">{t('ob_days_sub')}</p>
            <div className="week" style={{ marginTop: 18 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const on = days.includes(d)
                return (
                  <button key={d} className="wd" onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}>
                    <span className={`dot ${on ? 'done' : ''}`} style={on ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}>{wdayShort(lang, d).slice(0, 2)}</span>
                  </button>
                )
              })}
            </div>
            {kinds.length > 1 && days.length > 0 && (
              <div className="list" style={{ marginTop: 20 }}>
                {[...days].sort().map((d) => (
                  <div className="li" key={d}>
                    <div className="li-main"><div className="li-title">{wdayShort(lang, d)}</div></div>
                    <div className="chips" style={{ margin: 0, padding: 0 }}>
                      {kinds.map((k) => (
                        <button key={k} className={`chip ${(dayKind[d] ?? kinds[0]) === k ? 'on' : ''}`} onClick={() => setDayKind({ ...dayKind, [d]: k })}>
                          <Icon name={PLACE_ICON[k]} size={16} />{k === 'custom' ? customName : pick(lang, PLACE_DEFAULTS[k].name)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {cur === 'test' && <TestStep lang={lang} test={test} setTest={setTest} />}

        {cur === 'install' && <InstallSteps lang={lang} />}
      </div>
      <div className="ob-foot">
        {cur === 'test' && <button className="btn line" onClick={() => { setTest({ pushups: 0, squats: 0, plank: 0 }); next() }}>{t('test_skip')}</button>}
        <button className="btn primary" disabled={!canNext()} onClick={next}>
          {step >= total ? t('ob_finish') : cur === 'install' ? t('install_later') : t('next')}
        </button>
      </div>
    </div>
  )
}

function LevelBars({ n }: { n: number }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {[0, 1, 2].map((i) => <rect key={i} x={2 + i * 7} y={16 - i * 5} width="4.5" height={4 + i * 5} rx="1.5" fill={i < n ? 'var(--accent)' : 'var(--surface-3)'} />)}
    </svg>
  )
}

export function EquipPicker({ lang, title, list, onChange, dbMax, onDbMax, showNothing }: {
  lang: Lang; title: string; list: Equip[]; onChange: (l: Equip[]) => void; dbMax?: number; onDbMax: (v: number) => void; showNothing: boolean
}) {
  const t = (k: string) => tr(lang, k)
  const toggle = (e: Equip) => onChange(list.includes(e) ? list.filter((x) => x !== e) : [...list, e])
  const nothing = list.length === 0
  const Row = ({ id, label }: { id: Equip; label: string }) => (
    <button className="li" onClick={() => toggle(id)}>
      <div className="li-main"><div className="li-title">{label}</div></div>
      <div className={`check sq ${list.includes(id) ? 'on' : ''}`}>{list.includes(id) && <Icon name="check" size={16} stroke={2.4} />}</div>
    </button>
  )
  return (
    <>
      <h2 className="h1" style={{ fontSize: 26 }}>{title}</h2>
      <p className="sub">{t('ob_equip_sub')}</p>
      {showNothing && (
        <button className={`opt ${nothing ? 'on' : ''}`} style={{ marginTop: 18 }} onClick={() => onChange([])}>
          <div className="opt-ic"><Icon name="body" /></div>
          <div className="grow"><div className="opt-t">{t('equip_nothing')}</div><div className="opt-d">{t('equip_nothing_d')}</div></div>
          <div className="check">{nothing && <Icon name="check" size={16} stroke={2.4} />}</div>
        </button>
      )}
      <div className="label" style={{ marginTop: 22 }}>{t('equip_sports')}</div>
      <div className="list">{EQUIPMENT.filter((e) => !e.home).map((e) => <Row key={e.id} id={e.id} label={pick(lang, e.name)} />)}</div>
      {list.includes('dumbbell') && (
        <div className="li" style={{ border: 0, padding: '8px 4px 0' }}>
          <div className="li-main"><div className="li-title">{t('db_max')}</div></div>
          <div className="row" style={{ gap: 8 }}>
            <button className="iconbtn" onClick={() => onDbMax(Math.max(1, (dbMax ?? 10) - (dbMax && dbMax > 20 ? 2 : 1)))} aria-label="-"><Icon name="minus" size={18} /></button>
            <div className="num" style={{ width: 64, textAlign: 'center', fontWeight: 650, fontSize: 18 }}>{dbMax ?? 10} {t('kg')}</div>
            <button className="iconbtn" onClick={() => onDbMax((dbMax ?? 10) + ((dbMax ?? 10) >= 20 ? 2 : 1))} aria-label="+"><Icon name="plus" size={18} /></button>
          </div>
        </div>
      )}
      <div className="label" style={{ marginTop: 22 }}>{t('equip_house')}</div>
      <div className="list">{EQUIPMENT.filter((e) => e.home).map((e) => <Row key={e.id} id={e.id} label={pick(lang, e.name)} />)}</div>
    </>
  )
}

function Counter({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="stepper" style={{ marginTop: 10 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} aria-label="-"><Icon name="minus" /></button>
      <div className="v">
        <input inputMode="numeric" value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))} />
        {unit && <small>{unit}</small>}
      </div>
      <button onClick={() => onChange(value + 1)} aria-label="+"><Icon name="plus" /></button>
    </div>
  )
}

function TestStep({ lang, test, setTest }: { lang: Lang; test: { pushups: number; squats: number; plank: number }; setTest: (t: { pushups: number; squats: number; plank: number }) => void }) {
  const t = (k: string) => tr(lang, k)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startAt = useRef(0)
  useEffect(() => {
    if (!running) return
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startAt.current) / 1000)), 250)
    return () => clearInterval(i)
  }, [running])
  return (
    <>
      <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_test')}</h2>
      <p className="sub">{t('ob_test_sub')}</p>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="h3">{t('test_push')}</div>
        <div className="small muted" style={{ marginTop: 4 }}>{t('test_push_hint')}</div>
        <Counter value={test.pushups} onChange={(v) => setTest({ ...test, pushups: v })} unit={t('reps')} />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="h3">{t('test_squat')}</div>
        <Counter value={test.squats} onChange={(v) => setTest({ ...test, squats: v })} unit={t('reps')} />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="h3">{t('test_plank')}</div>
        <div style={{ textAlign: 'center', margin: '16px 0 14px' }}><Clock text={fmtClock(running ? elapsed : test.plank)} size={48} /></div>
        <button className={`btn ${running ? 'primary' : ''}`} onClick={() => {
          if (running) { setRunning(false); setTest({ ...test, plank: elapsed }) }
          else { startAt.current = Date.now(); setElapsed(0); setRunning(true) }
        }}>
          <Icon name={running ? 'pause' : 'timer'} size={20} />{t(running ? 'test_timer_stop' : 'test_timer_start')}
        </button>
      </div>
    </>
  )
}

export function InstallSteps({ lang }: { lang: Lang }) {
  const t = (k: string) => tr(lang, k)
  return (
    <>
      <h2 className="h1" style={{ fontSize: 28 }}>{t('ob_install')}</h2>
      <p className="sub">{t('ob_install_sub')}</p>
      <div className="card stack" style={{ marginTop: 18, gap: 18 }}>
        <div className="install-step"><div className="n">1</div><div className="grow">{t('install_1')}</div><div className="li-ic"><Icon name="upload" size={20} /></div></div>
        <div className="install-step"><div className="n">2</div><div className="grow">{t('install_2')}</div><div className="li-ic"><Icon name="plus" size={20} /></div></div>
        <div className="install-step"><div className="n">3</div><div className="grow">{t('install_3')}</div><div className="li-ic"><Logo size={18} /></div></div>
      </div>
    </>
  )
}

export function KeySheet({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) {
  const t = (k: string) => tr(lang, k)
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <Sheet open={open} onClose={onClose} title={t('pf_key_enter')}>
      <p className="sub" style={{ marginTop: 0 }}>{t('pf_key_enter_d')}</p>
      <input className="field" style={{ marginTop: 14, textTransform: 'uppercase', letterSpacing: '.06em' }} value={v} onChange={(e) => { setV(e.target.value); setErr(false) }} placeholder="FORMA-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
      {err && <div className="small" style={{ color: 'var(--red)', marginTop: 8 }}>{t('pf_key_wrong')}</div>}
      <button className="btn primary" style={{ marginTop: 14 }} disabled={busy || v.trim().length < 10} onClick={async () => {
        setBusy(true)
        const ok = await recover(v)
        setBusy(false)
        if (ok) onClose(); else setErr(true)
      }}>{t('done')}</button>
    </Sheet>
  )
}
