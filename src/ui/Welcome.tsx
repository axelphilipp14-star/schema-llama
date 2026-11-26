// Bandeau d'accueil (démo du 29/11) : ce qu'on regarde et quoi faire, en 2 lignes. Fermé une fois, il ne revient plus.
import { useState } from 'react'
import { useT } from '../i18n'
import { useStore } from '../store'

const KEY = 'welcome-closed'
const wasClosed = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

export function Welcome() {
  const { t } = useT()
  const phase = useStore((s) => s.phase)
  const [open, setOpen] = useState(() => !wasClosed())
  if (!open) return null
  const close = () => { try { localStorage.setItem(KEY, '1') } catch { /* stockage indisponible : fermé pour cette visite */ } setOpen(false) }
  return (
    <div className="welcome" role="note">
      <div>
        <p className="w-what">{t.welcome.what}</p>
        <p className="w-how">{phase === 'make' ? t.welcome.howMake : t.welcome.how}</p>
      </div>
      <button className="w-close" onClick={close} aria-label={t.welcome.close} title={t.welcome.close}>×</button>
    </div>
  )
}
