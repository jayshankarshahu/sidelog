import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { NoteObject, NoteIndex } from '../types';
import * as NoteService from '../services/NoteService';
import * as StorageService from '../services/StorageService';
import { extractHashtags } from '../services/HashtagService';
import { saveStateManager } from '../state';

interface UseNotesReturn {
    currentNote: NoteObject | null;
    currentNoteId: string | null;
    currentIndex: number;
    totalNotes: number;
    isLoading: boolean;
    /** Every hashtag used in any note (incl. unsaved edits), most-used first. */
    allTags: string[];
    /** Number of notes using each tag in `allTags`. */
    tagCounts: Record<string, number>;
    goToPrev: () => void;
    goToNext: () => void;
    goToDate: (date: string) => Promise<void>;
    saveContent: (markdown: string) => void;
}

const DEBOUNCE_MS = 500;

/** Count notes per tag. */
function countTags(tagsByNote: Map<string, string[]>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const tags of tagsByNote.values()) {
        for (const t of tags) counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
}

/** Tags ranked by usage (desc), then alphabetically. */
function rankTags(counts: Record<string, number>): string[] {
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
}

export function useNotes(): UseNotesReturn {
    const [currentNote, setCurrentNote] = useState<NoteObject | null>(null);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sortedIndex, setSortedIndex] = useState<NoteIndex>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const allTags = useMemo(() => rankTags(tagCounts), [tagCounts]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // noteId → hashtags derived from that note's markdown; source of `allTags`
    const tagsByNote = useRef(new Map<string, string[]>());

    // Replace one note's tags and recompute counts (keeps identity if unchanged,
    // so typing without touching hashtags doesn't re-render consumers)
    const setNoteTags = useCallback((noteId: string, tags: string[]) => {
        const prevTags = tagsByNote.current.get(noteId) ?? [];
        tagsByNote.current.set(noteId, tags);
        if (prevTags.join('\0') === tags.join('\0')) return;
        setTagCounts(countTags(tagsByNote.current));
    }, []);

    // Initialize — load or create today's note and collect all tags
    useEffect(() => {
        const init = async () => {
            try {
                // One-time: fold legacy manual tags into note text as #hashtags
                await NoteService.migrateManualTagsToHashtags();
                const lastOpenedDate = await StorageService.getLastOpenedDate();
                const result = lastOpenedDate
                    ? await NoteService.getOrCreateDateNote(lastOpenedDate)
                    : await NoteService.getOrCreateTodayNote();

                setCurrentNote(result.note);
                setCurrentNoteId(result.noteId);
                setCurrentIndex(result.currentIndex);
                setSortedIndex(result.sortedIndex);
                await StorageService.setLastOpenedDate(result.note.date);

                // Derive hashtags for every note (content is the source of truth)
                for (const entry of result.sortedIndex) {
                    const note = await StorageService.getNote(entry.noteId);
                    if (note) tagsByNote.current.set(entry.noteId, extractHashtags(note.noteData));
                }
                setTagCounts(countTags(tagsByNote.current));
            } catch (err) {
                console.error('Failed to initialize notes:', err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    // Navigate to a specific index
    const navigateTo = useCallback(async (index: number) => {
        const result = await NoteService.getNoteAtIndex(index);
        if (result) {
            setCurrentNote(result.note);
            setCurrentNoteId(result.noteId);
            setCurrentIndex(index);
            await StorageService.setLastOpenedDate(result.note.date);
        }
    }, []);

    const goToPrev = useCallback(async () => {
        if (currentIndex > 0) {
            await navigateTo(currentIndex - 1);
        }
    }, [currentIndex, navigateTo]);

    const goToNext = useCallback(async () => {
        if (currentIndex < sortedIndex.length - 1) {
            await navigateTo(currentIndex + 1);
        }
    }, [currentIndex, sortedIndex.length, navigateTo]);

    // Jump to a note by date string (yyyy-mm-dd), creating one if needed
    const goToDate = useCallback(async (date: string) => {
        const result = await NoteService.getOrCreateDateNote(date);
        setCurrentNote(result.note);
        setCurrentNoteId(result.noteId);
        setCurrentIndex(result.currentIndex);
        setSortedIndex(result.sortedIndex);
        await StorageService.setLastOpenedDate(result.note.date);
    }, []);

    // Debounced save
    const saveContent = useCallback(
        (markdown: string) => {
            if (!currentNoteId) return;

            // Optimistic local update; tags follow the text immediately
            const tags = extractHashtags(markdown);
            setCurrentNote((prev) =>
                prev ? { ...prev, noteData: markdown, tags, lastEdited: Date.now() } : prev
            );
            setNoteTags(currentNoteId, tags);

            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Mark as saving when the debounce timer starts
            saveStateManager.setState('saving');

            debounceTimer.current = setTimeout(async () => {
                try {
                    const saved = await NoteService.saveNoteContent(currentNoteId, markdown);
                    if (saved) setNoteTags(currentNoteId, saved.tags);
                    saveStateManager.setState('saved');
                } catch (error) {
                    console.error('Failed to save note:', error);
                    saveStateManager.setState('error');
                }
            }, DEBOUNCE_MS);
        },
        [currentNoteId, setNoteTags]
    );

    return {
        currentNote,
        currentNoteId,
        currentIndex,
        totalNotes: sortedIndex.length,
        isLoading,
        allTags,
        tagCounts,
        goToPrev,
        goToNext,
        goToDate,
        saveContent,
    };
}
