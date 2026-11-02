import type { Muscle } from '../data/exercises'

// Зоны мышц на /media/anatomy.webp (1920×1280): [cx, cy, rx, ry]
type Z = [number, number, number, number]
const ZONES: Partial<Record<Muscle, Z[]>> = {
  shoulders: [[345, 305, 48, 55], [645, 305, 48, 55], [1262, 312, 50, 55], [1568, 312, 50, 55]],
  chest: [[430, 345, 72, 52], [560, 345, 72, 52]],
  abs: [[495, 480, 62, 115]],
  obliques: [[402, 490, 26, 85], [588, 490, 26, 85]],
  biceps: [[322, 420, 30, 62], [668, 420, 30, 62]],
  forearms: [[272, 570, 28, 85], [718, 570, 28, 85], [1192, 570, 28, 85], [1638, 570, 28, 85]],
  quads: [[432, 800, 55, 145], [558, 800, 55, 145]],
  calves: [[1362, 1045, 40, 85], [1470, 1045, 40, 85], [420, 1060, 28, 85], [570, 1060, 28, 85]],
  traps: [[1415, 300, 110, 70]],
  lats: [[1335, 440, 58, 95], [1495, 440, 58, 95]],
  triceps: [[1235, 425, 30, 62], [1595, 425, 30, 62]],
  lowerback: [[1415, 555, 48, 55]],
  glutes: [[1365, 665, 62, 68], [1467, 665, 62, 68]],
  hamstrings: [[1362, 830, 50, 110], [1470, 830, 50, 110]],
}

// Два кадра из одной картинки: спереди и сзади
const VIEWS = { front: '170 40 650 1220', back: '1090 40 650 1220' } as const

export function Anatomy({ levels, color = 'var(--red)', views = ['front', 'back'] }: {
  levels: Partial<Record<Muscle, number>>; color?: string; views?: ('front' | 'back')[]
}) {
  const zones = (Object.keys(levels) as Muscle[]).flatMap((m) => (ZONES[m] ?? []).map((z, i) => ({ m, z, i, v: levels[m] ?? 0 })))
  return (
    <div className="anatomy" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>
      {views.map((vw) => (
        <svg key={vw} viewBox={VIEWS[vw]} role="img" aria-hidden="true">
          <defs>
            <filter id={`blur-${vw}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
          </defs>
          <image href="/media/anatomy.webp" x="0" y="0" width="1920" height="1280" />
          <g filter={`url(#blur-${vw})`}>
            {zones.filter((x) => x.v > 0).map(({ m, z, i, v }) => (
              <ellipse key={m + i} cx={z[0]} cy={z[1]} rx={z[2]} ry={z[3]} fill={color} style={{ mixBlendMode: 'color', opacity: 0.35 + 0.6 * Math.min(1, v) }} />
            ))}
          </g>
          <g filter={`url(#blur-${vw})`}>
            {zones.filter((x) => x.v > 0).map(({ m, z, i, v }) => (
              <ellipse key={m + i} cx={z[0]} cy={z[1]} rx={z[2] * 0.85} ry={z[3] * 0.85} fill={color} style={{ mixBlendMode: 'soft-light', opacity: 0.5 * Math.min(1, v) }} />
            ))}
          </g>
        </svg>
      ))}
    </div>
  )
}
