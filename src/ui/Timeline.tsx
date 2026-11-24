import { useEffect } from 'react'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { JourneyLayout, Step } from '../scene/journeyLayout'

export function stepName(t: ReturnType<typeof useT>['t'], s: Step, L: number) {
  return s.kind === 'block' ? t.stepName.block(s.layer! + 1, L) : t.stepName[s.kind]
}

/** Frise de lecture : une case par étape (les blocs sont plus fins), lecture/pause, pas à pas, vitesse, caméra. */
export function Timeline({ lay }: { lay: JourneyLayout }) {
  const { t } = useT()
  const { progress, playing, setPlaying, speed, setSpeed, seek, cam, setCam } = useStore()
  const N = lay.steps.length
  const cur = Math.min(N - 1, Math.floor(progress))
  const atEnd = progress >= N - 0.01

  const go = (i: number) => { seek(Math.max(0, Math.min(N - 1, i))); setPlaying(false); setCam('follow') }
  const toggle = () => {
    if (atEnd) seek(0)
    setPlaying(!playing || atEnd)
    setCam('follow')
  }

  // Raccourcis clavier : espace = lecture/pause, flèches = étape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); toggle() }
      if (e.code === 'ArrowRight') go(cur + 1)
      if (e.code === 'ArrowLeft') go(cur - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="timeline">
      <div className="tl-controls">
        <button className="btn icon" onClick={() => go(cur - 1)} title={t.prev} aria-label={t.prev}>‹</button>
        <button className="btn play" onClick={toggle} aria-label={playing ? t.pause : t.play}>
          {playing ? '❚❚ ' + t.pause : atEnd ? '↺ ' + t.restart : '▶ ' + t.play}
        </button>
        <button className="btn icon" onClick={() => go(cur + 1)} title={t.next} aria-label={t.next}>›</button>
        <span className="tl-name">{stepName(t, lay.steps[cur], lay.L)}</span>
        <span className="tl-spacer" />
        <label className="tl-speed">{t.speed}
          <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
            {[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <button className={`btn ${cam === 'follow' ? 'on' : ''}`} onClick={() => setCam('follow')}>{t.follow}</button>
        <button className={`btn ${cam === 'overview' ? 'on' : ''}`} onClick={() => { setCam('overview') }}>{t.overview}</button>
      </div>
      <div className="tl-track">
        {lay.steps.map((s, i) => {
          const fill = i < cur ? 1 : i === cur ? progress - i : 0
          return (
            <button key={i} className={`tl-seg k-${s.kind} ${i === cur ? 'cur' : ''}`} style={{ flexGrow: s.kind === 'block' ? 1 : 2.4 }}
              onClick={() => go(i)} title={stepName(t, s, lay.L)} aria-label={stepName(t, s, lay.L)}>
              <span style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
