'use client'
import { useState, useEffect, useRef } from 'react'
import type { Note } from '@/types'

// ── Action definitions ────────────────────────────────────────────────────────

type ActionId = 'new-note' | 'delete-note' | 'export-md' | 'focus-mode'

interface ActionDef {
  id: ActionId
  label: string
  terms: string[]   // additional search terms beyond the label
  shortcut?: string
}

const ACTIONS: ActionDef[] = [
  { id: 'new-note',    label: 'New note',               terms: ['create', 'add'],                          shortcut: '⌘N'  },
  { id: 'focus-mode',  label: 'Toggle focus mode',      terms: ['distraction', 'zen', 'hide', 'fullscreen'], shortcut: '⌘⇧F' },
  { id: 'delete-note', label: 'Delete note',             terms: ['remove', 'trash', 'erase']                              },
  { id: 'export-md',   label: 'Download as Markdown',    terms: ['export', 'save', 'md', 'file']                          },
]

function actionMatches(a: ActionDef, q: string) {
  return a.label.toLowerCase().includes(q) || a.terms.some(t => t.includes(q))
}

// ── Item union ────────────────────────────────────────────────────────────────

type Item =
  | { type: 'action'; def: ActionDef }
  | { type: 'note';   note: Note }

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getSnippet(content: string, query: string): string {
  const text = stripHtml(content)
  if (!query.trim()) return text.slice(0, 140) + (text.length > 140 ? '…' : '')
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 140) + (text.length > 140 ? '…' : '')
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + query.length + 90)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

function ActionIcon({ id }: { id: ActionId }) {
  const s = { color: 'var(--text-secondary)' }
  if (id === 'new-note') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={s}>
      <line x1="5.5" y1="1" x2="5.5" y2="10" /><line x1="1" y1="5.5" x2="10" y2="5.5" />
    </svg>
  )
  if (id === 'delete-note') return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <polyline points="1 3 10 3" /><path d="M4 3V2h3v1" />
      <path d="M2 3l.7 7.3A1 1 0 003.7 11h3.6a1 1 0 001-.7L9 3" />
    </svg>
  )
  if (id === 'focus-mode') return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={s}>
      <polyline points="2.5 5.5 1 5.5 1 1 5.5 1 5.5 2.5" /><polyline points="5.5 8.5 5.5 10 10 10 10 5.5 8.5 5.5" />
    </svg>
  )
  // export-md
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <line x1="5.5" y1="1" x2="5.5" y2="8.5" />
      <polyline points="2.5 6 5.5 9 8.5 6" />
      <line x1="1" y1="11" x2="10" y2="11" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  notes: Note[]
  onSelect: (id: string) => void
  onNewNote: () => void
  onDeleteNote: () => void
  onExport: () => void
  onFocusMode: () => void
}

export default function SearchModal({ open, onClose, notes, onSelect, onNewNote, onDeleteNote, onExport, onFocusMode }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.toLowerCase().trim()

  const matchingActions = ACTIONS.filter(a => !q || actionMatches(a, q))
  const matchingNotes   = notes.filter(note =>
    !q ||
    note.title.toLowerCase().includes(q) ||
    stripHtml(note.content).toLowerCase().includes(q)
  )

  const items: Item[] = [
    ...matchingActions.map(def => ({ type: 'action' as const, def })),
    ...matchingNotes.map(note => ({ type: 'note' as const, note })),
  ]

  // Index of first note item (for rendering a subtle divider)
  const firstNoteIdx = matchingActions.length

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.children[activeIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const activate = (item: Item) => {
    if (item.type === 'action') {
      if (item.def.id === 'new-note')    onNewNote()
      if (item.def.id === 'delete-note') onDeleteNote()
      if (item.def.id === 'export-md')   onExport()
      if (item.def.id === 'focus-mode')  onFocusMode()
    } else {
      onSelect(item.note.id)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':    onClose(); break
      case 'ArrowDown': e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)); break
      case 'ArrowUp':   e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); break
      case 'Enter':     if (items[activeIndex]) activate(items[activeIndex]); break
    }
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes cmd-backdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cmd-slide-up { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center"
        style={{
          background: 'rgba(28, 26, 23, 0.45)',
          backdropFilter: 'blur(3px)',
          paddingTop: '18vh',
          animation: 'cmd-backdrop 0.25s ease forwards',
        }}
        onMouseDown={onClose}
      >
      <div
        className="w-full mx-4 rounded-xl flex flex-col overflow-hidden"
        style={{
          maxWidth: '520px',
          maxHeight: '60vh',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          animation: 'cmd-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          willChange: 'transform, opacity',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes or type a command…"
            className="flex-1 outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)' }}
          />
          <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>
            ESC
          </kbd>
        </div>

        {items.length > 0 && <div style={{ height: '1px', background: 'var(--border)' }} />}

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {items.map((item, i) => {
            const isActive = i === activeIndex
            const activeStyle = {
              borderLeft: 'none',
              background: isActive ? 'var(--surface)' : 'transparent',
            }
            // Thin divider before first note when both sections are present
            const showDivider = i === firstNoteIdx && firstNoteIdx > 0 && matchingNotes.length > 0

            if (item.type === 'action') {
              return (
                <div key={item.def.id}>
                  <div
                    onClick={() => activate(item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="px-4 py-2.5 cursor-pointer flex items-center gap-3"
                    style={activeStyle}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <ActionIcon id={item.def.id} />
                    </div>
                    <span className="flex-1 text-sm" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-primary)' }}>
                      <Highlight text={item.def.label} query={query} />
                    </span>
                    {item.def.shortcut && (
                      <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>
                        {item.def.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              )
            }

            const { note } = item
            const snippet = getSnippet(note.content, query)
            return (
              <div key={note.id}>
                {showDivider && <div style={{ height: '1px', background: 'var(--border)', margin: '2px 0' }} />}
                <div
                  onClick={() => activate(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className="px-4 py-3 cursor-pointer"
                  style={activeStyle}
                >
                  <div className="text-sm mb-0.5" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    <Highlight text={note.title || 'Untitled'} query={query} />
                  </div>
                  {snippet && (
                    <div className="text-xs leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}>
                      <Highlight text={snippet} query={query} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {q && items.length === 0 && (
            <div className="px-4 py-10 text-center text-sm" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: '1px solid var(--border)' }}>
            {['↑↓ Navigate', '↵ Select', 'Esc Close'].map(hint => (
              <span key={hint} style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-tertiary)' }}>{hint}</span>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
