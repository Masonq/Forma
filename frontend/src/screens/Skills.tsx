import { useState } from 'react'
import { EX_BY_ID } from '../data/exercises'
import { BRANCHES, EQUIPMENT, PASSES_TO_UNLOCK, UPGRADES, type BranchId } from '../data/skills'
import { Icon } from '../components/Icon'
import { goBack, navigate } from '../components/ui'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { availableAt } from '../lib/training'

export default function Skills() {
  const { t, l } = useT()
  const s = useStore()
  const [branch, setBranch] = useState<BranchId>('push')
  const b = BRANCHES.find((x) => x.id === branch)!
  const lvl = s.profile.skill[branch] ?? 0
  const passes = s.profile.skillPasses[branch] ?? 0
  const owned = new Set(s.places.flatMap((p) => p.equip))
  const doable = (exId: string) => s.places.some((p) => availableAt(EX_BY_ID[exId], { ...p, quiet: false, small: false }))

  return (
    <div className="page narrow">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/profile')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{t('sk_title')}</div>
        <span style={{ width: 44 }} />
      </div>
      <div className="chips" style={{ marginTop: 4 }}>
        {BRANCHES.map((x) => (
          <button key={x.id} className={`chip ${x.id === branch ? 'on' : ''}`} onClick={() => setBranch(x.id)}>
            {l(x.name)}<span className="num" style={{ opacity: 0.7 }}>{(s.profile.skill[x.id] ?? 0) + 1}/{x.steps.length}</span>
          </button>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 14 }}>{t('sk_rule')}</p>

      <div className="card branch" style={{ marginTop: 14, padding: '22px 18px' }}>
        {b.steps.map((st, i) => {
          const ex = EX_BY_ID[st.ex]
          const state = i < lvl ? 'passed' : i === lvl ? 'current' : 'locked'
          const missing = ex.equip.filter((g) => !g.some((e) => owned.has(e))).map((g) => l(EQUIPMENT.find((x) => x.id === g[0])!.name))
          return (
            <button key={st.ex} className={`node ${state}`} style={{ textAlign: 'left', width: '100%' }} onClick={() => navigate(`/exercise/${st.ex}`)}>
              <div className="orb num">{state === 'passed' ? <Icon name="check" size={22} stroke={2.6} /> : state === 'locked' ? i + 1 : i + 1}</div>
              <div style={{ padding: '10px 0' }}>
                <div className="nm" style={{ fontWeight: 600 }}>{l(ex.name)}</div>
                <div className="small muted">
                  {state === 'passed' ? t('sk_done') : (ex.mode === 't' ? t('sk_goal_t', { n: st.goal }) : t('sk_goal', { n: st.goal }))}
                  {state === 'locked' && `, ${t('sk_locked').toLowerCase()}`}
                </div>
                {missing.length > 0 && !doable(st.ex) && <div className="small" style={{ color: 'var(--accent)', marginTop: 2 }}>{t('sk_needs', { equip: missing.join(', ') })}</div>}
                {state === 'current' && (
                  <>
                    <div className="pbar" style={{ width: 160 }}><i style={{ width: `${(passes / PASSES_TO_UNLOCK) * 100}%` }} /></div>
                    <div className="small faint" style={{ marginTop: 4 }}>{t('sk_passes', { a: passes, b: PASSES_TO_UNLOCK })}</div>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="section">
        <div className="section-head"><div className="h3">{t('pf_upgrade')}</div></div>
        <p className="sub" style={{ marginTop: -6, marginBottom: 12 }}>{t('pf_upgrade_d')}</p>
        <div className="list">
          {UPGRADES.map((u) => {
            const has = owned.has(u.equip)
            return (
              <div className="li" key={u.equip}>
                <div className="li-ic" style={{ color: has ? 'var(--green)' : 'var(--accent)' }}><Icon name={has ? 'check' : 'plus'} size={20} /></div>
                <div className="li-main"><div className="li-title">{l(EQUIPMENT.find((e) => e.id === u.equip)!.name)}</div><div className="li-sub">{l(u.unlocks)}</div></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
