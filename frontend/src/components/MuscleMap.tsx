import type { Muscle } from '../data/exercises'

type Side = { m?: Muscle; d: string; neutral?: boolean }

const FRONT_SIDE: Side[] = [
  { m: 'shoulders', d: 'M35 32L43 31L41 40L33 46Q31 38 35 32Z' },
  { m: 'chest', d: 'M44.5 32.5L49.3 33.4L49.3 46.2Q44.5 48.4 40.6 44.6L42.6 38Z' },
  { m: 'biceps', d: 'M32.2 48.4L39 43.6L38.2 57Q34.4 61 30.4 60.2Z' },
  { m: 'forearms', d: 'M29.6 62.4L37.2 59.6L34 77.4L28.4 78.2Z' },
  { m: 'obliques', d: 'M40.2 47.6L43.6 49.6L44.2 78.2L40.2 74.2Q38.2 60.6 40.2 47.6Z' },
  { m: 'quads', d: 'M40.2 84.2L49 87.4L48.2 118.2Q44.2 121.2 40.4 117.6Q37.4 100.6 40.2 84.2Z' },
  { m: 'calves', d: 'M40.8 127.2L47.6 127.2L46.6 152.2L42.2 153Q39.6 140.2 40.8 127.2Z' },
  { neutral: true, d: 'M27.8 80.6Q31 79.6 34 80.8L33.6 86Q31 88 28 86Z' },
  { neutral: true, d: 'M41.2 119.8Q44.4 122.6 47.8 120.4L47.6 125.2L41 125.2Z' },
  { neutral: true, d: 'M41.6 155.2L47 155.2L48.6 160.4L39.6 160.4Z' },
]
const FRONT_CENTER: Side[] = [
  { neutral: true, d: 'M50 6A8.6 10 0 1 1 49.99 6Z' },
  { neutral: true, d: 'M46 25.4L54 25.4L55.2 31L44.8 31Z' },
  { m: 'abs', d: 'M44.8 49.2L55.2 49.2L54.8 80Q50 83 45.2 80Z' },
]
const BACK_SIDE: Side[] = [
  { m: 'shoulders', d: 'M35 32L42 31.4L40.8 40L33 46Q31 38 35 32Z' },
  { m: 'triceps', d: 'M32.2 48.4L39 43.6L38.2 57Q34.4 61 30.4 60.2Z' },
  { m: 'forearms', d: 'M29.6 62.4L37.2 59.6L34 77.4L28.4 78.2Z' },
  { m: 'lats', d: 'M39.4 42.6L44.2 46.4L49.2 50L48.4 66L41.4 62Q38.4 52.6 39.4 42.6Z' },
  { m: 'glutes', d: 'M40.2 82.2L49.3 83.2L49.3 98Q44.2 100.4 40.2 96.4Q38.2 88.2 40.2 82.2Z' },
  { m: 'hamstrings', d: 'M40.2 100.4L49 101.4L48.2 119.6Q44.2 122 40.6 119.2Q38.6 110 40.2 100.4Z' },
  { m: 'calves', d: 'M40.2 126.4L48 126.4Q48.6 140 46.2 152.2L42.2 153Q38.6 138.4 40.2 126.4Z' },
  { neutral: true, d: 'M27.8 80.6Q31 79.6 34 80.8L33.6 86Q31 88 28 86Z' },
  { neutral: true, d: 'M41.6 155.2L47 155.2L48.6 160.4L39.6 160.4Z' },
]
const BACK_CENTER: Side[] = [
  { neutral: true, d: 'M50 6A8.6 10 0 1 1 49.99 6Z' },
  { m: 'traps', d: 'M42.4 27.6L57.6 27.6L63.4 33.8L56.2 43.8L50 47.4L43.8 43.8L36.6 33.8Z' },
  { m: 'lowerback', d: 'M44.6 67.4L55.4 67.4L56.6 80.4L43.4 80.4Z' },
]

function Shapes({ side, center, level, color }: { side: Side[]; center: Side[]; level: (m?: Muscle) => number; color: string }) {
  const draw = (s: Side, i: number) => {
    const v = s.m ? level(s.m) : 0
    return (
      <g key={i}>
        <path d={s.d} fill={s.neutral ? 'var(--body-2)' : 'var(--body)'} />
        {v > 0 && <path d={s.d} fill={color} opacity={0.25 + 0.75 * Math.min(1, v)} />}
      </g>
    )
  }
  return (
    <>
      {center.map(draw)}
      <g>{side.map(draw)}</g>
      <g transform="translate(100 0) scale(-1 1)">{side.map(draw)}</g>
    </>
  )
}

export function MuscleMap({ levels, color = 'var(--red)', width = 200, views = 'both' }: {
  levels: Partial<Record<Muscle, number>>; color?: string; width?: number; views?: 'both' | 'front'
}) {
  const level = (m?: Muscle) => (m ? levels[m] ?? 0 : 0)
  const vbW = views === 'both' ? 200 : 100
  return (
    <svg viewBox={`22 2 ${vbW - 44} 162`} width={width} style={{ height: 'auto' }} role="img" aria-hidden="true">
      <g><Shapes side={FRONT_SIDE} center={FRONT_CENTER} level={level} color={color} /></g>
      {views === 'both' && <g transform="translate(100 0)"><Shapes side={BACK_SIDE} center={BACK_CENTER} level={level} color={color} /></g>}
    </svg>
  )
}
