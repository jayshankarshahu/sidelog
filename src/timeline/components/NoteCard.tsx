import React, { useMemo } from 'react';
import type { NoteObject } from '../../types';
import { formatDateLabel, formatTimestamp } from '../../services/DateService';
import './NoteCard.css';

interface NoteCardProps {
    date: string;
    note: NoteObject | null;
    searchQuery: string;
    /** Controlled by TimelineApp so "Expand all / Collapse all" can drive it. */
    isExpanded: boolean;
    onToggle: (date: string, expanded: boolean) => void;
}

/** Markdown backslash escapes, e.g. `\#tag` / `\_` emitted by the editor. */
const MD_ESCAPE_RE = /\\([\\`*_{}[\]()#+\-.!])/g;

/**
 * Strips markdown syntax to get plain text for preview.
 */
function stripMarkdown(md: string): string {
    return md
        .replace(/^#{1,6}\s+/gm, '')       // headings
        .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
        .replace(/\*(.+?)\*/g, '$1')        // italic
        .replace(/`{1,3}[^`]*`{1,3}/g, '')  // code
        .replace(/^\s*[-*+]\s+/gm, '• ')    // list items
        .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/^>\s+/gm, '')             // blockquotes
        .replace(/---/g, '')                // horizontal rules
        .replace(/\n{2,}/g, '\n')           // collapse newlines
        .replace(MD_ESCAPE_RE, '$1')        // backslash escapes (e.g. \#tag)
        .trim();
}

/**
 * Highlights search query matches in text.
 */
function highlightText(text: string, query: string): React.ReactNode {
    if (!query) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <span key={i} className="note-card__highlight">{part}</span>
        ) : (
            part
        )
    );
}

/**
 * Simple markdown-to-HTML renderer for the expanded view.
 */
function renderMarkdown(md: string): string {
    return md
        // Code blocks (before inline processing)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Headings
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold & italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Blockquotes
        .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr />')
        // Task lists
        .replace(/^\s*- \[x\] (.+)$/gm, '<li>✅ $1</li>')
        .replace(/^\s*- \[ \] (.+)$/gm, '<li>☐ $1</li>')
        // Unordered lists
        .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
        // Paragraphs (lines not already wrapped)
        .replace(/^(?!<[hupbola]|<\/|<li|<hr)(.*\S.*)$/gm, '<p>$1</p>')
        // Backslash escapes (e.g. \#tag) — last, so they can't form syntax above
        .replace(MD_ESCAPE_RE, '$1');
}

export const NoteCard: React.FC<NoteCardProps> = ({ date, note, searchQuery, isExpanded, onToggle }) => {
    const preview = useMemo(() => {
        if (!note) return '';
        // Enough text to fill the 3-line preview on a wide card
        return stripMarkdown(note.noteData).slice(0, 500);
    }, [note]);

    const renderedHtml = useMemo(() => {
        if (!note || !isExpanded) return '';
        return renderMarkdown(note.noteData);
    }, [note, isExpanded]);

    // Empty note card
    if (!note) {
        return (
            <div className="note-card note-card--empty">
                <div className="note-card__header">
                    <span className="note-card__date">{formatDateLabel(date)}</span>
                </div>
                <span className="note-card__empty-text">No note for this day</span>
            </div>
        );
    }

    return (
        <div
            className={`note-card ${isExpanded ? 'note-card--expanded' : ''}`}
            onClick={() => !isExpanded && onToggle(date, true)}
        >
            <div className="note-card__header">
                <span className="note-card__date">{formatDateLabel(date)}</span>
                <span className="note-card__last-edited">
                    {formatTimestamp(note.lastEdited)}
                </span>
            </div>

            {note.tags.length > 0 && (
                <div className="note-card__tags">
                    {note.tags.map((tag) => (
                        <span key={tag} className="note-card__tag">#{tag}</span>
                    ))}
                </div>
            )}

            {!isExpanded && (
                <div className="note-card__preview">
                    {highlightText(preview, searchQuery)}
                </div>
            )}

            {isExpanded && (
                <div
                    className="note-card__full-content"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
            )}

            <div className="note-card__toggle-row">
                <button
                    className="note-card__toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(date, !isExpanded);
                    }}
                >
                    <span className="material-symbols-rounded">
                        {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
        </div>
    );
};
