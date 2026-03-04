'use client'
import { useState, useEffect, useRef } from 'react'
import type { Note } from '@/types'

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

interface Props {
  open: boolean
  onClose: () => void
  notes: Note[]
  onSelect: (id: string) => void
}

export default function SearchModal({ open, onClose, notes, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = notes.filter(note => {
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (
      note.title.toLowerCase().includes(q) ||
      stripHtml(note.content).toLowerCase().includes(q)
    )
  })

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
    const item = list.children[activeIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex].id)
          onClose()
        }
        break
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(28, 26, 23, 0.45)', backdropFilter: 'blur(3px)', paddingTop: '18vh' }}
      onMouseDown={onClose}
    >
      <div
        className="modal-pop-in w-full mx-4 rounded-xl flex flex-col overflow-hidden"
        style={{
          maxWidth: '520px',
          maxHeight: '60vh',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <svg
            width="15" height="15" viewBox="0 0 15 15" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes…"
            className="flex-1 outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-primary)' }}
          />
          <kbd
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 6px',
            }}
          >
            ESC
          </kbd>
        </div>

        {filtered.length > 0 && <div style={{ height: '1px', background: 'var(--border)' }} />}

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {filtered.map((note, i) => {
            const isActive = i === activeIndex
            const snippet = getSnippet(note.content, query)
            return (
              <div
                key={note.id}
                onClick={() => { onSelect(note.id); onClose() }}
                onMouseEnter={() => setActiveIndex(i)}
                className="px-4 py-3 cursor-pointer"
                style={{
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  background: isActive ? 'var(--surface)' : 'transparent',
                }}
              >
                <div
                  className="text-sm mb-0.5"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  <Highlight text={note.title || 'Untitled'} query={query} />
                </div>
                {snippet && (
                  <div
                    className="text-xs leading-relaxed"
                    style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}
                  >
                    <Highlight text={snippet} query={query} />
                  </div>
                )}
              </div>
            )
          })}

          {query.trim() && filtered.length === 0 && (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}
            >
              No notes matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div
            className="flex items-center gap-4 px-4 py-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {['↑↓ Navigate', '↵ Open', 'Esc Close'].map(hint => (
              <span
                key={hint}
                style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-tertiary)' }}
              >
                {hint}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
