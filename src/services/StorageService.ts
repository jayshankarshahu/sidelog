import type { NoteIndex, NoteObject } from '../types';
import { saveStateManager } from '../state';

const INDEX_KEY = 'date-noteId-index';

/**
 * StorageService — thin wrapper around chrome.storage.local.
 * Keeps an in-memory cache of the note index for fast lookups.
 * This entire module can be swapped for any other storage backend.
 */

let cachedIndex: NoteIndex | null = null;

function getStorage(): typeof chrome.storage.local | null {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return chrome.storage.local;
    }
    return null;
}

async function storageGet(key: string): Promise<Record<string, unknown>> {
    const storage = getStorage();
    if (!storage) throw new Error('Chrome storage not available');
    return new Promise((resolve) => storage.get([key], (result) => resolve(result as Record<string, unknown>)));
}

async function storageSet(items: Record<string, unknown>): Promise<void> {
    saveStateManager.setState('saving');
    try {
        const storage = getStorage();
        if (!storage) throw new Error('Chrome storage not available');
        // MV3's promise-form set() rejects on failure (e.g. quota / disk full);
        // lastError is checked too for older callback-style implementations.
        await storage.set(items);
        if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
        }
        saveStateManager.setState('saved');
    } catch (err) {
        saveStateManager.setState('error');
        throw err;
    }
}

// ─── Index operations ───

export async function getIndex(): Promise<NoteIndex> {
    if (cachedIndex) return cachedIndex;

    const result = await storageGet(INDEX_KEY);
    const index = (result[INDEX_KEY] as NoteIndex) || [];
    cachedIndex = index;
    return index;
}

export async function setIndex(index: NoteIndex): Promise<void> {
    cachedIndex = index;
    await storageSet({ [INDEX_KEY]: index });
}

// ─── Note operations ───

export async function getNote(noteId: string): Promise<NoteObject | null> {
    const result = await storageGet(noteId);
    return (result[noteId] as NoteObject) || null;
}

export async function setNote(noteId: string, note: NoteObject): Promise<void> {
    await storageSet({ [noteId]: note });
}

const LAST_OPENED_DATE_KEY = 'last-opened-date';

export async function getLastOpenedDate(): Promise<string | null> {
    const result = await storageGet(LAST_OPENED_DATE_KEY);
    return (result[LAST_OPENED_DATE_KEY] as string) || null;
}

export async function setLastOpenedDate(date: string): Promise<void> {
    await storageSet({ [LAST_OPENED_DATE_KEY]: date });
}

const HASHTAGS_MIGRATED_KEY = 'hashtags-migrated';

export async function getHashtagsMigrated(): Promise<boolean> {
    const result = await storageGet(HASHTAGS_MIGRATED_KEY);
    return result[HASHTAGS_MIGRATED_KEY] === true;
}

export async function setHashtagsMigrated(): Promise<void> {
    await storageSet({ [HASHTAGS_MIGRATED_KEY]: true });
}

// ─── Cache management ───

export function invalidateCache(): void {
    cachedIndex = null;
}
