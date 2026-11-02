import { useEffect, useRef } from 'react'

type P = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; c: string; r: number; d: number }

// Частицы слетаются в текст, держатся и (если hold=false) разлетаются.
export function ParticleText({ text, height = 150, hold = false, colors = ['#f5c02e', '#2fa765', '#f3f1ec'], font = "'Unbounded Variable', system-ui, sans-serif", weight = 700 }: {
  text: string; height?: number; hold?: boolean; colors?: string[]; font?: string; weight?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0, alive = true
    const start = async () => {
      try { await (document as any).fonts?.ready } catch { /* шрифт подгрузится позже */ }
      if (!alive) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = cv.clientWidth, H = height
      cv.width = W * dpr; cv.height = H * dpr
      const g = cv.getContext('2d')!
      g.scale(dpr, dpr)
      // разметка текста на скрытом холсте
      const off = document.createElement('canvas'); off.width = W; off.height = H
      const o = off.getContext('2d')!
      let size = H * 0.62
      o.font = `${weight} ${size}px ${font}`
      while (o.measureText(text).width > W * 0.92 && size > 12) { size -= 2; o.font = `${weight} ${size}px ${font}` }
      o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#fff'
      o.fillText(text, W / 2, H / 2)
      const img = o.getImageData(0, 0, W, H).data
      const step = Math.max(2, Math.round(Math.sqrt((W * H) / 9000)))
      const pts: P[] = []
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
        if (img[(y * W + x) * 4 + 3] > 140) {
          const a = Math.random() * Math.PI * 2, rad = Math.max(W, H) * (0.5 + Math.random() * 0.6)
          pts.push({ x: W / 2 + Math.cos(a) * rad, y: H / 2 + Math.sin(a) * rad, tx: x, ty: y, vx: 0, vy: 0, c: colors[(Math.random() * colors.length) | 0], r: 0.6 + Math.random() * 0.9, d: Math.random() * 0.35 })
        }
      }
      if (reduce) { pts.forEach((p) => { p.x = p.tx; p.y = p.ty }) }
      const keep = hold || reduce
      const t0 = performance.now()
      const FORM = 1.4, HOLD = 1.6
      const frame = (now: number) => {
        if (!alive) return
        const t = (now - t0) / 1000
        g.clearRect(0, 0, W, H)
        let visible = 0
        for (const p of pts) {
          if (keep || t < FORM + HOLD) {
            if (t > p.d) {
              // пружина к цели + лёгкое мерцание на месте
              const jx = t > FORM ? Math.sin(now / 300 + p.tx) * 0.25 : 0
              p.vx = (p.vx + (p.tx + jx - p.x) * 0.06) * 0.82
              p.vy = (p.vy + (p.ty - p.y) * 0.06) * 0.82
            }
          } else {
            // разлёт от центра
            const dx = p.x - W / 2, dy = p.y - H / 2, len = Math.hypot(dx, dy) || 1
            p.vx += (dx / len) * 0.35 + (Math.random() - 0.5) * 0.2
            p.vy += (dy / len) * 0.35 + (Math.random() - 0.5) * 0.2 - 0.05
          }
          p.x += p.vx; p.y += p.vy
          const fade = keep || t < FORM + HOLD ? 1 : Math.max(0, 1 - (t - FORM - HOLD) / 1.1)
          if (fade <= 0) continue
          visible++
          g.globalAlpha = fade
          g.fillStyle = p.c
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill()
        }
        g.globalAlpha = 1
        if (visible > 0 && !reduce) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }
    start()
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [text, height, hold])
  return <canvas ref={ref} className="particles" style={{ width: '100%', height }} aria-hidden="true" />
}
