import React from 'react';
import './TagFilter.css';

interface TagInfo {
    tag: string;
    count: number;
}

interface TagFilterProps {
    tags: TagInfo[];
    activeTag: string | null;
    onTagClick: (tag: string | null) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
    tags,
    activeTag,
    onTagClick,
}) => {
    if (tags.length === 0) {
        return (
            <div className="tag-filter">
                <span className="tag-filter__label">Tags:</span>
                <span className="tag-filter__empty">No tags found</span>
            </div>
        );
    }

    return (
        <div className="tag-filter">
            <span className="tag-filter__label">Tags:</span>
            {tags.map(({ tag, count }) => (
                <button
                    key={tag}
                    className={`tag-filter__chip ${activeTag === tag ? 'tag-filter__chip--active' : ''}`}
                    onClick={() => onTagClick(activeTag === tag ? null : tag)}
                    aria-pressed={activeTag === tag}
                >
                    #{tag}
                    <span className="tag-filter__chip-count">({count})</span>
                </button>
            ))}
            {activeTag && (
                <button
                    className="tag-filter__clear"
                    onClick={() => onTagClick(null)}
                >
                    <span className="material-symbols-rounded tag-filter__clear-icon">close</span>
                    Clear
                </button>
            )}
        </div>
    );
};
