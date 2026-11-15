import type { Muscle } from '../data/exercises'
import { useT } from '../lib/i18n'

// Карта мышц: векторная фигура /media/body.webp (1536×1024, фронт + спина)
// и пиксельно-точные маски /media/muscle/<m>.webp (оттенки серого с альфой,
// запечён объём), вырезанные по контурным линиям рисунка. Один цвет:
// основные мышцы — насыщенный красный, второстепенные — тот же красный, приглушённый.
const MUSCLES: Muscle[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms',
  'lats', 'traps', 'lowerback', 'abs', 'obliques',
  'glutes', 'quads', 'hamstrings', 'calves',
]

const VIEWS = { front: '230 20 470 1004', back: '820 20 470 1004' } as const

// белый -> красный приложения
const RED = '0 0 0 0 0.886  0 0 0 0 0.216  0 0 0 0 0.267  0 0 0 1 0'
const IMG = { x: 0, y: 0, width: 1536, height: 1024 } as const

export function Anatomy({ levels, mode = 'roles', views = ['front', 'back'] }: {
  levels: Partial<Record<Muscle, number>>; mode?: 'roles' | 'heat'; color?: string; views?: ('front' | 'back')[]
}) {
  const { t } = useT()
  const active = MUSCLES
    .filter((m) => (levels[m] ?? 0) > 0)
    .map((m) => ({ m, v: Math.min(1, levels[m] ?? 0) }))
  const op = (v: number) => (mode === 'roles' ? (v >= 0.65 ? 1 : 0.45) : 0.3 + 0.7 * v)
  return (
    <div className="anatomy" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>
      {views.map((vw) => (
        <figure key={vw}>
          <svg viewBox={VIEWS[vw]} role="img" aria-hidden="true">
            <defs>
              <filter id={`red-${vw}`}><feColorMatrix type="matrix" values={RED} /></filter>
            </defs>
            <image href="/media/body.webp" {...IMG} />
            <g filter={`url(#red-${vw})`}>
              {active.map(({ m, v }) => (
                <image key={m} href={`/media/muscle/${m}.webp`} {...IMG} opacity={op(v)} />
              ))}
            </g>
            <image href="/media/body-lines.webp" {...IMG} />
          </svg>
          <figcaption className="a-cap">{t(vw === 'front' ? 'an_front' : 'an_back')}</figcaption>
        </figure>
      ))}
    </div>
  )
}
