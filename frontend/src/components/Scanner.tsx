import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'

// Сканер штрихкодов на камере (ZXing подгружается лениво).
export function BarcodeScanner({ onCode, onError }: { onCode: (code: string) => void; onError: () => void }) {
  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'init' | 'on' | 'fail'>('init')
  const done = useRef(false)

  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (res) => {
          if (res && !done.current) {
            const text = res.getText()
            if (/^\d{8,14}$/.test(text)) {
              done.current = true
              if (navigator.vibrate) navigator.vibrate(60)
              onCode(text)
            }
          }
        })
        stop = () => controls.stop()
        if (!cancelled) setStatus('on')
      } catch {
        if (!cancelled) { setStatus('fail'); onError() }
      }
    })()
    return () => { cancelled = true; stop?.() }
  }, [onCode, onError])

  return (
    <div className="scanner">
      <video ref={videoRef} muted playsInline />
      <div className="scan-frame" aria-hidden="true" />
      <div className="small muted scan-hint">{status === 'fail' ? t('nu_scan_fail') : t('nu_scan_hint')}</div>
    </div>
  )
}
