import { useSyncExternalStore } from 'react';
import type { Language } from '../../utils/language';

function subscribe(callback: () => void) {
    window.addEventListener('scroll', callback, { passive: true });
    return () => window.removeEventListener('scroll', callback);
}
const isBelowTop = () => window.scrollY > 24;

export function BackToTop({ language }: { language: Language }) {
    const visible = useSyncExternalStore(subscribe, isBelowTop, () => false);
    return <button type="button" className={`back-to-top${visible ? ' is-visible' : ''}`} aria-label={language === 'vi' ? 'Về đầu trang' : 'Back to top'} aria-hidden={!visible || undefined} tabIndex={visible ? 0 : -1} disabled={!visible} onClick={() => {
        document.getElementById('main-content')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }}><span aria-hidden="true">{'>'}</span></button>;
}
