import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Empty, LineChart, Sheet, goBack } from '../components/ui'
import * as db from '../lib/db'
import { fmtDate, fmtNum, fromUnit, monthShort, toUnit, uid } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import type { Measurement, PhotoEntry } from '../lib/types'

const FIELDS = ['weight', 'waist', 'chest', 'hips', 'arm', 'thigh'] as const
type F = (typeof FIELDS)[number]

export default function Body() {
  const { t } = useT()
  return (
    <div className="page">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/progress')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{t('pr_body')}</div>
        <span style={{ width: 44 }} />
      </div>
      <BodyContent />
    </div>
  )
}

export function BodyContent() {
  const { t, lang } = useT()
  const s = useStore()
  const units = s.profile.units
  const [field, setField] = useState<F>('weight')
  const [add, setAdd] = useState(false)
  const list = [...s.measurements].sort((a, b) => a.date - b.date)
  const withField = list.filter((m) => m[field] !== undefined)
  const conv = (f: F, v: number) => (f === 'weight' ? toUnit(v, units) : units === 'kg' ? v : v / 2.54)
  const unitOf = (f: F) => (f === 'weight' ? t(units) : units === 'kg' ? t('cm') : t('in'))
  const pts = withField.map((m) => conv(field, m[field]!))
  const labels = withField.map((m) => { const d = new Date(m.date); return `${d.getDate()} ${monthShort(lang, d.getMonth()).toLowerCase()}` })
  const last = withField[withField.length - 1]

  return (
    <div className="desk-2" style={{ marginTop: 16 }}>
      <div>
        <div className="chips">
          {FIELDS.map((f) => <button key={f} className={`chip ${f === field ? 'on' : ''}`} onClick={() => setField(f)}>{t('body_' + f)}</button>)}
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          {last ? (
            <>
              <div className="small muted">{t('body_' + field)}, {fmtDate(last.date, lang)}</div>
              <div className="stat-big num" style={{ fontSize: 38, marginTop: 6 }}>{fmtNum(conv(field, last[field]!), lang, 1)}<small>{unitOf(field)}</small></div>
              <div style={{ marginTop: 12 }}>{pts.length > 1 ? <LineChart points={pts} labels={labels} color="var(--blue)" fmt={(v) => fmtNum(v, lang, 0)} /> : <div className="small faint">{t('body_empty')}</div>}</div>
            </>
          ) : <Empty icon="ruler" text={t('body_empty')} />}
          <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setAdd(true)}><Icon name="plus" size={20} />{t('body_add')}</button>
        </div>
        {list.length > 0 && (
          <div className="section">
            <div className="section-head"><div className="h3">{t('body_measure')}</div></div>
            <div className="list">
              {[...list].reverse().slice(0, 12).map((m) => (
                <div className="li" key={m.id}>
                  <div className="li-main">
                    <div className="li-title">{fmtDate(m.date, lang, true)}</div>
                    <div className="li-sub num">{FIELDS.filter((f) => m[f] !== undefined).map((f) => `${t('body_' + f)} ${fmtNum(conv(f, m[f]!), lang, 1)}`).join(', ')}</div>
                  </div>
                  <button className="iconbtn ghost" onClick={() => s.deleteMeasurement(m.id)} aria-label={t('delete')}><Icon name="trash" size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Photos />
      {add && <AddMeasure onClose={() => setAdd(false)} prev={list[list.length - 1]} conv={conv} unitOf={unitOf} save={(m) => { s.saveMeasurement(m); setAdd(false) }} fromDisplay={(f, v) => (f === 'weight' ? fromUnit(v, units) : units === 'kg' ? v : v * 2.54)} />}
    </div>
  )
}

function AddMeasure({ onClose, prev, conv, unitOf, save, fromDisplay }: {
  onClose: () => void; prev?: Measurement; conv: (f: F, v: number) => number; unitOf: (f: F) => string
  save: (m: Measurement) => void; fromDisplay: (f: F, v: number) => number
}) {
  const { t } = useT()
  const [vals, setVals] = useState<Record<string, string>>({})
  return (
    <Sheet open onClose={onClose} title={t('body_add')}>
      <div className="stack">
        {FIELDS.map((f) => (
          <div key={f} className="row">
            <label className="grow" htmlFor={'m-' + f} style={{ fontWeight: 550 }}>{t('body_' + f)}<span className="muted small">, {unitOf(f)}</span></label>
            <input id={'m-' + f} className="field num" style={{ width: 130, textAlign: 'center' }} inputMode="decimal"
              placeholder={prev?.[f] !== undefined ? String(Math.round(conv(f, prev[f]!) * 10) / 10).replace('.', ',') : '—'}
              value={vals[f] ?? ''} onChange={(e) => setVals({ ...vals, [f]: e.target.value.replace(/[^0-9.,]/g, '') })} />
          </div>
        ))}
      </div>
      <button className="btn primary" style={{ marginTop: 18 }} disabled={!Object.values(vals).some((v) => v)} onClick={() => {
        const m: Measurement = { id: uid(), updatedAt: Date.now(), date: Date.now() }
        for (const f of FIELDS) {
          const n = parseFloat((vals[f] ?? '').replace(',', '.'))
          if (!isNaN(n) && n > 0) m[f] = Math.round(fromDisplay(f, n) * 100) / 100
        }
        save(m)
      }}>{t('save')}</button>
    </Sheet>
  )
}

function Photos() {
  const { t, lang } = useT()
  const [list, setList] = useState<(PhotoEntry & { url: string })[]>([])
  const [view, setView] = useState<(PhotoEntry & { url: string }) | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const load = async () => {
    const ps = await db.photos()
    setList((old) => { old.forEach((o) => URL.revokeObjectURL(o.url)); return ps.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })) })
  }
  useEffect(() => { load() }, [])
  const onFile = async (f?: File) => {
    if (!f) return
    const blob = await shrink(f)
    await db.addPhoto({ id: uid(), date: Date.now(), blob })
    load()
  }
  return (
    <div className="section">
      <div className="section-head"><div className="h3">{t('body_photos')}</div></div>
      <div className="small muted" style={{ marginTop: -6, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="key" size={14} />{t('body_photos_private')}</div>
      <div className="photo-grid">
        <button className="photo-add" onClick={() => input.current?.click()}><span><Icon name="camera" size={24} /><br />{t('body_photo_add')}</span></button>
        {list.map((p) => (
          <button key={p.id} className="ph" onClick={() => setView(p)}><img src={p.url} alt="" /><span>{fmtDate(p.date, lang)}</span></button>
        ))}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      <Sheet open={!!view} onClose={() => setView(null)} title={view ? fmtDate(view.date, lang, true) : ''}>
        {view && (
          <>
            <img src={view.url} alt="" style={{ width: '100%', borderRadius: 16 }} />
            <button className="btn danger" style={{ marginTop: 14 }} onClick={async () => { await db.deletePhoto(view.id); setView(null); load() }}><Icon name="trash" size={20} />{t('delete')}</button>
          </>
        )}
      </Sheet>
    </div>
  )
}

async function shrink(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f)
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise((r) => c.toBlob((b) => r(b ?? f), 'image/jpeg', 0.85))
  } catch { return f }
}
