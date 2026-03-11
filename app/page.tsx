'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AIToolbar from '@/components/AIToolbar'
import AISidebar from '@/components/AISidebar'
import SearchModal from '@/components/SearchModal'
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

function extractFirstHeading(html: string): string | null {
  const match = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)
  if (!match) return null
  return match[1].replace(/<[^>]*>/g, '').trim() || null
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null, from: 0, to: 0 })
  const [diffActive, setDiffActive] = useState(false)
  const [reviewRect, setReviewRect] = useState<DOMRect | null>(null)
  const [reviewMode, setReviewMode] = useState<AIMode | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  // Dark mode — init from localStorage, apply to <html>
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') setDarkMode(true)
  }, [])
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('theme-dark')
    } else {
      document.documentElement.classList.remove('theme-dark')
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  selectionRef.current = selection
  const activeNote = notes.find(n => n.id === activeId) ?? notes[0]
  const [editorContent, setEditorContent] = useState(activeNote?.content ?? '')

  // Ref so stable callbacks can always read the latest title
  const activeTitleRef = useRef(activeNote?.title)
  activeTitleRef.current = activeNote?.title

  // Set to true before createNote() so the activeId effect can focus instantly
  const focusEditorOnMount = useRef(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth')
  }, [user, authLoading, router])

  useEffect(() => {
    const note = notes.find(n => n.id === activeId) ?? notes[0]
    setEditorContent(note?.content ?? '')
    setSelection({ text: '', rect: null, from: 0, to: 0 })
    if (focusEditorOnMount.current) {
      focusEditorOnMount.current = false
      requestAnimationFrame(() => editorRef.current?.focus())
    }
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
      const patch: { content: string; title?: string } = { content: html }
      // Auto-title: always sync title from first heading if one exists
      const heading = extractFirstHeading(html)
      if (heading) patch.title = heading
      updateNote(activeId, patch)
    }, 400)
  }, [activeId, updateNote])

  const handleNewNote = useCallback(async () => {
    flushPendingSave()
    focusEditorOnMount.current = true
    await createNote()
  }, [flushPendingSave, createNote])

  // Stable refs so the global keydown listener never goes stale
  const handleNewNoteRef = useRef(handleNewNote)
  handleNewNoteRef.current = handleNewNote

  const handleDeleteNoteRef = useRef(() => handleDeleteNote(activeId))
  handleDeleteNoteRef.current = () => handleDeleteNote(activeId)

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') { e.preventDefault(); setSearchOpen(prev => !prev) }
      if (meta && e.key === 'n') { e.preventDefault(); handleNewNoteRef.current() }
      if (meta && e.key === 'e') { e.preventDefault(); setSidebarOpen(prev => !prev) }
      if (meta && e.key === 'w') { e.preventDefault(); handleDeleteNoteRef.current() }
      if (meta && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocusMode(prev => !prev) }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSwitchNote = useCallback((id: string) => {
    if (id === activeId) return
    flushPendingSave()
    setActiveId(id)
  }, [activeId, flushPendingSave, setActiveId])

  const handleDeleteNote = (id: string) => {
    if (id === activeId) flushPendingSave()
    deleteNote(id)
  }

  const handleTitleChange = (title: string) => {
    updateNote(activeId, { title })
  }

  const handleExport = useCallback(async () => {
    if (!activeNote) return
    const { default: TurndownService } = await import('turndown')
    const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    const body = td.turndown(editorContent || activeNote.content)
    const markdown = `# ${activeNote.title}\n\n${body}`.trimEnd() + '\n'
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() || 'untitled'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [activeNote, editorContent])

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

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="w-52 flex flex-col shrink-0"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: focusMode ? 'none' : undefined }}
      >
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
          >
            Notes
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setSearchOpen(true)} title="Search notes (⌘K)" className="icon-btn w-6 h-6 flex items-center justify-center rounded-md cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="5.5" cy="5.5" r="3.5" /><line x1="8.5" y1="8.5" x2="12" y2="12" />
              </svg>
            </button>
            <button onClick={handleNewNote} title="New note (⌘N)" className="icon-btn w-6 h-6 flex items-center justify-center rounded-md cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
              </svg>
            </button>
            <button onClick={handleSignOut} title="Sign out" className="icon-btn w-6 h-6 flex items-center justify-center rounded-md cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h3" /><polyline points="9 9 12 6.5 9 4" /><line x1="12" y1="6.5" x2="4.5" y2="6.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className="group note-item px-3 py-2.5 rounded-lg mb-0.5"
              style={{
                borderLeft: 'none',
                boxShadow: 'none',
                ...(note.id === activeId
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                    }
                  : {}),
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className="text-sm truncate flex-1 leading-snug"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: note.id === activeId ? 500 : 400 }}
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
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                {formatDate(note.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center gap-3 px-8 py-4 shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            opacity: focusMode ? 0.2 : 1,
            transition: 'opacity 0.3s ease',
          }}
          onMouseEnter={focusMode ? e => { (e.currentTarget as HTMLElement).style.opacity = '1' } : undefined}
          onMouseLeave={focusMode ? e => { (e.currentTarget as HTMLElement).style.opacity = '0.2' } : undefined}
        >
          <div className="flex-1" />
          <button
            onClick={() => setFocusMode(f => !f)}
            title={focusMode ? 'Exit focus mode (⌘⇧F)' : 'Focus mode (⌘⇧F)'}
            className="icon-btn w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ color: focusMode ? 'var(--accent)' : undefined }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {focusMode ? (
                <><polyline points="1 5 1 1 5 1" /><polyline points="9 1 13 1 13 5" /><polyline points="13 9 13 13 9 13" /><polyline points="5 13 1 13 1 9" /></>
              ) : (
                <><polyline points="3 7 1 7 1 1 7 1 7 3" /><polyline points="7 11 7 13 13 13 13 7 11 7" /><line x1="1" y1="13" x2="5.5" y2="8.5" /><line x1="8.5" y1="5.5" x2="13" y2="1" /></>
              )}
            </svg>
          </button>
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="icon-btn w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
          >
            {darkMode ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="3" /><line x1="7" y1="1" x2="7" y2="2.5" /><line x1="7" y1="11.5" x2="7" y2="13" /><line x1="1" y1="7" x2="2.5" y2="7" /><line x1="11.5" y1="7" x2="13" y2="7" /><line x1="2.93" y1="2.93" x2="4" y2="4" /><line x1="10" y1="10" x2="11.07" y2="11.07" /><line x1="11.07" y1="2.93" x2="10" y2="4" /><line x1="4" y1="10" x2="2.93" y2="11.07" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11.5 8.5A5.5 5.5 0 014.5 1.5a5.5 5.5 0 100 10 5.5 5.5 0 007-3z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleExport}
            title="Export as Markdown"
            className="header-btn flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg"
            style={{ fontFamily: 'var(--font-sans)', height: '36px' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="1" x2="6" y2="8" /><polyline points="3 5.5 6 8.5 9 5.5" /><line x1="1" y1="11" x2="11" y2="11" />
            </svg>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="header-btn flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg"
            style={{ fontFamily: 'var(--font-sans)', height: '36px' }}
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

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        notes={notes}
        onSelect={handleSwitchNote}
        onNewNote={() => { setSearchOpen(false); handleNewNote() }}
        onDeleteNote={() => handleDeleteNote(activeId)}
        onExport={handleExport}
        onFocusMode={() => { setSearchOpen(false); setFocusMode(f => !f) }}
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
