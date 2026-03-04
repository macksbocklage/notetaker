'use client'
import { useState, useRef, useEffect } from 'react'
import { useAIStream } from '@/hooks/useAIStream'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface AISidebarProps {
  open: boolean
  onClose: () => void
  documentContent: string
  onInsert: (text: string) => void
}

export default function AISidebar({ open, onClose, documentContent, onInsert }: AISidebarProps) {
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const { stream, streaming, streamedText, reset } = useAIStream()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamedText, history])

  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  const handleSubmit = async () => {
    if (!prompt.trim() || streaming) return
    const userMessage = prompt.trim()
    setPrompt('')
    setHistory(prev => [...prev, { role: 'user', text: userMessage }])
    reset()

    const result = await stream({
      mode: 'custom',
      prompt: userMessage,
      context: documentContent.slice(0, 3000),
    })

    if (result) {
      setHistory(prev => [...prev, { role: 'ai', text: result }])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSend = prompt.trim().length > 0 && !streaming

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: 'rgba(28, 26, 23, 0.15)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-40 flex flex-col"
        style={{
          width: '380px',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 40px rgba(28, 26, 23, 0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: open
            ? 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 0.22s cubic-bezier(0.4, 0, 0.6, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)', fontSize: '15px', lineHeight: 1 }}>✦</span>
            <div>
              <h2
                className="text-sm font-semibold leading-none"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
              >
                AI Assistant
              </h2>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
              >
                Ask about your document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="10" y2="10" />
              <line x1="10" y1="1" x2="1" y2="10" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {history.length === 0 && !streaming && (
            <div
              className="text-center mt-10"
              style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
            >
              <div style={{ fontSize: '22px', color: 'var(--accent)', opacity: 0.5, marginBottom: '12px' }}>✦</div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Ask me to generate, summarize,<br />or refine ideas.
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
                ⌘↵ to send
              </p>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                style={{
                  maxWidth: '88%',
                  borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-sans)',
                  ...(msg.role === 'user'
                    ? { background: '#2D2118', color: '#F5F1EA' }
                    : {
                        background: 'var(--bg-sidebar)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }
                  ),
                }}
              >
                {msg.role === 'ai' ? (
                  <div>
                    <pre className="whitespace-pre-wrap" style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>
                      {msg.text}
                    </pre>
                    <button
                      onClick={() => onInsert(msg.text)}
                      className="mt-2.5 text-xs cursor-pointer"
                      style={{
                        color: 'var(--accent)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textDecoration: 'underline',
                        textDecorationColor: 'rgba(155, 107, 26, 0.35)',
                        textUnderlineOffset: '2px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Insert into document
                    </button>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex justify-start">
              <div
                style={{
                  maxWidth: '88%',
                  borderRadius: '14px 14px 14px 3px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-sans)',
                  background: 'var(--bg-sidebar)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <pre className="whitespace-pre-wrap" style={{ fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {streamedText || (
                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Thinking…</span>
                  )}
                </pre>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '8px 8px 8px 14px',
            }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to write, expand, or transform..."
              rows={2}
              className="flex-1 resize-none outline-none leading-relaxed"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13.5px',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: canSend ? '#2D2118' : 'var(--surface)',
                color: canSend ? '#F5F1EA' : 'var(--text-tertiary)',
                border: 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
            >
              {streaming ? (
                <span
                  className="inline-block w-3 h-3 rounded-full animate-spin"
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    borderTopColor: 'rgba(255,255,255,0.8)',
                  }}
                />
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="11" x2="6" y2="1" />
                  <polyline points="2,5 6,1 10,5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
