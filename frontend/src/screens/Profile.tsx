import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../data/exercises'
import { EQUIPMENT, PLACE_DEFAULTS, type PlaceKind } from '../data/skills'
import { Icon, PLACE_ICON } from '../components/Icon'
import { Sheet, Toggle, goBack, navigate } from '../components/ui'
import { exportCSV, importCSV } from '../lib/csv'
import { uid } from '../lib/format'
import { pick, useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { accountKey, disablePush, enablePush, isStandalone, pushState } from '../lib/sync'
import type { Goal, Level, Place } from '../lib/types'
import { EquipPicker, InstallSteps, KeySheet } from './Onboarding'

function Opt<T extends string | number>({ value, options, onPick }: { value: T; options: { v: T; label: string; sub?: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="stack">
      {options.map((o) => (
        <button key={String(o.v)} className={`opt ${o.v === value ? 'on' : ''}`} onClick={() => onPick(o.v)}>
          <div className="grow"><div className="opt-t">{o.label}</div>{o.sub && <div className="opt-d">{o.sub}</div>}</div>
          <div className="check">{o.v === value && <Icon name="check" size={16} stroke={2.4} />}</div>
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const { t, p, lang } = useT()
  const s = useStore()
  const pr = s.profile
  const [sheet, setSheet] = useState<null | 'goal' | 'level' | 'lang' | 'units' | 'rest' | 'key' | 'enterKey' | 'install' | 'name' | 'theme'>(null)
  const [push, setPush] = useState<'on' | 'off' | 'denied' | 'install' | 'unsupported'>('off')
  const [key, setKey] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState(pr.name)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { pushState().then(setPush) }, [])
  const done = s.workouts.filter((w) => w.status === 'done').length

  const onImport = async (f?: File) => {
    if (!f) return
    const text = await f.text()
    const res = importCSV(text, s.custom, pr.defaultPlace)
    if (!res || !res.workouts.length) { s.showToast(t('pf_import_fail'), 'warn'); return }
    res.custom.forEach((c) => s.saveCustom(c))
    res.workouts.forEach((w) => s.saveWorkout(w))
    s.showToast(t('pf_import_done', { n: res.workouts.length }), 'ok')
  }
  const onExport = () => {
    const csv = exportCSV(s.workouts, s.custom)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `forma-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const onPush = async (v: boolean) => {
    if (!v) { await disablePush(); setPush('off'); return }
    if (push === 'install') { setSheet('install'); return }
    const ok = await enablePush()
    setPush(ok ? 'on' : await pushState())
  }

  const Row = ({ icon, title, sub, val, onClick, right }: { icon: string; title: string; sub?: string; val?: string; onClick?: () => void; right?: React.ReactNode }) => (
    right ? (
      <div className="li">
        <div className="li-ic"><Icon name={icon} size={20} /></div>
        <div className="li-main"><div className="li-title">{title}</div>{sub && <div className="li-sub">{sub}</div>}</div>
        {val && <div className="li-val">{val}</div>}
        {right}
      </div>
    ) : (
      <button className="li" onClick={onClick} disabled={!onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div className="li-ic"><Icon name={icon} size={20} /></div>
        <div className="li-main"><div className="li-title">{title}</div>{sub && <div className="li-sub">{sub}</div>}</div>
        {val && <div className="li-val">{val}</div>}
        {onClick && <Icon name="chevR" className="chev" />}
      </button>
    )
  )

  const restLabel = pr.restDefault ? `${pr.restDefault} ${t('sec')}` : t('pf_rest_auto')
  const pushSub = push === 'install' ? t('pf_notify_need_install') : push === 'denied' ? t('pf_notify_denied') : t('pf_notify_d')

  return (
    <div className="page narrow">
      <div className="row" style={{ gap: 16, paddingTop: 10 }}>
        <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, flex: 'none' }}>
          {pr.name ? pr.name.trim().slice(0, 1).toUpperCase() : <Icon name="profile" size={28} />}
        </div>
        <button className="grow" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => { setName(pr.name); setSheet('name') }}>
          {pr.name ? <div className="h2 ellipsis">{pr.name}</div> : <div className="h2 ellipsis" style={{ color: 'var(--accent)' }}>{t('pf_add_name')}</div>}
          <div className="small muted inline-meta"><span>{t('goal_' + pr.goal)}</span><span>{t('level_' + pr.level)}</span><span><span className="num">{done}</span> {p(done, 'workouts_n')}</span></div>
        </button>
      </div>

      <div className="section">
        <div className="list">
          <Row icon="pin" title={t('pf_places')} sub={s.places.map((x) => x.name).join(', ')} onClick={() => navigate('/places')} />
          <Row icon="layers" title={t('pf_skills')} sub={t('pf_skills_d')} onClick={() => navigate('/skills')} />
          <Row icon="body" title={t('nav_body')} onClick={() => navigate('/body')} />
          <Row icon="book" title={t('nav_library')} onClick={() => navigate('/library')} />
        </div>
      </div>

      <div className="section">
        <div className="list">
          <Row icon="goal" title={t('pf_goal')} val={t('goal_' + pr.goal)} onClick={() => setSheet('goal')} />
          <Row icon="level" title={t('pf_level')} val={t('level_' + pr.level)} onClick={() => setSheet('level')} />
          <Row icon="globe" title={t('pf_lang')} val={{ ru: 'Русский', en: 'English', sr: 'Srpski' }[lang]} onClick={() => setSheet('lang')} />
          <Row icon="moon" title={t('pf_theme')} val={t('theme_' + (pr.theme ?? 'dark'))} onClick={() => setSheet('theme')} />
          <Row icon="ruler" title={t('pf_units')} val={pr.units === 'kg' ? `${t('kg')}, ${t('cm')}` : 'lb, in'} onClick={() => setSheet('units')} />
          <Row icon="timer" title={t('pf_rest')} val={restLabel} onClick={() => setSheet('rest')} />
          <Row icon="bell" title={t('pf_notify')} sub={pushSub} right={push === 'unsupported' ? <span className="faint small">—</span> : <Toggle on={push === 'on'} onChange={onPush} label={t('pf_notify')} />} />
          <Row icon="sound" title={t('pf_sound')} right={<Toggle on={pr.sound} onChange={(v) => s.setProfile({ sound: v })} label={t('pf_sound')} />} />
        </div>
      </div>

      <div className="section">
        <div className="section-head"><div className="h3">{t('pf_data')}</div><span className="small" style={{ color: s.synced ? 'var(--green)' : 'var(--faint)' }}>{s.synced ? t('pf_sync_ok') : t('pf_sync_wait')}</span></div>
        <div className="list">
          <Row icon="upload" title={t('pf_import')} sub={t('pf_import_d')} onClick={() => file.current?.click()} />
          <Row icon="download" title={t('pf_export')} sub={t('pf_export_d')} onClick={onExport} />
          <Row icon="key" title={t('pf_key')} sub={t('pf_key_d')} onClick={async () => { setSheet('key'); setKey(await accountKey()) }} />
          <Row icon="refresh" title={t('pf_key_enter')} onClick={() => setSheet('enterKey')} />
          {!isStandalone() && <Row icon="plus" title={t('pf_install')} onClick={() => setSheet('install')} />}
        </div>
        <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <div className="small faint" style={{ textAlign: 'center', marginTop: 22 }}>Forma, {t('pf_version').toLowerCase()} {__APP_VERSION__}</div>

      <Sheet open={sheet === 'name'} onClose={() => setSheet(null)} title={t('pf_name')}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} autoFocus />
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => { s.setProfile({ name: name.trim() }); setSheet(null) }}>{t('save')}</button>
      </Sheet>
      <Sheet open={sheet === 'goal'} onClose={() => setSheet(null)} title={t('pf_goal')}>
        <Opt<Goal> value={pr.goal} onPick={(v) => { s.setProfile({ goal: v }); setSheet(null) }} options={(['mass', 'cut', 'strength', 'shape', 'health'] as Goal[]).map((g) => ({ v: g, label: t('goal_' + g), sub: t('goal_' + g + '_d') }))} />
      </Sheet>
      <Sheet open={sheet === 'level'} onClose={() => setSheet(null)} title={t('pf_level')}>
        <Opt<Level> value={pr.level} onPick={(v) => { s.setProfile({ level: v }); setSheet(null) }} options={(['new', 'mid', 'pro'] as Level[]).map((g) => ({ v: g, label: t('level_' + g), sub: t('level_' + g + '_d') }))} />
      </Sheet>
      <Sheet open={sheet === 'lang'} onClose={() => setSheet(null)} title={t('pf_lang')}>
        <Opt<Lang> value={lang} onPick={(v) => { s.setProfile({ lang: v }); setSheet(null) }} options={[{ v: 'ru', label: 'Русский' }, { v: 'sr', label: 'Srpski' }, { v: 'en', label: 'English' }]} />
      </Sheet>
      <Sheet open={sheet === 'theme'} onClose={() => setSheet(null)} title={t('pf_theme')}>
        <Opt<'dark' | 'light' | 'system'> value={pr.theme ?? 'dark'} onPick={(v) => { s.setProfile({ theme: v }); setSheet(null) }} options={[{ v: 'dark', label: t('theme_dark') }, { v: 'light', label: t('theme_light') }, { v: 'system', label: t('theme_system') }]} />
      </Sheet>
      <Sheet open={sheet === 'units'} onClose={() => setSheet(null)} title={t('pf_units')}>
        <Opt<'kg' | 'lb'> value={pr.units} onPick={(v) => { s.setProfile({ units: v }); setSheet(null) }} options={[{ v: 'kg', label: `${t('kg')}, ${t('cm')}` }, { v: 'lb', label: 'lb, in' }]} />
      </Sheet>
      <Sheet open={sheet === 'rest'} onClose={() => setSheet(null)} title={t('pf_rest')}>
        <Opt<number> value={pr.restDefault} onPick={(v) => { s.setProfile({ restDefault: v }); setSheet(null) }} options={[0, 45, 60, 90, 120, 180].map((v) => ({ v, label: v ? `${v} ${t('sec')}` : t('pf_rest_auto') }))} />
      </Sheet>
      <Sheet open={sheet === 'key'} onClose={() => { setSheet(null); setCopied(false) }} title={t('pf_key')}>
        <p className="sub" style={{ marginTop: 0 }}>{t('pf_key_d')}</p>
        <div className="key-box num" style={{ marginTop: 14 }}>{key ?? t('pf_key_offline')}</div>
        {key && <button className="btn primary" style={{ marginTop: 14 }} onClick={async () => { try { await navigator.clipboard.writeText(key); setCopied(true) } catch { /* */ } }}><Icon name={copied ? 'check' : 'copy'} size={20} />{t(copied ? 'pf_key_copied' : 'pf_key_copy')}</button>}
      </Sheet>
      <KeySheet open={sheet === 'enterKey'} onClose={() => setSheet(null)} lang={lang} />
      <Sheet open={sheet === 'install'} onClose={() => setSheet(null)}>
        <InstallSteps lang={lang} />
        <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setSheet(null)}>{t('done')}</button>
      </Sheet>
    </div>
  )
}

export function PlacesScreen() {
  const { t, l } = useT()
  const s = useStore()
  const [adding, setAdding] = useState(false)
  const add = (kind: PlaceKind) => {
    const p: Place = {
      id: uid(), updatedAt: Date.now(), kind, name: pick(s.profile.lang, PLACE_DEFAULTS[kind].name), equip: PLACE_DEFAULTS[kind].equip,
      quiet: kind === 'home' || kind === 'travel', small: false, order: s.places.length,
    }
    s.savePlace(p)
    setAdding(false)
    navigate(`/place/${p.id}`)
  }
  return (
    <div className="page narrow">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/profile')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{t('pf_places')}</div>
        <span style={{ width: 44 }} />
      </div>
      <p className="sub" style={{ marginTop: 0 }}>{t('pf_places_d')}</p>
      <div className="list" style={{ marginTop: 14 }}>
        {s.places.map((p) => (
          <button key={p.id} className="li" onClick={() => navigate(`/place/${p.id}`)}>
            <div className="li-ic"><Icon name={PLACE_ICON[p.kind]} size={20} /></div>
            <div className="li-main">
              <div className="li-title">{p.name}</div>
              <div className="li-sub ellipsis">{p.equip.length ? p.equip.map((e) => l(EQUIPMENT.find((x) => x.id === e)!.name)).join(', ') : t('lib_bodyweight')}{p.quiet ? `, ${t('quiet').toLowerCase()}` : ''}</div>
            </div>
            <Icon name="chevR" className="chev" />
          </button>
        ))}
      </div>
      <button className="btn line" style={{ marginTop: 14 }} onClick={() => setAdding(true)}><Icon name="plus" size={20} />{t('pf_place_add')}</button>
      <Sheet open={adding} onClose={() => setAdding(false)} title={t('pf_place_add')}>
        <div className="stack">
          {(['gym', 'home', 'street', 'travel', 'custom'] as PlaceKind[]).map((k) => (
            <button key={k} className="opt" onClick={() => add(k)}>
              <div className="opt-ic"><Icon name={PLACE_ICON[k]} /></div>
              <div className="grow"><div className="opt-t">{l(PLACE_DEFAULTS[k].name)}</div><div className="opt-d">{t('place_' + k + '_d')}</div></div>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

export function PlaceEdit({ id }: { id: string }) {
  const { t, lang } = useT()
  const s = useStore()
  const place = s.places.find((p) => p.id === id)
  const [name, setName] = useState(place?.name ?? '')
  if (!place) return <div className="page"><div className="empty">{t('lib_none')}</div></div>
  const save = (patch: Partial<Place>) => s.savePlace({ ...place, ...patch })
  return (
    <div className="page narrow">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => { if (name.trim() && name !== place.name) save({ name: name.trim() }); goBack('/places') }} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{place.name}</div>
        <span style={{ width: 44 }} />
      </div>
      <label className="label">{t('place_custom_name')}</label>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && save({ name: name.trim() })} maxLength={28} />
      <div className="list" style={{ marginTop: 16 }}>
        <div className="li"><div className="li-ic"><Icon name="moon" size={20} /></div><div className="li-main"><div className="li-title">{t('quiet')}</div><div className="li-sub">{t('quiet_d')}</div></div><Toggle on={place.quiet} onChange={(v) => save({ quiet: v })} /></div>
        <div className="li"><div className="li-ic"><Icon name="grid" size={20} /></div><div className="li-main"><div className="li-title">{t('small')}</div><div className="li-sub">{t('small_d')}</div></div><Toggle on={place.small} onChange={(v) => save({ small: v })} /></div>
      </div>
      <div style={{ marginTop: 22 }}>
        <EquipPicker lang={lang} title={t('ob_equip', { place: place.name })} list={place.equip} onChange={(l) => save({ equip: l })} dbMax={place.dbMax} onDbMax={(v) => save({ dbMax: v })} showNothing />
      </div>
      <button className="btn danger" style={{ marginTop: 22 }} onClick={() => {
        if (s.places.length <= 1) { s.showToast(t('pf_place_last'), 'warn'); return }
        s.deletePlace(place.id)
        if (s.profile.defaultPlace === place.id) s.setProfile({ defaultPlace: s.places.find((p) => p.id !== place.id)!.id })
        goBack('/places')
      }}><Icon name="trash" size={20} />{t('pf_place_delete')}</button>
    </div>
  )
}
