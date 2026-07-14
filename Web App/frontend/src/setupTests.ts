// Extends Vitest's expect with jest-dom matchers (e.g. toBeInTheDocument, toHaveValue)
import '@testing-library/jest-dom';

// jsdom does not implement window.matchMedia — mock it so hooks that use it don't throw
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});
