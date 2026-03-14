'use client'
import { useEffect, useRef, useState } from 'react'
import type { AIMode } from '@/types'

export interface SlashCommand {
  id: string
  label: string
  description: string
  mode: AIMode
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'improve',   label: 'Improve',   description: 'Improve writing quality',          mode: 'improve'   },
  { id: 'rewrite',   label: 'Rewrite',   description: 'Rewrite more clearly',             mode: 'rewrite'   },
  { id: 'shorter',   label: 'Shorter',   description: 'Make more concise',                mode: 'shorter'   },
  { id: 'longer',    label: 'Longer',    description: 'Expand and elaborate',             mode: 'longer'    },
  { id: 'summarize', label: 'Summarize', description: 'Summarize as a single sentence',   mode: 'summarize' },
]

interface Props {
  query: string
  coords: { left: number; top: number; bottom: number }
  onSelect: (command: SlashCommand) => void
  onDismiss: () => void
}

export default function SlashCommandMenu({ query, coords, onSelect, onDismiss }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const q = query.toLowerCase()
  const filtered = SLASH_COMMANDS.filter(c =>
    !q || c.id.startsWith(q) || c.label.toLowerCase().startsWith(q)
  )

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.children[activeIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!filtered.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation()
        if (filtered[activeIndex]) onSelect(filtered[activeIndex])
      } else if (e.key === 'Escape') {
        e.stopPropagation()
        onDismiss()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [filtered, activeIndex, onSelect, onDismiss])

  if (!filtered.length) return null

  const menuHeight = filtered.length * 56 + 16
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const spaceBelow = viewportHeight - coords.bottom - 8
  const top = spaceBelow >= menuHeight ? coords.bottom + 4 : coords.top - menuHeight - 4

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left: coords.left,
        zIndex: 60,
        width: 264,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        animation: 'toolbar-appear 0.14s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      <div style={{ padding: '6px' }} ref={listRef}>
        {filtered.map((cmd, i) => (
          <div
            key={cmd.id}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setActiveIndex(i)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: i === activeIndex ? 'var(--surface)' : 'transparent',
              transition: 'background 0.1s',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
              ✦
            </span>
            <div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500, color: 'var(--text-primary)' }}>
                {cmd.label}
              </div>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 1 }}>
                {cmd.description}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 10px 6px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10.5, fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)' }}>
          ↑↓ navigate · ↵ select · Esc dismiss
        </span>
      </div>
    </div>
  )
}
