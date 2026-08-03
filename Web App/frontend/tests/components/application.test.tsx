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

    it('shows a generic fallback, does not expose error details, and retries', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        let shouldThrow = true;
        function UnstableChild() {
            if (shouldThrow) throw new Error('sensitive render details');
            return <span>recovered child</span>;
        }

        render(<ErrorBoundary><UnstableChild /></ErrorBoundary>);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('An unexpected rendering error occurred.')).toBeInTheDocument();
        expect(screen.queryByText('sensitive render details')).not.toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalled();
        expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain('sensitive render details');

        shouldThrow = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(screen.getByText('recovered child')).toBeInTheDocument();
    });

    it('normalizes every thrown value to state without retaining its contents', () => {
        expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
        const boundary = new ErrorBoundary({ children: null });
        boundary.state = { hasError: true };
        render(boundary.render());
        expect(screen.getByText('An unexpected rendering error occurred.')).toBeInTheDocument();
    });
});
