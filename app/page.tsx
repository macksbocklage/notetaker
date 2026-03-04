'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AIToolbar from '@/components/AIToolbar'
import AISidebar from '@/components/AISidebar'
import { useAuth } from '@/context/AuthContext'
import { useNotes } from '@/hooks/useNotes'
import { SelectionState, AIMode } from '@/types'
import type { EditorHandle } from '@/components/Editor'
import { createClient } from '@/lib/supabase/client'

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false })

function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Page() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const editorRef = useRef<EditorHandle>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionRef = useRef<SelectionState>({ text: '', rect: null, from: 0, to: 0 })

  const { notes, activeId, setActiveId, loading: notesLoading, createNote, updateNote, deleteNote } =
    useNotes(user?.id ?? '')

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null, from: 0, to: 0 })
  const [diffActive, setDiffActive] = useState(false)
  const [reviewRect, setReviewRect] = useState<DOMRect | null>(null)
  const [reviewMode, setReviewMode] = useState<AIMode | null>(null)

  selectionRef.current = selection
  const activeNote = notes.find(n => n.id === activeId) ?? notes[0]
  const [editorContent, setEditorContent] = useState(activeNote?.content ?? '')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const note = notes.find(n => n.id === activeId) ?? notes[0]
    setEditorContent(note?.content ?? '')
    setSelection({ text: '', rect: null, from: 0, to: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      updateNote(activeId, { content: editorContent })
    }
  }, [activeId, editorContent, updateNote])

  const handleContentChange = useCallback((html: string) => {
    setEditorContent(html)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateNote(activeId, { content: html })
    }, 400)
  }, [activeId, updateNote])

  const handleNewNote = async () => {
    flushPendingSave()
    await createNote()
  }

  const handleSwitchNote = (id: string) => {
    if (id === activeId) return
    flushPendingSave()
    setActiveId(id)
  }

  const handleDeleteNote = (id: string) => {
    if (id === activeId) flushPendingSave()
    deleteNote(id)
  }

  const handleTitleChange = (title: string) => {
    updateNote(activeId, { title })
  }

  const handleApply = useCallback((text: string, mode: AIMode) => {
    const { from, to, rect } = selectionRef.current
    editorRef.current?.applyDiff(from, to, text, mode)
    setReviewRect(rect)
    setReviewMode(mode)
    setDiffActive(true)
    setSelection({ text: '', rect: null, from: 0, to: 0 })
  }, [])

  const handleAccept = useCallback(() => {
    editorRef.current?.acceptDiff()
    setDiffActive(false)
    setReviewRect(null)
    setReviewMode(null)
  }, [])

  const handleReject = useCallback(() => {
    editorRef.current?.rejectDiff()
    setDiffActive(false)
    setReviewRect(null)
    setReviewMode(null)
  }, [])

  const handleSidebarInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text)
    editorRef.current?.focus()
  }, [])

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      editorRef.current?.focus()
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (authLoading || notesLoading || !user) return null

  const aiContext = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const showToolbar = selection.text.length > 0 || diffActive
  const toolbarRect = diffActive ? reviewRect : selection.rect

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', contain: 'layout' }}>

      {/* ── Sidebar ────────────────────────────────── */}
      <aside
        className="w-52 flex flex-col shrink-0"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
      >
        {/* Sidebar header */}
        <div
          className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
          >
            Notes
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewNote}
              title="New note"
              className="icon-btn w-6 h-6 flex items-center justify-center rounded-md cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="7" y1="2" x2="7" y2="12" />
                <line x1="2" y1="7" x2="12" y2="7" />
              </svg>
            </button>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="icon-btn w-6 h-6 flex items-center justify-center rounded-md cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3" />
                <polyline points="10 10 13 7 10 4" />
                <line x1="13" y1="7" x2="5" y2="7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className={`group note-item px-3 py-2.5 rounded-lg mb-0.5`}
              style={note.id === activeId ? {
                background: 'var(--surface)',
                color: 'var(--text-primary)',
              } : {}}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className="text-sm truncate flex-1 leading-snug"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: note.id === activeId ? 500 : 400,
                  }}
                >
                  {note.title || 'Untitled'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                  className="opacity-0 group-hover:opacity-100 text-xs transition-opacity duration-100 cursor-pointer w-4 h-4 flex items-center justify-center shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}
                >
                  ✕
                </button>
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
              >
                {formatDate(note.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center gap-3 px-8 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <input
            value={activeNote?.title ?? ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="text-xl outline-none flex-1 bg-transparent"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          />
          <button
            onClick={() => setSidebarOpen(true)}
            className="header-btn flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <span style={{ color: 'var(--accent)', fontSize: '12px' }}>✦</span>
            <span>AI</span>
          </button>
        </header>

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

      <AISidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documentContent={aiContext}
        onInsert={handleSidebarInsert}
      />

      {showToolbar && (
        <AIToolbar
          rect={toolbarRect}
          selectedText={selection.text}
          inReview={diffActive}
          onApply={handleApply}
          onAccept={handleAccept}
          onReject={handleReject}
          onDismiss={() => setSelection({ text: '', rect: null, from: 0, to: 0 })}
        />
      )}
    </div>
  )
}
