import type { Language } from '../i18n'
import { translations } from '../i18n'

export default function NotFoundPage({ language }: { language: Language }) {
  const t = translations[language]
  return <section className="not-found-page page-shell" aria-labelledby="not-found-title">
    <h1 id="not-found-title">404</h1>
    <p>{t.notFoundDescription}</p>
    <a className="primary-button" href="#home">{t.returnHome}</a>
  </section>
}
