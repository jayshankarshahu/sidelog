import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { NoteObject, NoteIndexEntry } from '../types';
import * as StorageService from '../services/StorageService';
import * as NoteService from '../services/NoteService';
import { openExtensionPage } from '../services/NavigationService';
import { SearchBar } from './components/SearchBar';
import { TagFilter } from './components/TagFilter';
import { TimelineView, TimelineEntry } from './components/TimelineView';
import './TimelineApp.css';
import { getStoredTheme } from '../settings/SettingsApp';

interface LoadedNote {
    entry: NoteIndexEntry;
    note: NoteObject;
}

/**
 * Returns all dates between two date strings (inclusive), descending.
 */
function getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
    }

    return dates.reverse(); // newest first
}

/**
 * Returns true if the note has meaningful content (not just whitespace).
 */
function hasContent(note: NoteObject): boolean {
    return note.noteData.trim().length > 0;
}

/** `?tag=` from the page URL (set by the editor's tag chips), normalized. */
function readTagParam(): string | null {
    const tag = new URLSearchParams(window.location.search).get('tag');
    return tag?.trim().replace(/^#/, '').toLowerCase() || null;
}

export const TimelineApp: React.FC = () => {
    const [notes, setNotes] = useState<LoadedNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(readTagParam);

    // Expanded note cards, keyed by date (survives filter changes)
    const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());
    const toggleExpanded = useCallback((date: string, expanded: boolean) => {
        setExpandedDates((prev) => {
            if (prev.has(date) === expanded) return prev;
            const next = new Set(prev);
            if (expanded) next.add(date);
            else next.delete(date);
            return next;
        });
    }, []);

    // Keep `?tag=` in sync so reloads / copied URLs keep the filter
    useEffect(() => {
        const url = new URL(window.location.href);
        if (activeTag) url.searchParams.set('tag', activeTag);
        else url.searchParams.delete('tag');
        if (url.href !== window.location.href) window.history.replaceState(null, '', url.href);
    }, [activeTag]);

    // Load all notes on mount
    useEffect(() => {
        const load = async () => {
            try {
                // Upgrade legacy manual tags first so stored tags match #hashtags
                await NoteService.migrateManualTagsToHashtags();
                const index = await StorageService.getIndex();
                const loaded: LoadedNote[] = [];

                for (const entry of index) {
                    const note = await StorageService.getNote(entry.noteId);
                    if (note) {
                        loaded.push({ entry, note });
                    }
                }

                // Sort newest first
                loaded.sort((a, b) => b.entry.date.localeCompare(a.entry.date));
                setNotes(loaded);
            } catch (err) {
                console.error('Failed to load notes:', err);
            } finally {
                setIsLoading(false);
            }
        };

        const loadTheme = async () => {
            try {
                const theme = await getStoredTheme();
                document.documentElement.setAttribute('data-theme', theme);
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };

        loadTheme();
        load();
    }, []);

    // Collect all unique tags across ALL notes with counts. A `?tag=` that no
    // note uses is still listed (count 0) so it shows as active and can be cleared.
    const tagInfos = useMemo(() => {
        const map = new Map<string, number>();
        for (const { note } of notes) {
            for (const tag of note.tags) {
                map.set(tag, (map.get(tag) || 0) + 1);
            }
        }
        if (activeTag && !map.has(activeTag)) map.set(activeTag, 0);
        return Array.from(map.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }, [notes, activeTag]);

    // Apply filters
    const filteredNotes = useMemo(() => {
        let result = notes;

        // Tag filter
        if (activeTag) {
            result = result.filter(({ note }) => note.tags.includes(activeTag));
        }

        // Date range filter
        if (dateFrom) {
            result = result.filter(({ entry }) => entry.date >= dateFrom);
        }
        if (dateTo) {
            result = result.filter(({ entry }) => entry.date <= dateTo);
        }

        // Search filter; `#foo` also matches tags starting with `foo`
        // (stored markdown may hold `\#foo`, so a plain substring can miss it)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const tagQuery = q.startsWith('#') ? q.slice(1) : null;
            result = result.filter(({ note }) =>
                note.noteData.toLowerCase().includes(q) ||
                note.tags.some((t) =>
                    tagQuery !== null ? t.startsWith(tagQuery) : t.includes(q)
                )
            );
        }

        return result;
    }, [notes, activeTag, dateFrom, dateTo, searchQuery]);

    // Build timeline entries with date gaps filled
    const timelineEntries: TimelineEntry[] = useMemo(() => {
        if (filteredNotes.length === 0) return [];

        // If search is active, skip gap filling — just show matching notes
        if (searchQuery.trim()) {
            return filteredNotes.map(({ entry, note }) => ({
                date: entry.date,
                // Treat whitespace-only notes as empty
                note: hasContent(note) ? note : null,
            }));
        }

        // Get the date range to fill
        const oldestDate = filteredNotes[filteredNotes.length - 1].entry.date;
        const newestDate = filteredNotes[0].entry.date;
        const allDates = getDateRange(oldestDate, newestDate);

        // Create a map for quick lookup; whitespace-only notes count as null
        const noteMap = new Map<string, NoteObject>();
        for (const { entry, note } of filteredNotes) {
            if (hasContent(note)) {
                noteMap.set(entry.date, note);
            }
        }

        // Build raw per-day entries
        const raw = allDates.map((date) => ({
            date,
            note: noteMap.get(date) || null,
        }));

        // Group consecutive empty days into a single gap entry
        const grouped: TimelineEntry[] = [];
        let gapBuffer: string[] = [];

        for (const entry of raw) {
            if (!entry.note) {
                gapBuffer.push(entry.date);
            } else {
                if (gapBuffer.length > 0) {
                    grouped.push({
                        // Use the oldest date in the gap as the key
                        date: gapBuffer[gapBuffer.length - 1],
                        note: null,
                        gapCount: gapBuffer.length,
                    });
                    gapBuffer = [];
                }
                grouped.push(entry);
            }
        }

        // Flush any trailing gap
        if (gapBuffer.length > 0) {
            grouped.push({
                date: gapBuffer[gapBuffer.length - 1],
                note: null,
                gapCount: gapBuffer.length,
            });
        }

        return grouped;
    }, [filteredNotes, searchQuery]);

    /**
     * These counts are derived directly from timelineEntries — the single source
     * of truth for what is actually rendered. This guarantees the number shown
     * in the SearchBar always matches the number of real note cards on screen.
     *
     * A "real note" = an entry that has content (not a gap row, not an empty day).
     */
    const visibleNoteCount = useMemo(
        () => timelineEntries.filter((e) => e.note !== null).length,
        [timelineEntries]
    );

    // Dates of the note cards currently shown (targets of Expand/Collapse all)
    const visibleNoteDates = useMemo(
        () => timelineEntries.filter((e) => e.note !== null).map((e) => e.date),
        [timelineEntries]
    );
    const allExpanded = visibleNoteDates.length > 0 && visibleNoteDates.every((d) => expandedDates.has(d));
    const anyExpanded = visibleNoteDates.some((d) => expandedDates.has(d));

    const expandAll = () => setExpandedDates((prev) => new Set([...prev, ...visibleNoteDates]));
    const collapseAll = () => setExpandedDates((prev) => {
        const next = new Set(prev);
        visibleNoteDates.forEach((d) => next.delete(d));
        return next;
    });

    const totalNoteCount = useMemo(
        () => notes.filter(({ note }) => hasContent(note)).length,
        [notes]
    );

    return (
        <div className="timeline-app">
            <div className="timeline-app__header">
                <h1 className="timeline-app__title">
                    <span className="material-symbols-rounded timeline-app__title-icon">history</span>
                    Notes Timeline
                </h1>
                <button
                    className="timeline-app__settings-button"
                    onClick={() => openExtensionPage('settings.html')}
                    title="Settings"
                    aria-label="Settings"
                >
                    <span className="material-symbols-rounded">settings</span>
                </button>
            </div>

            <SearchBar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onResetDates={() => { setDateFrom(''); setDateTo(''); }}
                resultCount={visibleNoteCount}
                totalCount={totalNoteCount}
            />

            <TagFilter
                tags={tagInfos}
                activeTag={activeTag}
                onTagClick={setActiveTag}
            />

            <div className="timeline-app__body">
                {isLoading ? (
                    <div className="timeline-app__loading">
                        <div className="timeline-app__loading-spinner" />
                        <span>Loading notes...</span>
                    </div>
                ) : (
                    <>
                        {visibleNoteDates.length > 0 && (
                            <div className="timeline-app__toolbar">
                                <button
                                    type="button"
                                    className="timeline-app__toolbar-button"
                                    onClick={expandAll}
                                    disabled={allExpanded}
                                >
                                    <span className="material-symbols-rounded">unfold_more</span>
                                    Expand all
                                </button>
                                <button
                                    type="button"
                                    className="timeline-app__toolbar-button"
                                    onClick={collapseAll}
                                    disabled={!anyExpanded}
                                >
                                    <span className="material-symbols-rounded">unfold_less</span>
                                    Collapse all
                                </button>
                            </div>
                        )}
                        <TimelineView
                            entries={timelineEntries}
                            searchQuery={searchQuery}
                            expandedDates={expandedDates}
                            onToggleExpanded={toggleExpanded}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
