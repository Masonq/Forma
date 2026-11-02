// Картинки, которые уже лежат в /public/media. Пока набор пуст — экраны показывают аккуратные заглушки.
export const MEDIA = new Set<string>([])

export const exPhoto = (id: string) => (MEDIA.has(`ex-${id}`) ? `/media/ex-${id}.webp` : null)
export const placePhoto = (kind: string) => (MEDIA.has(`place-${kind}`) ? `/media/place-${kind}.webp` : null)
export const hasAnatomy = () => MEDIA.has('anatomy')
