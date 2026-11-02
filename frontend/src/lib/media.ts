// Картинки, которые уже лежат в /public/media. Пока набор пуст — экраны показывают аккуратные заглушки.
export const MEDIA = new Set<string>([
  'welcome', 'anatomy', 'place-gym', 'place-home', 'place-street', 'place-travel',
  'ex-db_row', 'ex-back_squat', 'ex-deadlift', 'ex-plank', 'ex-ohp', 'ex-pushup_incline', 'ex-squat',
  'ex-glute_bridge', 'ex-pushup', 'ex-reverse_lunge', 'ex-bench_dips', 'ex-pushup_wall', 'ex-superman',
])

export const exPhoto = (id: string) => (MEDIA.has(`ex-${id}`) ? `/media/ex-${id}.webp` : null)
export const placePhoto = (kind: string) => (MEDIA.has(`place-${kind}`) ? `/media/place-${kind}.webp` : null)
export const hasAnatomy = () => MEDIA.has('anatomy')
