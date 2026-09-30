import React, { useEffect, useState } from 'react';
import { useNotes } from './hooks/useNotes';
import { getStoredTheme } from './settings/SettingsApp';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { Editor } from './components/Editor';
import { TagsPanel } from './components/TagsPanel';
import { openTimelineForTag } from './services/NavigationService';
import './App.css';

const App: React.FC = () => {
    const {
        currentNote,
        currentNoteId,
        currentIndex,
        totalNotes,
        isLoading,
        allTags,
        tagCounts,
        goToPrev,
        goToNext,
        goToDate,
        saveContent,
    } = useNotes();

    const [isTagsOpen, setIsTagsOpen] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const theme = await getStoredTheme();
                document.documentElement.setAttribute('data-theme', theme);
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };
        loadTheme();
    }, []);

    if (isLoading || !currentNote || !currentNoteId) {
        return (
            <div className="app">
                <div className="app__loading">
                    <div className="app__loading-spinner" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="app__content">
                <TopBar
                    date={currentNote.date}
                    canGoPrev={currentIndex > 0}
                    canGoNext={currentIndex < totalNotes - 1}
                    onPrev={goToPrev}
                    onNext={goToNext}
                    onJumpToDate={goToDate}
                />

                <div className="app__editor-area">
                    <Editor
                        key={currentNoteId}
                        noteId={currentNoteId}
                        initialContent={currentNote.noteData}
                        onContentChange={saveContent}
                        allTags={allTags}
                        tagCounts={tagCounts}
                        noteTags={currentNote.tags}
                    />
                </div>

                {isTagsOpen && (
                    <TagsPanel
                        tags={currentNote.tags}
                        onTagClick={openTimelineForTag}
                    />
                )}

                <BottomBar
                    goToDate={goToDate}
                    currentNote={currentNote}
                    tagCount={currentNote.tags.length}
                    isTagsOpen={isTagsOpen}
                    onToggleTags={() => setIsTagsOpen((v) => !v)}
                />
            </div>
        </div>
    );
};

export default App;
