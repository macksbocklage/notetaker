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
  { id: 'new-note',    label: 'New note',               terms: ['create', 'add'],                            shortcut: '⌘N'  },
  { id: 'focus-mode',  label: 'Toggle focus mode',      terms: ['distraction', 'zen', 'hide', 'fullscreen'], shortcut: '⌘⇧F' },
  { id: 'export-md',   label: 'Download as Markdown',   terms: ['export', 'save', 'md', 'file']                            },
  { id: 'delete-note', label: 'Delete note',            terms: ['remove', 'trash', 'erase']                                },
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
  const s = { color: 'var(--text-tertiary)' }
  if (id === 'new-note') return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={s}>
      <line x1="6.5" y1="1" x2="6.5" y2="12" /><line x1="1" y1="6.5" x2="12" y2="6.5" />
    </svg>
  )
  if (id === 'delete-note') return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <polyline points="1 3.5 12 3.5" /><path d="M4.5 3.5V2.5h4v1" />
      <path d="M2.5 3.5l.8 7.5A1 1 0 004.3 12h4.4a1 1 0 001-.9l.8-7.6" />
    </svg>
  )
  if (id === 'focus-mode') return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={s}>
      <polyline points="3 6.5 1 6.5 1 1 6.5 1 6.5 3" /><polyline points="6.5 10 6.5 12 12 12 12 6.5 10 6.5" />
    </svg>
  )
  // export-md
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={s}>
      <line x1="6.5" y1="1" x2="6.5" y2="9" />
      <polyline points="3 6 6.5 9.5 10 6" />
      <line x1="1" y1="12" x2="12" y2="12" />
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


  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.children[activeIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const activate = (item: Item) => {
    if (item.type === 'action') {
      if (item.def.id === 'new-note')     onNewNote()
      if (item.def.id === 'delete-note')  onDeleteNote()
      if (item.def.id === 'export-md')    onExport()
      if (item.def.id === 'focus-mode')   onFocusMode()
    } else if (item.type === 'note') {
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
          background: 'rgba(0, 0, 0, 0.6)',
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
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.12), 0 24px 60px rgba(0,0,0,0.18)',
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
            onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
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
              boxShadow: 'none',
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
                    <span className="flex items-center justify-center shrink-0" style={{ width: 16 }}>
                      <ActionIcon id={item.def.id} />
                    </span>
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
