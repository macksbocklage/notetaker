'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AIToolbar from '@/components/AIToolbar'
import AISidebar from '@/components/AISidebar'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Note, SelectionState } from '@/types'
import type { EditorHandle } from '@/components/Editor'

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false })

function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const defaultNote = createNote()

export default function Page() {
  const editorRef = useRef<EditorHandle>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesRef = useRef<Note[]>([])

  // v2 key — fresh start with HTML storage (no markdown migration issues)
  const [notes, setNotes] = useLocalStorage<Note[]>('notetaker-notes-v2', [defaultNote])
  const [activeId, setActiveId] = useLocalStorage<string>('notetaker-active-id-v2', defaultNote.id)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null })

  notesRef.current = notes
  const activeNote = notes.find(n => n.id === activeId) ?? notes[0]

  // Mirror of editor HTML — kept for debounced save and AI context
  const [editorContent, setEditorContent] = useState(activeNote?.content ?? '')

  // Sync displayed content when switching notes
  useEffect(() => {
    const note = notesRef.current.find(n => n.id === activeId) ?? notesRef.current[0]
    setEditorContent(note?.content ?? '')
    setSelection({ text: '', rect: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      setNotes(prev =>
        prev.map(n => n.id === activeId
          ? { ...n, content: editorContent, updatedAt: Date.now() }
          : n
        )
      )
    }
  }, [activeId, editorContent, setNotes])

  // Immediate local update + debounced localStorage write
  const handleContentChange = useCallback((html: string) => {
    setEditorContent(html)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setNotes(prev =>
        prev.map(n => n.id === activeId
          ? { ...n, content: html, updatedAt: Date.now() }
          : n
        )
      )
    }, 400)
  }, [activeId, setNotes])

  const handleNewNote = () => {
    flushPendingSave()
    const note = createNote()
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
  }

  const handleSwitchNote = (id: string) => {
    if (id === activeId) return
    flushPendingSave()
    setActiveId(id)
  }

  const handleDeleteNote = (id: string) => {
    if (id === activeId) flushPendingSave()
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      if (next.length === 0) {
        const fresh = createNote()
        setActiveId(fresh.id)
        return [fresh]
      }
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }

  const handleTitleChange = (title: string) => {
    setNotes(prev =>
      prev.map(n => n.id === activeId ? { ...n, title, updatedAt: Date.now() } : n)
    )
  }

  const handleToolbarInsert = useCallback((text: string, mode: 'replace' | 'after') => {
    if (!editorRef.current) return
    if (mode === 'replace') {
      editorRef.current.replaceSelection(text)
    } else {
      editorRef.current.insertAtCursor(text)
    }
  }, [])

  const handleSidebarInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text)
    editorRef.current?.focus()
  }, [])

  // Strip HTML for AI context (plain text is cleaner for the model)
  const aiContext = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Note list sidebar */}
      <aside className="w-56 border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">Notes</span>
            <button
              onClick={handleNewNote}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xl leading-none cursor-pointer"
              title="New note"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className={`group px-3 py-2.5 cursor-pointer flex items-center justify-between rounded-lg mx-2 transition-colors ${
                note.id === activeId ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm truncate flex-1">{note.title || 'Untitled'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs ml-1 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
          <input
            value={activeNote?.title ?? ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="text-lg font-semibold text-gray-900 bg-transparent outline-none flex-1 placeholder-gray-300"
          />
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            ✦ AI
          </button>
        </header>

        {/* WYSIWYG editor — key remounts it cleanly when switching notes */}
        <div className="flex-1 min-h-0">
          <Editor
            key={activeId}
            ref={editorRef}
            initialContent={activeNote?.content ?? ''}
            onChange={handleContentChange}
            onSelectionChange={setSelection}
          />
        </div>
      </main>

      {selection.text && (
        <AIToolbar
          selection={selection}
          onInsert={handleToolbarInsert}
          onDismiss={() => setSelection({ text: '', rect: null })}
        />
      )}

      <AISidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documentContent={aiContext}
        onInsert={handleSidebarInsert}
      />
    </div>
  )
}
