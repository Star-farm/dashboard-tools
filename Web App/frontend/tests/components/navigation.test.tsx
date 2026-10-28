import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '../../src/features/dashboard/DashboardHeader';
import { BackToTop } from '../../src/features/dashboard/BackToTop';
import { TRANSLATIONS } from '../../src/i18n';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('STAR-FARM navigation', () => {
    it('shows only the brand and language switcher without a navigation menu', () => {
        const changeLanguage = vi.fn();
        render(<DashboardHeader t={TRANSLATIONS.vi} language="vi" onLanguageChange={changeLanguage} />);
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.getByRole('link')).toHaveTextContent('STAR-FARM');
        expect(screen.getAllByRole('button')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'English' }));
        expect(changeLanguage).toHaveBeenCalledWith('en');
    });

    it('hides the header on downward scroll and shows it again on upward scroll', () => {
        vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
        const { container } = render(<DashboardHeader t={TRANSLATIONS.en} language="en" onLanguageChange={vi.fn()} />);
        const scroll = vi.spyOn(window, 'scrollY', 'get');
        scroll.mockReturnValue(180);
        fireEvent.scroll(window);
        expect(container.querySelector('header')).toHaveClass('header-hidden');
        scroll.mockReturnValue(100);
        fireEvent.scroll(window);
        expect(container.querySelector('header')).not.toHaveClass('header-hidden');
    });

    it('only exposes back to top after scrolling and preserves the current anchor', () => {
        const scroll = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        render(<><main id="main-content" tabIndex={-1} /><BackToTop language="en" /></>);
        expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
        scroll.mockReturnValue(240);
        fireEvent.scroll(window);
        const hash = window.location.hash;
        fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
        expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        expect(screen.getByRole('main')).toHaveFocus();
        expect(window.location.hash).toBe(hash);
        scroll.mockReturnValue(0);
        fireEvent.scroll(window);
        expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
    });
});
