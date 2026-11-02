import { useLayoutEffect, useRef, useState } from 'react'
import { Icon, Logo, PLACE_ICON } from './Icon'
import { navigate } from './ui'
import { useT } from '../lib/i18n'
import { activeWorkout, useStore } from '../lib/store'

const PLACE_DOT: Record<string, string> = { gym: 'var(--red)', home: 'var(--accent)', street: 'var(--blue)', travel: 'var(--green)', custom: 'var(--muted)' }
const KEY = 'forma.sidebar.collapsed'

type Item = { path: string; key: string; icon: string; badge?: number }

export function Sidebar({ path }: { path: string }) {
  const { t } = useT()
  const s = useStore()
  const live = !!activeWorkout(s)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const [placesOpen, setPlacesOpen] = useState(true)
  const navRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState<{ top: number; h: number } | null>(null)

  const weekAgo = Date.now() - 7 * 86400000
  const newRecords = s.workouts.filter((w) => w.status === 'done' && w.startedAt >= weekAgo).reduce((a, w) => a + (w.summary?.records.length ?? 0), 0)

  const groups: { title: string; items: Item[] }[] = [
    { title: t('side_training'), items: [
      { path: '/', key: 'tab_today', icon: 'today' },
      { path: '/program', key: 'tab_program', icon: 'program' },
      { path: '/library', key: 'nav_library', icon: 'book' },
    ] },
    { title: t('side_growth'), items: [
      { path: '/progress', key: 'tab_progress', icon: 'progress', badge: newRecords || undefined },
      { path: '/skills', key: 'pf_skills', icon: 'layers' },
      { path: '/body', key: 'nav_body', icon: 'body' },
    ] },
  ]
  const isOn = (p: string) => (p === '/' ? path === '/' : path.startsWith(p))
  const activeKey = groups.flatMap((g) => g.items).find((i) => isOn(i.path))?.path ?? (path.startsWith('/profile') || path.startsWith('/place') ? '/profile' : '')

  // Стеклянная плашка переезжает к активному пункту
  useLayoutEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-p="${activeKey}"]`)
    setInd(el ? { top: el.offsetTop, h: el.offsetHeight } : null)
  }, [activeKey, collapsed, placesOpen, s.places.length])

  const toggle = () => { const v = !collapsed; setCollapsed(v); try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* приватный режим */ } }
  const theme = s.profile.theme ?? 'dark'
  const curPlace = s.profile.defaultPlace

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sb-head">
        <div className="logo"><Logo /></div>
        <button className="sb-toggle" onClick={toggle} aria-label={t(collapsed ? 'side_expand' : 'side_collapse')} title={t(collapsed ? 'side_expand' : 'side_collapse')}>
          <Icon name="chevR" size={16} style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }} />
        </button>
      </div>
      <button className="sb-search" onClick={() => navigate('/library')} data-tip={t('lib_search')}>
        <Icon name="search" size={18} /><span className="sb-l">{t('lib_search')}</span>
      </button>

      <div className="sb-nav" ref={navRef}>
        {ind && <span className="sb-ind" style={{ transform: `translateY(${ind.top}px)`, height: ind.h }} aria-hidden="true" />}
        {groups.map((g) => (
          <div key={g.title} className="sb-group">
            <div className="sb-title">{g.title}</div>
            {g.items.map((it) => (
              <button key={it.path} data-p={it.path} data-tip={t(it.key)} className={`side-item ${isOn(it.path) ? 'on' : ''}`} onClick={() => navigate(it.path)} aria-current={isOn(it.path) ? 'page' : undefined}>
                <Icon name={it.icon} size={20} /><span className="sb-l">{t(it.key)}</span>
                {it.badge ? <span className="sb-badge num">{it.badge}</span> : null}
              </button>
            ))}
          </div>
        ))}
        <div className="sb-group">
          <div className="sb-title">{t('side_places')}</div>
          <button className="side-item" data-tip={t('pf_places')} onClick={() => (collapsed ? navigate('/places') : setPlacesOpen(!placesOpen))} aria-expanded={placesOpen}>
            <Icon name="pin" size={20} /><span className="sb-l">{t('pf_places')}</span>
            <Icon name="chevD" size={16} className="sb-chev" style={{ transform: placesOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {placesOpen && !collapsed && (
            <div className="sb-sub">
              {s.places.map((p) => (
                <button key={p.id} className={`sb-subitem ${p.id === curPlace ? 'on' : ''}`} onClick={() => { s.setProfile({ defaultPlace: p.id }); s.showToast(t('side_place_set', { place: p.name })) }}>
                  <i style={{ background: PLACE_DOT[p.kind] }} /><span className="ellipsis">{p.name}</span>
                  <Icon name={PLACE_ICON[p.kind]} size={14} className="faint" />
                </button>
              ))}
            </div>
          )}
          <button data-p="/profile" data-tip={t('tab_profile')} className={`side-item ${activeKey === '/profile' ? 'on' : ''}`} onClick={() => navigate('/profile')}>
            <Icon name="profile" size={20} /><span className="sb-l">{t('tab_profile')}</span>
          </button>
        </div>
      </div>

      <div className="sb-foot">
        <button className="btn primary sb-start" data-tip={t(live ? 'today_continue' : 'today_start')} onClick={() => navigate(live ? '/workout' : '/?start=1')}>
          <Icon name="play" size={18} fill stroke={0} /><span className="sb-l">{t(live ? 'side_continue' : 'side_start')}</span>
        </button>
        <div className="side-item sb-theme" data-tip={t('side_night')} onClick={() => { if (collapsed) s.setProfile({ theme: theme === 'light' ? 'dark' : 'light' }) }}>
          <Icon name="moon" size={20} /><span className="sb-l">{t('side_night')}</span>
          <button role="switch" aria-checked={theme !== 'light'} aria-label={t('side_night')} className={`toggle sm ${theme !== 'light' ? 'on' : ''}`} onClick={() => s.setProfile({ theme: theme === 'light' ? 'dark' : 'light' })} />
        </div>
        <button className="sb-user" onClick={() => navigate('/profile')} data-tip={s.profile.name || t('pf_add_name')}>
          <span className="sb-ava">{s.profile.name ? s.profile.name.trim().slice(0, 1).toUpperCase() : <Icon name="profile" size={18} />}</span>
          <span className="sb-l sb-user-t"><b className="ellipsis">{s.profile.name || t('pf_add_name')}</b><small className="ellipsis">{t('goal_' + s.profile.goal)}</small></span>
        </button>
      </div>
    </aside>
  )
}
