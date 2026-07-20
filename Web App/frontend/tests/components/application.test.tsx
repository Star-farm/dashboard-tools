import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/app/App';
import { API_BASE } from '../../src/config/api';
import { ErrorBoundary } from '../../src/app/ErrorBoundary';
import { TRANSLATIONS } from '../../src/i18n';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('application shell', () => {
    it('exports the same-origin API base and both translations', () => {
        expect(API_BASE).toBe('/api/proxy');
        expect(TRANSLATIONS.en.title).toBe('STAR-FARM Project');
        expect(TRANSLATIONS.vi.title).toBeTruthy();
    });

    it('renders the dashboard through App', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
        render(<App />);
        expect(screen.getByText(/Starting up the system/)).toBeInTheDocument();
    });
});

describe('ErrorBoundary', () => {
    it('renders children while no error exists', () => {
        render(<ErrorBoundary><span>healthy child</span></ErrorBoundary>);
        expect(screen.getByText('healthy child')).toBeInTheDocument();
    });

    it('shows a safe fallback, logs the error, and retries', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let shouldThrow = true;
        function UnstableChild() {
            if (shouldThrow) throw new Error('render failed');
            return <span>recovered child</span>;
        }

        render(<ErrorBoundary><UnstableChild /></ErrorBoundary>);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('render failed')).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalled();

        shouldThrow = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(screen.getByText('recovered child')).toBeInTheDocument();
    });

    it('normalizes non-Error values and provides a default message', () => {
        expect(ErrorBoundary.getDerivedStateFromError('plain failure')).toEqual({
            hasError: true,
            message: 'plain failure',
        });
        const boundary = new ErrorBoundary({ children: null });
        boundary.state = { hasError: true, message: '' };
        render(boundary.render());
        expect(screen.getByText('An unexpected rendering error occurred.')).toBeInTheDocument();
    });
});
