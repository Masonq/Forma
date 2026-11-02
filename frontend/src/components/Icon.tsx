// Собственный набор иконок Forma: сетка 24, линия 1.8, скруглённые концы.
const P: Record<string, string> = {
  today: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  program: 'M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4M8 14h3M8 17h6',
  progress: 'M4 20h16M7 16.5v-5M12 16.5V8M17 16.5V5',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5',
  play: 'M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z',
  back: 'M15 5l-7 7 7 7',
  chevR: 'M9.5 6l6 6-6 6',
  chevD: 'M6 9.5l6 6 6-6',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  pause: 'M9 6v12M15 6v12',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M10 2.5h4',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  link: 'M9.5 14.5l5-5M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  barbell: 'M3 12h18M6 8v8M3.5 9.5v5M18 8v8M20.5 9.5v5',
  dumbbell: 'M7 12h10M5 8.5v7M8 7v10M16 7v10M19 8.5v7',
  house: 'M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5',
  tree: 'M12 3l5.5 8h-3l4 5.5h-13l4-5.5h-3zM12 16.5V21',
  suitcase: 'M5 8h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8M9 12v3M15 12v3',
  pin: 'M12 21s6.5-5.7 6.5-11.2A6.5 6.5 0 0 0 5.5 9.8C5.5 15.3 12 21 12 21zM12 12.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4.5 4.5',
  flame: 'M12 21c3.6 0 6-2.5 6-6 0-3.6-2.6-5.6-3.6-8.6-.3 2-1.3 3.3-2.7 4C11.6 7.6 10.2 5 8 3.5c.3 3-2 5.3-2 9.5 0 4.8 2.7 8 6 8z',
  trophy: 'M8 4.5h8v5a4 4 0 0 1-8 0zM8 6.5H5.5a2.5 2.5 0 0 0 2.6 3.5M16 6.5h2.5a2.5 2.5 0 0 1-2.6 3.5M12 13.5V17M8.5 20h7M10 17h4v3h-4z',
  arrowUp: 'M12 19V6M6.5 11.5 12 6l5.5 5.5',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5',
  camera: 'M4.5 8h3l1.5-2.5h6L16.5 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14',
  key: 'M14.5 14a5 5 0 1 0-4.6-3L3.5 17.5V20.5h3v-2h2v-2h2l1.2-1.2a5 5 0 0 0 2.8-1.3zM16 8.5h.01',
  bell: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15zM10 20.5h4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 12h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  ruler: 'M4 15.5 15.5 4l4.5 4.5L8.5 20zM8 11.5l2 2M11 8.5l2 2M14 5.5l2 2',
  sound: 'M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  tree2: 'M12 20V12M12 12l-5-5M12 12l5-5M7 7V4M17 7V4M12 12v-2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5h.01',
  wifiOff: 'M3 3l18 18M8.5 12.5a6 6 0 0 1 3.5-1.5M5 9a11 11 0 0 1 4-2.4M19 9a11 11 0 0 0-5.5-2.9M12 18.5h.01M15.5 13a5.5 5.5 0 0 1 1.3 1.2',
  goal: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01',
  level: 'M4 19.5h4v-5H4zM10 19.5h4V10h-4zM16 19.5h4V5h-4z',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.4 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  bolt: 'M13 3 5.5 13.5H11L10 21l7.5-10.5H12z',
  leaf: 'M5 19c0-8 5-13 14-14-.5 9-5.5 14-13 14zM5 19l7-7',
  muscle: 'M5 16c2-6 4.5-9 8-10.5.8 1.6.2 3-1.5 3.5L13 12c2.5-1.3 5-.7 6 1.5.6 3-1.8 5.5-6 5.5-3 0-5.8-1-8-3z',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z',
  feather: 'M19 5c-6 0-11 4-12 11l-2 3M7 16h6.5c3-2 5-6 5.5-11M9.5 12.5h6',
  grid: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
  book: 'M5 4.5h5.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H5zM19 4.5h-3.5A2.5 2.5 0 0 0 13 7M19 4.5V18h-4a2 2 0 0 0-2 2',
  body: 'M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 9.5h12M9 9.5l.5 5-1.5 6.5M15 9.5l-.5 5 1.5 6.5M9.5 14.5h5',
  plate: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  edit: 'M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5',
  copy: 'M8.5 8.5h10v11h-10zM15.5 8.5v-3h-10v11h3',
  layers: 'M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
}

export type IconName = keyof typeof P

export function Icon({ name, size = 22, stroke = 1.8, fill = false, className }: { name: string; size?: number; stroke?: number; fill?: boolean; className?: string }) {
  const d = P[name] ?? P.info
  const dotted = name === 'more'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={dotted ? 3 : stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="logo" aria-label="Forma">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9 4h18l-2.6 6H11.3L10 13h11l-2.6 6H8.7L6.4 28H0.5L6 9.5z" fill="var(--accent)" />
      </svg>
      <b>FORMA</b>
    </span>
  )
}

export const PLACE_ICON: Record<string, string> = { gym: 'barbell', home: 'house', street: 'tree', travel: 'suitcase', custom: 'pin' }
