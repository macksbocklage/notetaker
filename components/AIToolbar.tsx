'use client'
import { useEffect, useState } from 'react'
import { AIMode } from '@/types'
import { useAIStream } from '@/hooks/useAIStream'

interface AIToolbarProps {
  rect: DOMRect | null
  selectedText: string
  inReview: boolean
  onApply: (text: string, mode: AIMode) => void
  onAccept: () => void
  onReject: () => void
  onDismiss: () => void
}

const QUICK_ACTIONS: { label: string; mode: AIMode }[] = [
  { label: 'Explain', mode: 'explain' },
  { label: 'Analyze', mode: 'analyze' },
  { label: 'Rewrite', mode: 'rewrite' },
]

type Phase = 'idle' | 'loading' | 'review'

export default function AIToolbar({
  rect,
  selectedText,
  inReview,
  onApply,
  onAccept,
  onReject,
  onDismiss,
}: AIToolbarProps) {
  const { stream, reset } = useAIStream()
  const [phase, setPhase] = useState<Phase>(inReview ? 'review' : 'idle')
  const [activeMode, setActiveMode] = useState<AIMode | null>(null)

  useEffect(() => {
    if (inReview) setPhase('review')
  }, [inReview])

  const position = rect
    ? { top: rect.top - 50 - 8, left: rect.left + rect.width / 2 }
    : null

  const handleAction = async (mode: AIMode) => {
    setActiveMode(mode)
    setPhase('loading')
    const result = await stream({ mode, selectedText })
    if (result) {
      onApply(result, mode)
      setPhase('review')
    } else {
      setPhase('idle')
    }
  }

  const handleAccept = () => {
    onAccept()
    reset()
    setPhase('idle')
  }

  const handleReject = () => {
    onReject()
    reset()
    setPhase('idle')
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'review') handleReject()
        else { onDismiss(); reset(); setPhase('idle') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (!position) return null

  return (
    // Outer div: handles centering position only
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      {/* Inner div: animates in */}
      <div
        className="toolbar-animate overflow-hidden"
        style={{
          background: 'rgba(250, 249, 245, 0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(221, 217, 207, 0.9)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(28, 26, 23, 0.1), 0 1px 4px rgba(28, 26, 23, 0.06)',
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.nativeEvent.stopImmediatePropagation()
        }}
      >
        {phase === 'idle' && (
          <div className="flex items-center" style={{ padding: '5px 6px' }}>
            <span
              style={{
                color: 'var(--accent)',
                padding: '0 8px',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              ✦
            </span>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.mode}
                onClick={() => handleAction(action.mode)}
                className="toolbar-btn"
                style={{
                  padding: '6px 11px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 450,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex items-center gap-2.5" style={{ padding: '10px 16px' }}>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{
                border: '1.5px solid var(--border)',
                borderTopColor: 'var(--accent)',
              }}
            />
            <span
              className="text-sm capitalize"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}
            >
              {activeMode ?? 'Generating'}…
            </span>
          </div>
        )}

        {phase === 'review' && (
          <div className="flex items-center" style={{ padding: '5px 6px' }}>
            <span
              className="text-xs capitalize"
              style={{
                color: 'var(--text-tertiary)',
                padding: '0 8px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
              }}
            >
              {activeMode ?? 'AI'}
            </span>
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: '6px 11px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                color: '#166534',
                background: '#E7F4E8',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#CCE8CE'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#E7F4E8'}
            >
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,4.5 4,7.5 10,1.5" />
              </svg>
              Accept
            </button>
            <div style={{ width: 4 }} />
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: '6px 11px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                color: '#991B1B',
                background: '#FFF0F0',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFDDD8'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#FFF0F0'}
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
