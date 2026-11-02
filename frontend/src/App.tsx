import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { Sidebar } from './components/Sidebar'
import { WorkoutIsland } from './components/Island'
import { navigate, usePath } from './components/ui'
import { useT } from './lib/i18n'
import { activeWorkout, useStore } from './lib/store'
import { startSync } from './lib/sync'
import Onboarding from './screens/Onboarding'
import Today from './screens/Today'
import WorkoutScreen from './screens/Workout'
import Summary from './screens/Summary'
import Program from './screens/Program'
import Progress from './screens/Progress'
import Library, { ExerciseDetail } from './screens/Library'
import Profile, { PlacesScreen, PlaceEdit } from './screens/Profile'
import Skills from './screens/Skills'
import Body from './screens/Body'

const TABS = [
  { path: '/', key: 'tab_today', icon: 'today' },
  { path: '/program', key: 'tab_program', icon: 'program' },
  { path: '/start', key: 'tab_start', icon: 'play' },
  { path: '/progress', key: 'tab_progress', icon: 'progress' },
  { path: '/profile', key: 'tab_profile', icon: 'profile' },
]

function tabOf(path: string) {
  if (path === '/') return '/'
  const t = TABS.find((x) => x.path !== '/' && path.startsWith(x.path))
  if (t) return t.path
  if (path.startsWith('/library') || path.startsWith('/exercise') || path.startsWith('/body')) return '/progress'
  if (path.startsWith('/places') || path.startsWith('/place') || path.startsWith('/skills')) return '/profile'
  return ''
}

export default function App() {
  const ready = useStore((s) => s.ready)
  const onboarded = useStore((s) => s.profile.onboarded)
  const lang = useStore((s) => s.profile.lang)
  const theme = useStore((s) => s.profile.theme ?? 'dark')
  const live = useStore((s) => !!activeWorkout(s))
  const toast = useStore((s) => s.toast)
  const path = usePath()
  const { t } = useT()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => { useStore.getState().init().then(startSync) }, [])
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const light = theme === 'light' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = light ? 'light' : 'dark'
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f3f3f1' : '#0d0e10')
    }
    apply(); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => { document.documentElement.lang = lang === 'sr' ? 'sr-Latn' : lang }, [lang])
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => { if (path === '/start') navigate(live ? '/workout' : '/?start=1', true) }, [path, live])

  if (!ready) return <div className="app" />
  if (!onboarded) return <Onboarding />

  const isWorkout = path.startsWith('/workout')
  const isSummary = path.startsWith('/summary')
  const showNav = !isWorkout && !isSummary
  const cur = tabOf(path)

  let screen
  if (path === '/' ) screen = <Today />
  else if (path === '/workout') screen = <WorkoutScreen />
  else if (path.startsWith('/summary/')) screen = <Summary id={path.split('/')[2]} />
  else if (path === '/program') screen = <Program />
  else if (path === '/progress') screen = <Progress />
  else if (path === '/library') screen = <Library />
  else if (path.startsWith('/exercise/')) screen = <ExerciseDetail id={decodeURIComponent(path.split('/')[2])} />
  else if (path === '/profile') screen = <Profile />
  else if (path === '/places') screen = <PlacesScreen />
  else if (path.startsWith('/place/')) screen = <PlaceEdit id={path.split('/')[2]} />
  else if (path === '/skills') screen = <Skills />
  else if (path === '/body') screen = <Body />
  else screen = <Today />

  return (
    <div className={`app ${showNav ? "with-nav" : ""} ${showNav && live ? "has-island" : ""}`}>
      {showNav && (
        <Sidebar path={path} />
      )}
      <main>
        {!online && showNav && <div className="page" style={{ paddingBottom: 0, paddingTop: 'calc(var(--sat) + 10px)' }}><div className="banner"><Icon name="wifiOff" size={18} />{t('offline')}</div></div>}
        {screen}
      </main>
      {showNav && (
        <nav className="tabbar" aria-label="main">
          {TABS.findIndex((x) => x.path === cur) >= 0 && cur !== '/start' && <span className="tab-ind" style={{ transform: `translateX(${TABS.findIndex((x) => x.path === cur) * 100}%)` }} />}
          {TABS.map((tb) => tb.path === '/start' ? (
            <button key={tb.path} className="tab-start" aria-label={t(tb.key)} onClick={() => navigate(live ? '/workout' : '/?start=1')}>
              <span className={live ? 'live' : ''}><Icon name="play" size={22} fill stroke={0} /></span>
            </button>
          ) : (
            <button key={tb.path} className={`tab ${cur === tb.path ? 'on' : ''}`} onClick={() => navigate(tb.path)}>
              <Icon name={tb.icon} size={23} fill={false} />
              <span>{t(tb.key)}</span>
            </button>
          ))}
        </nav>
      )}
      {showNav && live && <WorkoutIsland />}
      {toast && <div className={`toast ${toast.tone ?? ''}`} style={isWorkout ? { bottom: 'calc(var(--sab) + 200px)' } : undefined}>{toast.text}</div>}
    </div>
  )
}
