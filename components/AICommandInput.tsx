'use client'
import { useState, useEffect, useRef } from 'react'
import { AIMode } from '@/types'

interface Props {
  position: { top: number; left: number } | null
  context: { text: string; from: number; to: number } | null
  inReview: boolean
  activeMode: AIMode | null
  // Returns true if a diff was applied (→ transition to review), false if inserted/failed (→ dismiss)
  onSubmit: (prompt: string, mode?: AIMode) => Promise<boolean>
  onAccept: () => void
  onReject: () => void
  onDismiss: () => void
}

type Phase = 'input' | 'loading' | 'review'

const PRESETS: { label: string; mode: AIMode }[] = [
  { label: 'Rewrite', mode: 'rewrite' },
  { label: 'Shorter', mode: 'shorter' },
  { label: 'Longer', mode: 'longer' },
]

export default function AICommandInput({
  position, context, inReview, activeMode,
  onSubmit, onAccept, onReject, onDismiss,
}: Props) {
  const [phase, setPhase] = useState<Phase>(inReview ? 'review' : 'input')
  const [prompt, setPrompt] = useState('')
  const [pendingMode, setPendingMode] = useState<AIMode | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync to review state if opened while a diff is already active
  useEffect(() => {
    if (inReview) setPhase('review')
  }, [inReview])

  // Autofocus when input phase is shown
  useEffect(() => {
    if (phase === 'input') {
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [phase])

  // Reset when closed externally
  useEffect(() => {
    if (!position) {
      setPhase('input')
      setPrompt('')
      setPendingMode(null)
    }
  }, [position])

  const handleSubmit = async (p: string, mode?: AIMode) => {
    if (!p.trim() && !mode) return
    setPendingMode(mode ?? null)
    setPhase('loading')
    const showReview = await onSubmit(p, mode)
    // Transition immediately based on return value — no extra render cycle
    if (showReview) {
      setPhase('review')
    } else {
      onDismiss()
    }
  }

  const handleAccept = () => {
    onAccept()
    onDismiss()
  }

  const handleReject = () => {
    onReject()
    onDismiss()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'review') handleReject()
        else onDismiss()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!position) return null

  const displayMode = activeMode ?? pendingMode

  return (
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      <div
        className="toolbar-animate"
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.2)',
          minWidth: '300px',
          overflow: 'hidden',
        }}
        onMouseDown={e => { e.preventDefault(); e.nativeEvent.stopImmediatePropagation() }}
      >
        {phase === 'input' && (
          <>
            <div className="flex items-center gap-2" style={{ padding: '10px 12px 8px' }}>
              <span style={{ fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>✦</span>
              <input
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleSubmit(prompt) }
                  if (e.key === 'Escape') { e.preventDefault(); onDismiss() }
                }}
                placeholder={context ? 'Ask AI about selection…' : 'Ask AI anything…'}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-primary)',
                }}
              />
              <kbd style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-tertiary)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 6px', flexShrink: 0,
              }}>↵</kbd>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div className="flex items-center gap-1" style={{ padding: '6px 10px' }}>
              {PRESETS.map(preset => (
                <button
                  key={preset.mode}
                  onMouseDown={e => { e.preventDefault(); handleSubmit('', preset.mode) }}
                  style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 450,
                    color: 'var(--text-secondary)', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '3px 10px', cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'loading' && (
          <div className="flex items-center gap-2.5" style={{ padding: '10px 16px' }}>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{ border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)', flexShrink: 0 }}
            />
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: 'var(--text-secondary)', textTransform: 'capitalize',
            }}>
              {pendingMode ?? 'Generating'}…
            </span>
          </div>
        )}

        {phase === 'review' && (
          <div className="flex items-center" style={{ padding: '5px 6px' }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)',
              padding: '0 8px', fontWeight: 500, textTransform: 'capitalize',
            }}>
              {displayMode ?? 'AI'}
            </span>
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 11px', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500,
                color: 'var(--text-primary)', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
            >
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,4.5 4,7.5 10,1.5" />
              </svg>
              Accept
            </button>
            <div style={{ width: 4 }} />
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 11px', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500,
                color: 'var(--text-secondary)', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="1" y1="1" x2="8" y2="8" />
                <line x1="8" y1="1" x2="1" y2="8" />
              </svg>
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
