import type { Muscle } from '../data/exercises'

// Карта мышц как в топовых фитнес-приложениях: векторная фигура /media/body.webp
// (1536×1024, слева фронт, справа спина) + пиксельно-точные маски мышц
// /media/muscle/<m>.webp, вырезанные по контурным линиям рисунка.
const MUSCLES: Muscle[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms',
  'lats', 'traps', 'lowerback', 'abs', 'obliques',
  'glutes', 'quads', 'hamstrings', 'calves',
]

const VIEWS = { front: '230 20 470 1004', back: '820 20 470 1004' } as const

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
            <filter id={`aglow-${vw}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          <image href="/media/body.webp" x="0" y="0" width="1536" height="1024" />
          {/* мягкое свечение за активной мышцей */}
          <g filter={`url(#aglow-${vw})`}>
            {active.map(({ m, v }) => (
              <image key={m} href={`/media/muscle/${m}.webp`} x="0" y="0" width="1536" height="1024" opacity={0.35 * v} />
            ))}
          </g>
          {/* сама мышца: яркость по нагрузке */}
          {active.map(({ m, v }) => (
            <image key={m} href={`/media/muscle/${m}.webp`} x="0" y="0" width="1536" height="1024" opacity={0.5 + 0.5 * v} />
          ))}
          {/* контурные линии поверх заливки */}
          <image href="/media/body-lines.webp" x="0" y="0" width="1536" height="1024" />
        </svg>
      ))}
    </div>
  )
}
