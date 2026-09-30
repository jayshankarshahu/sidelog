import React, { useEffect, useRef, useState } from 'react';
import { Editor as MilkdownEditor, editorViewCtx, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/kit/prose/state';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { history } from '@milkdown/kit/plugin/history';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { replaceAll } from '@milkdown/kit/utils';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { useSlash } from '../slash';
import { useHashtag, hashtagHighlight, hashtagSourceRef } from '../hashtag';
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';
import '@milkdown/theme-nord/style.css';
import './Editor.css';

interface EditorProps {
    initialContent: string;
    noteId: string;
    onContentChange: (markdown: string) => void;
    /** All known hashtags, most-used first — feeds the #suggestion popup. */
    allTags: string[];
    /** Notes-per-tag for `allTags`, and this note's tags as counted there. */
    tagCounts: Record<string, number>;
    noteTags: string[];
}

interface EditorCoreProps {
    initialContent: string;
    onContentChange: (markdown: string) => void;
    onIsEmptyChange: (isEmpty: boolean) => void;
}

/**
 * EditorCore must live inside MilkdownProvider + ProsemirrorAdapterProvider.
 * It calls useEditor() to mount the Milkdown instance and useInstance() to
 * access the editor for the paste handler.
 *
 * Callbacks are stabilised via refs so the markdownUpdated listener never
 * captures a stale closure.
 */
const EditorCore: React.FC<EditorCoreProps> = ({
    initialContent,
    onContentChange,
    onIsEmptyChange,
}) => {
    const currentMarkdownRef = useRef(initialContent || '');
    const onContentChangeRef = useRef(onContentChange);
    const onIsEmptyChangeRef = useRef(onIsEmptyChange);

    // Always keep refs pointing at latest props — avoids stale closure in listener
    onContentChangeRef.current = onContentChange;
    onIsEmptyChangeRef.current = onIsEmptyChange;

    const [loading, getEditor] = useInstance();
    const slash = useSlash();
    const hashtag = useHashtag();

    // Upload event listener — decoupled from the node view.
    // Replace the stub inside with your real upload API when ready.
    useEffect(() => {
        const handler = (e: Event) => {
            const { file, resolve } = (e as CustomEvent).detail
            // Stub: create a local object URL to keep the flow testable end-to-end
            const localUrl = URL.createObjectURL(file)
            setTimeout(() => resolve(localUrl), 1000)
            // Real API: uploadToServer(file).then(url => resolve(url))
        }
        document.addEventListener('sidelog:image-upload', handler)
        return () => document.removeEventListener('sidelog:image-upload', handler)
    }, [])

    // Helper: move cursor to end of document and scroll into view.
    // Delayed by 500ms so the CSS entrance animation on .app__editor-area
    // (popup-slide-in: 80ms delay + 350ms = 430ms total) has completed and
    // the scroll container has its final dimensions.
    const focusEnd = () => {
        setTimeout(() => {
            const editor = getEditor();
            if (!editor) return;
            editor.action((ctx) => {
                const view = ctx.get(editorViewCtx);
                const end = TextSelection.atEnd(view.state.doc);
                const tr = view.state.tr.setSelection(end).scrollIntoView();
                view.dispatch(tr);
                view.focus();
            });
        }, 500);
    };

    // Popup: the whole page is destroyed/recreated on open, so `loading`
    // transitions true→false on every open. Run focusEnd once it's ready.
    useEffect(() => {
        if (loading) return;
        focusEnd();
    }, [loading]);

    useEditor((root) =>
        MilkdownEditor.make()
            .config(nord)
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.set(defaultValueCtx, initialContent || '');
                ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
                    currentMarkdownRef.current = markdown;
                    const empty = !markdown?.trim();
                    onIsEmptyChangeRef.current(empty);
                    onContentChangeRef.current(markdown);
                })
                
            })
            .config(slash.config)
            .config(hashtag.config)
            .use(commonmark)
            .use(history)
            .use(listener)
            .use(slash.plugin)
            .use(hashtag.plugin)
            .use(hashtagHighlight)
    );

    /**
     * Intercept paste events. When the clipboard contains plain text without HTML
     * (i.e., the user is pasting raw markdown from a text editor), we append the
     * pasted text to the current markdown content and use replaceAll() to let
     * Milkdown re-parse everything as markdown — rendering headings, bold, lists, etc.
     *
     * If the clipboard contains HTML (pasting from a browser or rich-text source),
     * we leave ProseMirror's default paste handler alone.
     */
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const types = Array.from(e.clipboardData?.types ?? []);
        const hasHTML = types.includes('text/html');
        const text = e.clipboardData?.getData('text/plain') ?? '';

        // Only intercept when there's no HTML counterpart — raw markdown paste
        if (!text || hasHTML) return;

        e.preventDefault();
        e.stopPropagation();

        if (loading) return;
        const editor = getEditor();
        if (!editor) return;

        // Append pasted text to whatever the editor currently contains
        const current = currentMarkdownRef.current.trimEnd();
        const merged = current ? `${current}\n\n${text}` : text;

        // replaceAll causes Milkdown to re-parse the whole string as markdown
        editor.action(replaceAll(merged));
    };

    return (
        <div onPaste={handlePaste}>
            <Milkdown />
        </div>
    );
};

/**
 * Public Editor component. Owns the isEmpty state (for the placeholder) and
 * provides the MilkdownProvider + ProsemirrorAdapterProvider context required
 * by useEditor, useInstance, and — later — usePluginViewFactory (slash plugin).
 *
 * Remounting on noteId change is handled upstream: App.tsx passes key={currentNoteId}
 * on this component, so the entire provider tree is torn down and rebuilt fresh.
 */
export const Editor: React.FC<EditorProps> = ({
    initialContent,
    onContentChange,
    allTags,
    tagCounts,
    noteTags,
}) => {
    const [isEmpty, setIsEmpty] = useState(!initialContent?.trim());

    // Read by HashtagMenu on each editor update (ref, not prop: plugin views
    // are created once per editor mount)
    hashtagSourceRef.current = { allTags, tagCounts, noteTags };

    return (
        <div className="editor-wrapper">
            {isEmpty && (
                <div className="editor-placeholder" aria-hidden="true">
                    Start writing your notes…
                </div>
            )}
            <MilkdownProvider>
                <ProsemirrorAdapterProvider>
                    <EditorCore
                        initialContent={initialContent}
                        onContentChange={onContentChange}
                        onIsEmptyChange={setIsEmpty}
                    />
                </ProsemirrorAdapterProvider>
            </MilkdownProvider>
        </div>
    );
};
