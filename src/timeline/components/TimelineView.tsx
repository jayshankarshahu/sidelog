import React from 'react';
import type { NoteObject } from '../../types';
import { NoteCard } from './NoteCard';
import { formatDateLabel } from '../../services/DateService';
import './TimelineView.css';

/**
 * A single timeline entry.
 * When `gapCount > 1`, this represents N consecutive empty days collapsed into one row.
 */
export interface TimelineEntry {
    date: string;
    note: NoteObject | null;
    /** Number of consecutive empty days this entry represents. Undefined / 1 = single day. */
    gapCount?: number;
}

interface TimelineViewProps {
    entries: TimelineEntry[];
    searchQuery: string;
    /** Dates whose note card is expanded. */
    expandedDates: Set<string>;
    onToggleExpanded: (date: string, expanded: boolean) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    entries,
    searchQuery,
    expandedDates,
    onToggleExpanded,
}) => {
    if (entries.length === 0) {
        return (
            <div className="timeline-view">
                <div className="timeline-view__empty">
                    <span className="material-symbols-rounded timeline-view__empty-icon">edit_note</span>
                    <span className="timeline-view__empty-text">No notes found</span>
                    <span className="timeline-view__empty-hint">
                        Try adjusting your search or filters
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="timeline-view">
            {entries.map((entry, i) => {
                const isGap = !entry.note && (entry.gapCount ?? 1) > 1;

                return (
                    <div
                        className={`timeline-item ${isGap ? 'timeline-item--gap' : ''}`}
                        key={entry.date}
                        style={{ animationDelay: `${Math.min(i * 40, 500)}ms` }}
                    >
                        {/* Left: dot on the rail */}
                        <div className="timeline-item__marker">
                            <div
                                className={`timeline-item__dot ${!entry.note ? 'timeline-item__dot--empty' : ''}`}
                            />
                        </div>

                        {/* Right: card or compact gap indicator */}
                        <div className="timeline-item__content">
                            {isGap ? (
                                <div className="timeline-gap">
                                    <span className="material-symbols-rounded timeline-gap__icon">
                                        more_horiz
                                    </span>
                                    <span className="timeline-gap__label">
                                        {entry.gapCount} days — no notes
                                    </span>
                                    {entry.gapCount! > 1 && (
                                        <span className="timeline-gap__range">
                                            {formatDateLabel(entry.date)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <NoteCard
                                    date={entry.date}
                                    note={entry.note}
                                    searchQuery={searchQuery}
                                    isExpanded={expandedDates.has(entry.date)}
                                    onToggle={onToggleExpanded}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
