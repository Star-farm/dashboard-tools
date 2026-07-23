export type Language = 'vi' | 'en';

export const detectBrowserLang = (
    nav = typeof navigator !== 'undefined' ? navigator : null,
): Language => {
    const browserLang = nav?.language ?? '';
    return browserLang.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};
