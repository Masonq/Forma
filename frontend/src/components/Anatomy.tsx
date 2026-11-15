import type { Muscle } from '../data/exercises'
import { useT } from '../lib/i18n'

// Карта мышц: векторная фигура /media/body.webp (1536×1024, фронт + спина)
// и пиксельно-точные маски /media/muscle/<m>.webp (белые, с альфой),
// вырезанные по контурным линиям рисунка.
// mode='roles' — основные красным (с пульсирующим свечением), второстепенные янтарным.
// mode='heat'  — тепловая шкала: яркость красного по нагрузке.
const MUSCLES: Muscle[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms',
  'lats', 'traps', 'lowerback', 'abs', 'obliques',
  'glutes', 'quads', 'hamstrings', 'calves',
]

const VIEWS = { front: '230 20 470 1004', back: '820 20 470 1004' } as const

// 255,255,255 -> целевой цвет
const RED = '0 0 0 0 0.886  0 0 0 0 0.216  0 0 0 0 0.267  0 0 0 1 0'
const AMBER = '0 0 0 0 0.961  0 0 0 0 0.620  0 0 0 0 0.043  0 0 0 1 0'
const IMG = { x: 0, y: 0, width: 1536, height: 1024 } as const

export function Anatomy({ levels, mode = 'roles', views = ['front', 'back'] }: {
  levels: Partial<Record<Muscle, number>>; mode?: 'roles' | 'heat'; color?: string; views?: ('front' | 'back')[]
}) {
  const { t } = useT()
  const active = MUSCLES
    .filter((m) => (levels[m] ?? 0) > 0)
    .map((m) => ({ m, v: Math.min(1, levels[m] ?? 0) }))
  return (
    <div className="anatomy" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>
      {views.map((vw) => (
        <figure key={vw}>
          <svg viewBox={VIEWS[vw]} role="img" aria-hidden="true">
            <defs>
              <filter id={`red-${vw}`}><feColorMatrix type="matrix" values={RED} /></filter>
              <filter id={`amber-${vw}`}><feColorMatrix type="matrix" values={AMBER} /></filter>
              <filter id={`glow-${vw}`} x="-30%" y="-30%" width="160%" height="160%">
                <feColorMatrix type="matrix" values={RED} /><feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>
            <image href="/media/body.webp" {...IMG} />
            {/* пульсирующее свечение за основными мышцами */}
            <g className="a-pulse">
              {active.filter(({ v }) => mode === 'heat' || v >= 0.65).map(({ m, v }) => (
                <image key={m} href={`/media/muscle/${m}.webp`} {...IMG} filter={`url(#glow-${vw})`} opacity={0.4 * v} />
              ))}
            </g>
            {/* заливка мышц */}
            {active.map(({ m, v }) => (
              <image key={m} href={`/media/muscle/${m}.webp`} {...IMG}
                filter={mode === 'roles' && v < 0.65 ? `url(#amber-${vw})` : `url(#red-${vw})`}
                opacity={mode === 'roles' ? (v >= 0.65 ? 1 : 0.8) : 0.35 + 0.65 * v} />
            ))}
            {/* контурные линии поверх заливки */}
            <image href="/media/body-lines.webp" {...IMG} />
          </svg>
          <figcaption className="a-cap">{t(vw === 'front' ? 'an_front' : 'an_back')}</figcaption>
        </figure>
      ))}
    </div>
  )
}
