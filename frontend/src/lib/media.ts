// Картинки в /public/media. Для упражнений без фото экраны показывают иконку.
export const MEDIA = new Set<string>([
  'anatomy', 'ex-back_squat', 'ex-backpack_curl', 'ex-backpack_row', 'ex-backpack_squat',
  'ex-band_curl', 'ex-band_press', 'ex-band_pulldown', 'ex-band_row', 'ex-barbell_curl',
  'ex-barbell_row', 'ex-bench_dips', 'ex-bench_press', 'ex-bottle_lateral_raise',
  'ex-bulgarian_split_squat', 'ex-burpee', 'ex-cable_fly', 'ex-cable_row', 'ex-calf_raise',
  'ex-chinup', 'ex-db_bench', 'ex-db_curl', 'ex-db_floor_press', 'ex-db_fly', 'ex-db_lunge',
  'ex-db_rdl', 'ex-db_row', 'ex-db_shoulder_press', 'ex-dead_bug', 'ex-deadlift', 'ex-dips',
  'ex-glute_bridge', 'ex-goblet_squat', 'ex-hanging_leg_raise', 'ex-hip_thrust', 'ex-hollow_hold',
  'ex-jump_squat', 'ex-kb_swing', 'ex-lat_pulldown', 'ex-lateral_raise', 'ex-leg_press',
  'ex-leg_raise', 'ex-machine_chest_press', 'ex-march_in_place', 'ex-mountain_climber',
  'ex-negative_pullup', 'ex-ohp', 'ex-overhead_db_ext', 'ex-pause_squat', 'ex-pike_pushup',
  'ex-pistol', 'ex-pistol_assisted', 'ex-plank', 'ex-pullup', 'ex-pushup', 'ex-pushup_archer',
  'ex-pushup_clap', 'ex-pushup_close', 'ex-pushup_incline', 'ex-pushup_knee', 'ex-pushup_one_arm',
  'ex-pushup_wall', 'ex-rdl', 'ex-reverse_lunge', 'ex-reverse_snow_angel', 'ex-run', 'ex-side_plank',
  'ex-single_calf_raise', 'ex-single_leg_bridge', 'ex-split_squat', 'ex-squat', 'ex-step_up',
  'ex-superman', 'ex-table_row', 'ex-tricep_pushdown', 'place-gym', 'place-home', 'place-street',
  'place-travel', 'plate-1.25', 'plate-10', 'plate-15', 'plate-2.5', 'plate-20', 'plate-25',
  'plate-5', 'welcome',
])

export const exPhoto = (id: string) => (MEDIA.has(`ex-${id}`) ? `/media/ex-${id}.webp` : null)
export const placePhoto = (kind: string) => (MEDIA.has(`place-${kind}`) ? `/media/place-${kind}.webp` : null)
export const hasAnatomy = () => MEDIA.has('anatomy')
