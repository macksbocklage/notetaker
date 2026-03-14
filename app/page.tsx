'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AIToolbar from '@/components/AIToolbar'
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

function NavItem({ icon, label, shortcut, onClick, active }: {
  icon: React.ReactNode; label: string; shortcut?: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 rounded-md cursor-pointer"
      style={{
        height: 30, fontSize: 13, fontFamily: 'var(--font-sans)',
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: 'none', textAlign: 'left', transition: 'background 0.1s ease, color 0.1s ease',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
    >
      <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>{shortcut}</span>}
    </button>
  )
}

export default function Page() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const editorRef = useRef<EditorHandle>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionRef = useRef<SelectionState>({ text: '', rect: null, from: 0, to: 0 })

  const { notes, activeId, setActiveId, loading: notesLoading, createNote, updateNote, deleteNote } =
    useNotes(user?.id ?? '')

  const [searchOpen, setSearchOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({ text: '', rect: null, from: 0, to: 0 })
  const [diffActive, setDiffActive] = useState(false)
  const [reviewRect, setReviewRect] = useState<DOMRect | null>(null)
  const [reviewMode, setReviewMode] = useState<AIMode | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

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

  // ── Content change ───────────────────────────────────────────────────────────

  const handleContentChange = useCallback((html: string) => {
    setEditorContent(html)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const patch: { content: string; title?: string } = { content: html }
      const heading = extractFirstHeading(html)
      if (heading) patch.title = heading
      updateNote(activeId, patch)
    }, 400)
  }, [activeId, updateNote])

  // ── Note actions ─────────────────────────────────────────────────────────────

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
      if (meta && e.key === 'e') { e.preventDefault(); setSearchOpen(prev => !prev) }
      if (meta && e.key === 'n') { e.preventDefault(); handleNewNoteRef.current() }
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

  // ── AI: selection toolbar ────────────────────────────────────────────────────

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

  // ── AI: slash commands ───────────────────────────────────────────────────────

  const handleSlashCommand = useCallback(async (mode: AIMode, text: string, from: number, to: number) => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, selectedText: text }),
      })
      if (!res.ok) return

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
      }

      if (!result.trim()) return

      if (from === -1) {
        // Full-doc command (e.g. summarize with no paragraph): insert at cursor
        editorRef.current?.insertAtCursor(result)
      } else {
        // Apply diff to the target paragraph
        editorRef.current?.applyDiff(from, to, result, mode)
        // Get rect from diff marks position
        const rect = editorRef.current?.getDiffRect() ?? null
        setReviewRect(rect)
        setReviewMode(mode)
        setDiffActive(true)
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // ── AI: command bar (from SearchModal) ───────────────────────────────────────

  const handleAICommand = useCallback(async (prompt: string) => {
    const context = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const { text: selText, from, to } = selectionRef.current

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'custom', prompt, context, selectedText: selText || undefined }),
      })
      if (!res.ok) return

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
      }

      if (!result.trim()) return

      if (selText && from && to) {
        // Apply diff to selection
        editorRef.current?.applyDiff(from, to, result, 'rewrite')
        const rect = selectionRef.current.rect ?? editorRef.current?.getDiffRect() ?? null
        setReviewRect(rect)
        setReviewMode('rewrite')
        setDiffActive(true)
        setSelection({ text: '', rect: null, from: 0, to: 0 })
      } else {
        // Insert at cursor
        editorRef.current?.insertAtCursor(result)
        editorRef.current?.focus()
      }
    } catch {
      // Ignore errors
    }
  }, [editorContent])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (authLoading || notesLoading || !user) return null

  const showToolbar = selection.text.length > 0 || diffActive
  const toolbarRect = diffActive ? reviewRect : selection.rect

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', contain: 'layout' }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="w-52 flex flex-col shrink-0"
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: focusMode ? 'none' : undefined }}
      >
        {/* ── App header ─────────────────────────────── */}
        <div
          className="px-3 py-2.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>✦</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>
              Notetaker
            </span>
          </div>

          {/* Account button + popover */}
          <div className="relative">
            {accountOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                <div
                  className="absolute top-full mt-1 right-0 z-50 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.2)',
                    minWidth: '180px',
                  }}
                >
                  <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                      {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Account'}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                      {user?.email}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-colors"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setAccountOpen(o => !o)}
              title="Account"
              className="cursor-pointer shrink-0"
              style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', padding: 0 }}
            >
              {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                <img
                  src={user.user_metadata.avatar_url || user.user_metadata.picture}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {(user?.email?.[0] ?? '?').toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Nav items ──────────────────────────────── */}
        <div className="px-2 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <NavItem
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="1" width="11" height="11" rx="2"/><line x1="1" y1="4.5" x2="12" y2="4.5"/><line x1="4.5" y1="4.5" x2="4.5" y2="12"/></svg>}
            label="Notes"
            active
          />
          <NavItem
            icon={<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="5.5" cy="5.5" r="3.5"/><line x1="8.5" y1="8.5" x2="12" y2="12"/></svg>}
            label="Search"
            shortcut="⌘K"
            onClick={() => setSearchOpen(true)}
          />
        </div>

        {/* ── Note list ──────────────────────────────── */}
        <div className="px-2 pt-3 pb-1 shrink-0">
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, paddingLeft: 4 }}>
            Notes
          </span>
        </div>
        <div className="flex-1 overflow-y-auto pb-2 px-2">
          {notes.map((note, i) => (
            <div
              key={note.id}
              onClick={() => handleSwitchNote(note.id)}
              className="group note-item note-enter px-3 py-2 rounded-lg mb-0.5"
              style={{
                animationDelay: `${i * 30}ms`,
                borderLeft: 'none',
                boxShadow: 'none',
                ...(note.id === activeId
                  ? { background: 'var(--surface)', color: 'var(--text-primary)' }
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
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}
                >
                  ✕
                </button>
              </div>
              <div className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
                {formatDate(note.updatedAt)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Sidebar footer ───────────────────────────── */}
        <div
          className="px-3 py-2 flex items-center justify-end shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button onClick={handleNewNote} title="New note (⌘N)" className="icon-btn w-7 h-7 flex items-center justify-center rounded-md cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 min-h-0">
          <Editor
            key={activeId}
            ref={editorRef}
            initialContent={activeNote?.content ?? ''}
            onChange={handleContentChange}
            onSelectionChange={setSelection}
            onSlashCommand={handleSlashCommand}
          />
        </div>
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        notes={notes}
        onSelect={handleSwitchNote}
        onNewNote={() => { setSearchOpen(false); handleNewNote() }}
        onDeleteNote={() => handleDeleteNote(activeId)}
        onExport={handleExport}
        onFocusMode={() => { setSearchOpen(false); setFocusMode(f => !f) }}
        onAICommand={handleAICommand}
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
