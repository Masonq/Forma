import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

// ——— Маршрутизация ———
let listeners: (() => void)[] = []
export function navigate(to: string, replace = false) {
  if (to === location.pathname + location.search) return
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  listeners.forEach((l) => l())
  window.scrollTo(0, 0)
}
export function goBack(fallback = '/') {
  if (history.state?.idx > 0 || history.length > 1) {
    const before = location.pathname
    history.back()
    setTimeout(() => { if (location.pathname === before) navigate(fallback, true) }, 120)
  } else navigate(fallback, true)
}
export function usePath() {
  const [p, setP] = useState(location.pathname)
  useEffect(() => {
    const f = () => setP(location.pathname)
    listeners.push(f)
    window.addEventListener('popstate', f)
    return () => { listeners = listeners.filter((x) => x !== f); window.removeEventListener('popstate', f) }
  }, [])
  return p
}

// ——— Шторка ———
export function Sheet({ open, onClose, title, children, right }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; right?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab mobile-only" />
        {(title || right) && (
          <div className="sheet-head">
            <div className="h2 grow">{title}</div>
            {right ?? <button className="iconbtn" onClick={onClose} aria-label="close"><Icon name="close" size={20} /></button>}
          </div>
        )}
        {children}
      </div>
    </>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}

export function Clock({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <span className="clock num" style={{ fontSize: size }}>
      {text.split('').map((c, i) => <i key={i} className={c === ':' ? 'c' : ''}>{c}</i>)}
    </span>
  )
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  )
}

// ——— Графики ———
export function LineChart({ points, labels, height = 150, color = 'var(--accent)', fmt }: {
  points: number[]; labels: string[]; height?: number; color?: string; fmt: (v: number) => string
}) {
  const W = 320, H = height, padL = 34, padR = 12, padT = 22, padB = 24
  if (points.length === 0) return null
  const min = Math.min(...points), max = Math.max(...points)
  const span = max - min || Math.max(1, max * 0.1)
  const lo = min - span * 0.15, hi = max + span * 0.15
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (points.length - 1))
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB)
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)} ${H - padB} L${x(0)} ${H - padB} Z`
  const ticks = [lo + (hi - lo) * 0.2, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.8]
  const gid = 'g' + Math.round(Math.random() * 1e6)
  const lastI = points.length - 1
  const showLbl = labels.map((_, i) => i === 0 || i === lastI || labels.length <= 6 || i % Math.ceil(labels.length / 5) === 0)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === lastI ? 5 : 3} fill={i === lastI ? color : 'var(--surface)'} stroke={color} strokeWidth="2" />)}
      {labels.map((l, i) => showLbl[i] && (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 && points.length > 1 ? 'start' : i === lastI && points.length > 1 ? 'end' : 'middle'}>{l}</text>
      ))}
    </svg>
  )
}

export function BarChart({ values, labels, height = 130, color = 'var(--accent)', fmt }: { values: number[]; labels: string[]; height?: number; color?: string; fmt: (v: number) => string }) {
  const W = 320, H = height, padB = 22, padT = 18
  const max = Math.max(1, ...values)
  const bw = (W - 8) / values.length
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      {values.map((v, i) => {
        const h = Math.max(v ? 4 : 2, (v / max) * (H - padB - padT))
        const last = i === values.length - 1
        return (
          <g key={i}>
            <rect x={4 + i * bw + bw * 0.2} y={H - padB - h} width={bw * 0.6} height={h} rx={5} fill={last ? color : 'var(--surface-3)'} />
            {last && v > 0 && <text x={4 + i * bw + bw / 2} y={H - padB - h - 6} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 600 }}>{fmt(v)}</text>}
            <text x={4 + i * bw + bw / 2} y={H - 6} textAnchor="middle">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function Ring({ value, size = 56, stroke = 6, color = 'var(--accent)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={{ transition: 'stroke-dashoffset .4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}

// ——— Блины на грифе ———
export const PLATES = [
  { kg: 25, color: '#d7263d', h: 1 }, { kg: 20, color: '#2b59c3', h: 1 }, { kg: 15, color: '#f2c14e', h: 0.92 },
  { kg: 10, color: '#2e9e5b', h: 0.84 }, { kg: 5, color: '#e9e7e2', h: 0.62 }, { kg: 2.5, color: '#c8343f', h: 0.5 }, { kg: 1.25, color: '#9aa0a8', h: 0.42 },
]
export function platesFor(total: number, bar: number) {
  let side = Math.max(0, (total - bar) / 2)
  const out: typeof PLATES = []
  for (const p of PLATES) while (side >= p.kg - 1e-6 && out.length < 12) { out.push(p); side -= p.kg }
  const achieved = bar + out.reduce((a, p) => a + p.kg * 2, 0)
  return { plates: out, achieved }
}
export function BarbellSvg({ plates }: { plates: typeof PLATES }) {
  const W = 320, H = 120, cy = 60
  let x = 150
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      <rect x={10} y={cy - 3} width={300} height={6} rx={3} fill="var(--surface-3)" />
      <rect x={138} y={cy - 9} width={10} height={18} rx={2} fill="var(--faint)" />
      {plates.map((p, i) => {
        const w = p.kg >= 10 ? 14 : 10
        const h = 96 * p.h
        const el = <rect key={i} x={x} y={cy - h / 2} width={w} height={h} rx={3} fill={p.color} stroke="rgba(0,0,0,.25)" />
        x += w + 2
        return el
      })}
      <rect x={x + 1} y={cy - 7} width={6} height={14} rx={2} fill="var(--faint)" />
    </svg>
  )
}

export function Empty({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10, color: 'var(--faint)' }}><Icon name={icon} size={30} /></div>
      <div>{text}</div>
      {action}
    </div>
  )
}
