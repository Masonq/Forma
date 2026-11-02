import type { Equip, L3 } from './exercises'

export type BranchId = 'push' | 'squat' | 'core' | 'pull'

export interface SkillStep {
  ex: string
  goal: number // повторы или секунды в каждом из 3 подходов
}

export interface Branch {
  id: BranchId
  name: L3
  steps: SkillStep[]
}

export const SETS_TO_PASS = 3
export const PASSES_TO_UNLOCK = 2

export const BRANCHES: Branch[] = [
  {
    id: 'push', name: ['Отжимания', 'Push-ups', 'Sklekovi'], steps: [
      { ex: 'pushup_wall', goal: 20 }, { ex: 'pushup_incline', goal: 15 }, { ex: 'pushup_knee', goal: 15 },
      { ex: 'pushup', goal: 12 }, { ex: 'pushup_close', goal: 10 }, { ex: 'pushup_clap', goal: 8 },
      { ex: 'pushup_archer', goal: 6 }, { ex: 'pushup_one_arm', goal: 3 },
    ],
  },
  {
    id: 'squat', name: ['Приседания', 'Squats', 'Čučnjevi'], steps: [
      { ex: 'squat', goal: 25 }, { ex: 'pause_squat', goal: 15 }, { ex: 'split_squat', goal: 12 },
      { ex: 'bulgarian_split_squat', goal: 10 }, { ex: 'pistol_assisted', goal: 6 }, { ex: 'pistol', goal: 5 },
    ],
  },
  {
    id: 'core', name: ['Кор', 'Core', 'Trup'], steps: [
      { ex: 'plank', goal: 60 }, { ex: 'side_plank', goal: 45 }, { ex: 'hollow_hold', goal: 40 },
      { ex: 'leg_raise', goal: 12 }, { ex: 'hanging_leg_raise', goal: 10 },
    ],
  },
  {
    id: 'pull', name: ['Спина', 'Back', 'Leđa'], steps: [
      { ex: 'superman', goal: 15 }, { ex: 'reverse_snow_angel', goal: 12 }, { ex: 'backpack_row', goal: 15 },
      { ex: 'table_row', goal: 12 }, { ex: 'negative_pullup', goal: 5 }, { ex: 'pullup', goal: 8 },
    ],
  },
]

export const BRANCH_OF: Record<string, { branch: BranchId; index: number }> = {}
for (const b of BRANCHES) b.steps.forEach((s, i) => { BRANCH_OF[s.ex] = { branch: b.id, index: i } })

export function levelsFromTest(t: { pushups: number; squats: number; plank: number }): Record<BranchId, number> {
  const p = t.pushups
  const push = p <= 0 ? 0 : p <= 3 ? 1 : p <= 7 ? 2 : p <= 19 ? 3 : p <= 29 ? 4 : 5
  const s = t.squats
  const squat = s < 30 ? 0 : s < 50 ? 1 : 2
  const k = t.plank
  const core = k < 90 ? 0 : k < 120 ? 1 : 2
  return { push, squat, core, pull: 0 }
}

export interface EquipInfo { id: Equip; name: L3; home: boolean }
export const EQUIPMENT: EquipInfo[] = [
  { id: 'dumbbell', name: ['Гантели', 'Dumbbells', 'Bučice'], home: false },
  { id: 'barbell', name: ['Штанга', 'Barbell', 'Šipka'], home: false },
  { id: 'rack', name: ['Стойки для приседа', 'Squat rack', 'Stalak za čučanj'], home: false },
  { id: 'bench', name: ['Скамья', 'Bench', 'Klupa'], home: false },
  { id: 'kettlebell', name: ['Гиря', 'Kettlebell', 'Kettlebell'], home: false },
  { id: 'pullup_bar', name: ['Турник', 'Pull-up bar', 'Vratilo'], home: false },
  { id: 'dip_bars', name: ['Брусья', 'Dip bars', 'Razboj'], home: false },
  { id: 'band', name: ['Резинки', 'Resistance bands', 'Elastične gume'], home: false },
  { id: 'cable', name: ['Блочные тренажёры', 'Cable machine', 'Sajle'], home: false },
  { id: 'machine', name: ['Тренажёры', 'Machines', 'Mašine'], home: false },
  { id: 'chair', name: ['Стул', 'Chair', 'Stolica'], home: true },
  { id: 'sofa', name: ['Диван', 'Sofa', 'Sofa'], home: true },
  { id: 'table', name: ['Устойчивый стол', 'Sturdy table', 'Stabilan sto'], home: true },
  { id: 'backpack', name: ['Рюкзак с книгами', 'Backpack with books', 'Ranac sa knjigama'], home: true },
  { id: 'bottles', name: ['Бутылки с водой', 'Water bottles', 'Flaše sa vodom'], home: true },
  { id: 'towel', name: ['Полотенце', 'Towel', 'Peškir'], home: true },
]

export type PlaceKind = 'gym' | 'home' | 'street' | 'travel' | 'custom'
export const PLACE_DEFAULTS: Record<PlaceKind, { name: L3; equip: Equip[] }> = {
  gym: {
    name: ['Зал', 'Gym', 'Teretana'],
    equip: ['dumbbell', 'barbell', 'rack', 'bench', 'kettlebell', 'pullup_bar', 'dip_bars', 'band', 'cable', 'machine'],
  },
  home: { name: ['Дом', 'Home', 'Kuća'], equip: [] },
  street: { name: ['Улица', 'Outdoors', 'Napolju'], equip: ['pullup_bar', 'dip_bars'] },
  travel: { name: ['В поездке', 'Travel', 'Na putu'], equip: [] },
  custom: { name: ['Своё место', 'Custom place', 'Svoje mesto'], equip: [] },
}

// Что откроет покупка недорогого инвентаря
export const UPGRADES: { equip: Equip; unlocks: L3 }[] = [
  { equip: 'band', unlocks: ['Тяги и жимы с резинкой, сгибания на бицепс', 'Band rows, presses and curls', 'Veslanje, potisci i pregibi gumom'] },
  { equip: 'pullup_bar', unlocks: ['Подтягивания, подъёмы ног в висе, ветка «Спина» до конца', 'Pull-ups, hanging leg raises, the full Back branch', 'Zgibovi, podizanje nogu u visu, cela grana „Leđa“'] },
  { equip: 'dumbbell', unlocks: ['Жимы, тяги, выпады и румынская тяга с весом', 'Weighted presses, rows, lunges and RDLs', 'Potisci, veslanja, iskoraci i rumunsko dizanje sa tegom'] },
]
