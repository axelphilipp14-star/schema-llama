// M6 — À propos : ce qu'on voit, d'où viennent les nombres, ce qui est vérifié, les limites, les licences.
import { useT } from '../i18n'
import { LangToggle } from './Panels'

export function About() {
  const { t } = useT()
  const a = t.aboutPage
  return (
    <div className="reader">
      <header className="reader-top">
        <a className="btn" href="#/">{t.pages.back}</a>
        <span className="reader-brand">{a.title}</span>
        <LangToggle />
      </header>
      <main className="reader-main about">
        <h1>{a.title}</h1>
        {a.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p, i) => <p key={i}>{p}</p>)}
            {s.ul && <ul>{s.ul.map((li, i) => <li key={i}>{li}</li>)}</ul>}
          </section>
        ))}
        <h2>{a.linksTitle}</h2>
        <ul>
          <li><a href="https://github.com/axelphilipp14-star/schema-llama" target="_blank" rel="noreferrer">{a.code}</a></li>
          <li><a href="https://huggingface.co/meta-llama/Llama-3.2-3B" target="_blank" rel="noreferrer">{a.card}</a></li>
          <li><a href="https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE" target="_blank" rel="noreferrer">{a.license}</a></li>
          <li><a href="https://arxiv.org/abs/2601.04213" target="_blank" rel="noreferrer">{a.animated}</a></li>
          <li><a href="https://bbycroft.net/llm" target="_blank" rel="noreferrer">{a.bbycroft}</a></li>
          <li><a href="#/enquetes">{t.pages.all}</a></li>
        </ul>
        <p className="built-big">{t.builtWith}</p>
      </main>
    </div>
  )
}
