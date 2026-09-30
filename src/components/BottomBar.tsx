import React, { useRef } from 'react';
import './BottomBar.css';
import { NoteObject } from '../types';
import { getTodayString } from '../services/DateService';
import { openExtensionPage } from '../services/NavigationService';

interface BottomBarProps {
    goToDate: (date: string) => Promise<void>,
    currentNote: NoteObject,
    tagCount: number;
    isTagsOpen: boolean;
    onToggleTags: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
    goToDate,
    currentNote,
    tagCount,
    isTagsOpen,
    onToggleTags,
}) => {
    const todayDateRef = useRef(getTodayString());

    return (
        <div className="bottom-bar">
            <div className="bottom-bar__actions">
                <button
                    className={`bottom-bar__action ${isTagsOpen ? 'bottom-bar__action--active' : ''}`}
                    onClick={onToggleTags}
                    title="Tags"
                    aria-label="Tags"
                >
                    <span className="material-symbols-rounded bottom-bar__action-icon">label</span>
                    {tagCount > 0 && (
                        <span className="bottom-bar__badge">{tagCount}</span>
                    )}
                </button>

                <button
                    className="bottom-bar__action"
                    onClick={() => openExtensionPage('timeline.html')}
                    title="Timeline"
                    aria-label="Timeline"
                >
                    <span className="material-symbols-rounded bottom-bar__action-icon">timeline</span>
                </button>

                <button
                    className="bottom-bar__action"
                    onClick={() => openExtensionPage('settings.html')}
                    title="Settings"
                    aria-label="Settings"
                >
                    <span className="material-symbols-rounded bottom-bar__action-icon">settings</span>
                </button>

                {currentNote.date !== todayDateRef.current && (
                    <button
                        type="button"
                        className="bottom-bar__action heartbeat animate-once"
                        onClick={() => goToDate(todayDateRef.current)}
                        title="Go to Today's note"
                        aria-label="Today's note"
                    >
                        <span className="material-symbols-rounded bottom-bar__action-icon">today</span>
                    </button>
                )}
            </div>
        </div>
    );
};
