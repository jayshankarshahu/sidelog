/**
 * NavigationService — opens the extension's full-tab pages.
 * Uses chrome.runtime.getURL inside the extension; falls back to a root-relative
 * path under plain `vite dev`.
 */

export type ExtensionPage = 'timeline.html' | 'settings.html';

export function getExtensionPageUrl(page: ExtensionPage, params?: Record<string, string>): string {
    const base = typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL(page)
        : `/${page}`;
    const query = params ? new URLSearchParams(params).toString() : '';
    return query ? `${base}?${query}` : base;
}

export function openExtensionPage(page: ExtensionPage, params?: Record<string, string>): void {
    const url = getExtensionPageUrl(page, params);
    // tabs.create needs no permission and gives the new tab full extension APIs
    // (no opener link to the popup / side panel); window.open is the dev fallback.
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url });
    } else {
        window.open(url, '_blank');
    }
}

/** Open the timeline in a new tab, filtered to one tag (`timeline.html?tag=…`). */
export function openTimelineForTag(tag: string): void {
    openExtensionPage('timeline.html', { tag });
}
