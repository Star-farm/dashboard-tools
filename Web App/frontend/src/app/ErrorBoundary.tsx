import React, { Component } from 'react';
import { TRANSLATIONS } from '../i18n';

interface ErrorBoundaryState { hasError: boolean; }

export class ErrorBoundary extends Component<React.PropsWithChildren, ErrorBoundaryState> {
    constructor(props: React.PropsWithChildren) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }
    componentDidCatch() {
        console.error('[ErrorBoundary] A render error was caught.');
    }
    render() {
        if (this.state.hasError) {
            const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : '';
            const t = TRANSLATIONS[browserLanguage.toLowerCase().startsWith('vi') ? 'vi' : 'en'];
            return (
                <div className="error-boundary-container" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                    <h2>{t.errorTitle}</h2>
                    <p>{t.errorDefaultMessage}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#000' }}
                    >
                        {t.errorRetry}
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
