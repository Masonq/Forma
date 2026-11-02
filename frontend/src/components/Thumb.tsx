import type { Exercise } from '../data/exercises'
import { exPhoto } from '../lib/media'
import { Icon } from './Icon'

function iconFor(ex: Exercise) {
  const eq = ex.equip.flat()
  if (eq.includes('barbell')) return 'barbell'
  if (eq.includes('dumbbell') || eq.includes('kettlebell')) return 'dumbbell'
  if (ex.mode === 't') return 'timer'
  return 'body'
}

export function ExThumb({ ex }: { ex: Exercise }) {
  const src = exPhoto(ex.id)
  if (src) return <div className="ex-thumb"><img src={src} alt="" loading="lazy" decoding="async" /></div>
  return <div className="ex-thumb"><Icon name={iconFor(ex)} size={22} /></div>
}
