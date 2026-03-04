'use client'
import { useEffect, useRef, useState } from 'react'
import { SelectionState, AIMode } from '@/types'
import { useAIStream } from '@/hooks/useAIStream'

interface AIToolbarProps {
  selection: SelectionState
  onInsert: (text: string, mode: 'replace' | 'after') => void
  onDismiss: () => void
}

const QUICK_ACTIONS: { label: string; mode: AIMode; icon: string }[] = [
  { label: 'Explain', mode: 'explain', icon: '?' },
  { label: 'Analyze', mode: 'analyze', icon: '~' },
  { label: 'Rewrite', mode: 'rewrite', icon: '↺' },
]

type Phase = 'idle' | 'streaming' | 'done'

export default function AIToolbar({ selection, onInsert, onDismiss }: AIToolbarProps) {
  const { stream, streaming, streamedText, error, reset } = useAIStream()
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeMode, setActiveMode] = useState<AIMode | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const { text, rect } = selection

  // coordsAtPos returns viewport-relative coords — use directly with position:fixed (no scrollY needed)
  const position = rect
    ? {
        top: rect.top - (phase !== 'idle' ? 220 : 50) - 8,
        left: rect.left + rect.width / 2,
      }
    : null

  const handleAction = async (mode: AIMode) => {
    setActiveMode(mode)
    setPhase('streaming')
    const result = await stream({ mode, selectedText: text })
    setPhase(result ? 'done' : 'idle')
  }

  const handleInsert = (insertMode: 'replace' | 'after') => {
    onInsert(streamedText, insertMode)
    onDismiss()
    reset()
    setPhase('idle')
  }

  const handleDiscard = () => {
    reset()
    setPhase('idle')
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
        reset()
        setPhase('idle')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss, reset])

  if (!rect || !text || !position) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => {
        e.preventDefault() // keep editor selection alive
        e.nativeEvent.stopImmediatePropagation() // prevent document listeners from clearing selection
      }}
    >
      {phase === 'idle' && (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <span className="text-xs text-gray-400 px-2 font-medium">AI</span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.mode}
              onClick={() => handleAction(action.mode)}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium cursor-pointer"
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}

      {(phase === 'streaming' || phase === 'done') && (
        <div className="w-80 max-h-60 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {activeMode}
              {streaming && <span className="animate-pulse"> ...</span>}
            </span>
            <button
              onClick={() => { onDismiss(); reset(); setPhase('idle') }}
              className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="p-3 text-sm text-gray-700 overflow-y-auto flex-1 whitespace-pre-wrap font-mono leading-relaxed">
            {streamedText || <span className="text-gray-400 animate-pulse">Generating…</span>}
            {error && <span className="text-red-500">{error}</span>}
          </div>
          {phase === 'done' && (
            <div className="flex gap-2 p-2 border-t border-gray-100 bg-gray-50">
              {activeMode === 'rewrite' && (
                <button
                  onClick={() => handleInsert('replace')}
                  className="flex-1 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Replace
                </button>
              )}
              <button
                onClick={() => handleInsert('after')}
                className="flex-1 px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Insert After
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
