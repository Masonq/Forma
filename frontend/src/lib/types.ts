import type { Equip, Lang, Mode, Muscle, Pattern } from '../data/exercises'
import type { BranchId, PlaceKind } from '../data/skills'

export type Goal = 'mass' | 'cut' | 'strength' | 'shape' | 'health'
export type Level = 'new' | 'mid' | 'pro'

export interface Base { id: string; updatedAt: number; deleted?: boolean }

export interface Profile extends Base {
  name: string
  lang: Lang
  units: 'kg' | 'lb'
  theme?: 'dark' | 'light' | 'system'
  goal: Goal
  level: Level
  onboarded: boolean
  restDefault: number // 0 = по цели
  sound: boolean
  days: number[] // 0 = Пн
  dayPlace: Record<string, string> // день → placeId
  defaultPlace: string
  skill: Record<BranchId, number>
  skillPasses: Record<BranchId, number>
  test?: { pushups: number; squats: number; plank: number; at: number }
  seed: number
  createdAt: number
}

export interface Place extends Base {
  kind: PlaceKind
  name: string
  equip: Equip[]
  dbMax?: number
  quiet: boolean
  small: boolean
  order: number
}

export interface SetEntry {
  id: string
  kind: 'warmup' | 'work'
  weight?: number // всегда в кг
  reps?: number
  seconds?: number
  rpe?: number
  done: boolean
  doneAt?: number
}

export interface WorkoutItem {
  id: string
  exerciseId: string
  superset?: string
  rest: number
  repLow?: number
  repHigh?: number
  sets: SetEntry[]
  note?: string
}

export interface Workout extends Base {
  status: 'active' | 'done'
  title: string
  placeId: string
  startedAt: number
  endedAt?: number
  items: WorkoutItem[]
  source?: 'plan' | 'empty' | 'import'
  summary?: WorkoutSummary
}

export interface RecordHit {
  exerciseId: string
  kind: 'weight' | 'e1rm' | 'reps' | 'time' | 'volume'
  value: number
  prev?: number
}

export interface WorkoutSummary {
  records: RecordHit[]
  stepUps: { branch: BranchId; from: string; to: string }[]
  stepProgress: { branch: BranchId; ex: string; passes: number }[]
  volume: number
  sets: number
}

export interface Measurement extends Base {
  date: number
  weight?: number
  waist?: number
  chest?: number
  hips?: number
  arm?: number
  thigh?: number
}

export interface CustomExercise extends Base {
  name: string
  mode: Mode
  primary: Muscle[]
  pattern: Pattern
}

export interface PhotoEntry { id: string; date: number; blob: Blob }

export type SyncKind = 'profile' | 'place' | 'workout' | 'measurement' | 'exercise'
