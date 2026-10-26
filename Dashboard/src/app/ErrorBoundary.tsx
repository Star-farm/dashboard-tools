import { Component } from 'react'
import type { PropsWithChildren } from 'react'
import { useLanguage } from '../i18n/useLanguage'

function ErrorFallback() {
  const { t } = useLanguage('notFound')
  return (
    <main className="error-state" role="alert">
      <p className="eyebrow">STAR FARM</p>
      <h1>{t.errorTitle}</h1>
      <p>{t.errorDescription}</p>
      <button className="primary-button" onClick={() => window.location.reload()}>{t.reload}</button>
    </main>
  )
}

export class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
