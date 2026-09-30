import React from 'react';
import './TagsPanel.css';

interface TagsPanelProps {
    /** Hashtags derived from the current note's text (read-only). */
    tags: string[];
    onTagClick: (tag: string) => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({ tags, onTagClick }) => {
    return (
        <div className="tags-panel">
            <div className="tags-panel__chips">
                {tags.length === 0 ? (
                    <span className="tags-panel__empty">
                        No hashtags yet — type #tag in your note
                    </span>
                ) : (
                    tags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className="tags-panel__chip"
                            onClick={() => onTagClick(tag)}
                            title={`Show all notes tagged #${tag}`}
                        >
                            #{tag}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
