import { v4 as uuidv4 } from 'uuid';
import type { NoteObject, NoteIndex } from '../types';
import * as StorageService from './StorageService';
import { getTodayString } from './DateService';
import { extractHashtags, normalizeTag } from './HashtagService';

/**
 * NoteService — business logic for note CRUD and navigation.
 * Depends on StorageService and DateService, both of which are easily swappable.
 */

/**
 * Returns the sorted index (oldest → newest by date).
 */
export async function getSortedIndex(): Promise<NoteIndex> {
    const index = await StorageService.getIndex();
    return [...index].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Gets today's note, creating one if it doesn't exist.
 * Returns { note, index, sortedIndex } where index is the position in the sorted list.
 */
export async function getOrCreateTodayNote(): Promise<{
    note: NoteObject;
    noteId: string;
    currentIndex: number;
    sortedIndex: NoteIndex;
}> {
    const today = getTodayString();
    let index = await StorageService.getIndex();

    let entry = index.find((e) => e.date === today);

    if (!entry) {
        const noteId = uuidv4();
        const newNote: NoteObject = {
            date: today,
            noteData: '',
            tags: [],
            lastEdited: Date.now(),
        };
        entry = { date: today, noteId };
        index = [...index, entry];
        await StorageService.setIndex(index);
        await StorageService.setNote(noteId, newNote);
    }

    const sorted = [...index].sort((a, b) => a.date.localeCompare(b.date));
    const currentIndex = sorted.findIndex((e) => e.noteId === entry!.noteId);
    const note = await StorageService.getNote(entry.noteId);

    return {
        note: note!,
        noteId: entry.noteId,
        currentIndex,
        sortedIndex: sorted,
    };
}

/**
 * Gets a note for an arbitrary date string (yyyy-mm-dd), creating one if it doesn't exist.
 */
export async function getOrCreateDateNote(date: string): Promise<{
    note: NoteObject;
    noteId: string;
    currentIndex: number;
    sortedIndex: NoteIndex;
}> {
    let index = await StorageService.getIndex();

    let entry = index.find((e) => e.date === date);

    if (!entry) {
        const noteId = uuidv4();
        const newNote: NoteObject = {
            date,
            noteData: '',
            tags: [],
            lastEdited: Date.now(),
        };
        entry = { date, noteId };
        index = [...index, entry];
        await StorageService.setIndex(index); // setIndex already updates cachedIndex
        await StorageService.setNote(noteId, newNote);
    }

    const sorted = [...index].sort((a, b) => a.date.localeCompare(b.date));
    const currentIndex = sorted.findIndex((e) => e.noteId === entry!.noteId);
    const note = await StorageService.getNote(entry.noteId);

    return {
        note: note!,
        noteId: entry.noteId,
        currentIndex,
        sortedIndex: sorted,
    };
}

/**
 * Load a note by its index position in the sorted list.
 */
export async function getNoteAtIndex(position: number): Promise<{
    note: NoteObject;
    noteId: string;
} | null> {
    const sorted = await getSortedIndex();
    if (position < 0 || position >= sorted.length) return null;

    const entry = sorted[position];
    const note = await StorageService.getNote(entry.noteId);
    if (!note) return null;

    return { note, noteId: entry.noteId };
}

/**
 * Save markdown content for a note. Tags are always re-derived from the
 * markdown's #hashtags. Returns the stored note (null if it doesn't exist).
 */
export async function saveNoteContent(noteId: string, markdown: string): Promise<NoteObject | null> {
    const note = await StorageService.getNote(noteId);
    if (!note) return null;

    const updated: NoteObject = {
        ...note,
        noteData: markdown,
        tags: extractHashtags(markdown),
        lastEdited: Date.now(),
    };
    await StorageService.setNote(noteId, updated);
    return updated;
}

/**
 * One-time upgrade from manually-added tags to inline #hashtags.
 * For each note whose legacy `tags` aren't all present as #hashtags in its text,
 * appends a trailing line with the missing ones (`\n\n#a #b`), then stores the
 * derived tags. `lastEdited` is left untouched. Guarded by the `hashtags-migrated`
 * flag; safe to call from several pages (idempotent).
 */
export async function migrateManualTagsToHashtags(): Promise<void> {
    if (await StorageService.getHashtagsMigrated()) return;

    const index = await StorageService.getIndex();
    for (const entry of index) {
        const note = await StorageService.getNote(entry.noteId);
        if (!note) continue;

        const present = new Set(extractHashtags(note.noteData));
        const missing = Array.from(new Set((note.tags ?? []).map(normalizeTag)))
            .filter((t) => t && !present.has(t));

        let noteData = note.noteData;
        if (missing.length > 0) {
            const body = noteData.trimEnd();
            const line = missing.map((t) => `#${t}`).join(' ');
            noteData = body ? `${body}\n\n${line}\n` : `${line}\n`;
        }

        const tags = extractHashtags(noteData);
        const oldTags = note.tags ?? [];
        if (noteData === note.noteData && tags.join('\0') === oldTags.join('\0')) continue;

        await StorageService.setNote(entry.noteId, { ...note, noteData, tags });
    }

    await StorageService.setHashtagsMigrated();
}
