import type { Muscle } from '../data/exercises'

// Карта мышц: векторная фигура /media/body.webp (1536×1024, фронт + спина)
// и пиксельно-точные маски мышц /media/muscle/<m>.webp (белые, с альфой),
// вырезанные по контурным линиям рисунка. Цвет задаётся фильтром:
// основные мышцы — красный, второстепенные (нагрузка < 0.65) — янтарный.
const MUSCLES: Muscle[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms',
  'lats', 'traps', 'lowerback', 'abs', 'obliques',
  'glutes', 'quads', 'hamstrings', 'calves',
]

const VIEWS = { front: '230 20 470 1004', back: '820 20 470 1004' } as const

// 255,255,255 -> целевой цвет
const RED = '0 0 0 0 0.886  0 0 0 0 0.216  0 0 0 0 0.267  0 0 0 1 0'
const AMBER = '0 0 0 0 0.961  0 0 0 0 0.620  0 0 0 0 0.043  0 0 0 1 0'

export function Anatomy({ levels, views = ['front', 'back'] }: {
  levels: Partial<Record<Muscle, number>>; color?: string; views?: ('front' | 'back')[]
}) {
  const active = MUSCLES
    .filter((m) => (levels[m] ?? 0) > 0)
    .map((m) => ({ m, v: Math.min(1, levels[m] ?? 0) }))
  return (
    <div className="anatomy" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>
      {views.map((vw) => (
        <svg key={vw} viewBox={VIEWS[vw]} role="img" aria-hidden="true">
          <defs>
            <filter id={`red-${vw}`}><feColorMatrix type="matrix" values={RED} /></filter>
            <filter id={`amber-${vw}`}><feColorMatrix type="matrix" values={AMBER} /></filter>
            <filter id={`glow-${vw}`} x="-30%" y="-30%" width="160%" height="160%">
              <feColorMatrix type="matrix" values={RED} /><feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <image href="/media/body.webp" x="0" y="0" width="1536" height="1024" />
          {/* свечение за основными мышцами */}
          {active.filter(({ v }) => v >= 0.65).map(({ m, v }) => (
            <image key={m} href={`/media/muscle/${m}.webp`} x="0" y="0" width="1536" height="1024" filter={`url(#glow-${vw})`} opacity={0.35 * v} />
          ))}
          {/* мышцы: основные красным, второстепенные янтарным */}
          {active.map(({ m, v }) => (
            <image key={m} href={`/media/muscle/${m}.webp`} x="0" y="0" width="1536" height="1024"
              filter={v >= 0.65 ? `url(#red-${vw})` : `url(#amber-${vw})`} opacity={v >= 0.65 ? 0.6 + 0.4 * v : 0.75} />
          ))}
          {/* контурные линии поверх заливки */}
          <image href="/media/body-lines.webp" x="0" y="0" width="1536" height="1024" />
        </svg>
      ))}
    </div>
  )
}
