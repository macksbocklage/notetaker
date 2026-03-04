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

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={onClose} />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ask anything about your document</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {history.length === 0 && !streaming && (
            <div className="text-center text-gray-400 text-sm mt-8 space-y-2">
              <div className="text-2xl">✦</div>
              <p>Ask me to generate content,<br />summarize, or help with ideas.</p>
              <div className="text-xs text-gray-300 mt-3">Tip: ⌘+Enter to submit</div>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'ai' ? (
                  <div>
                    <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                    <button
                      onClick={() => onInsert(msg.text)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
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
            <div className="flex gap-3 justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-gray-100 text-gray-800 leading-relaxed">
                <pre className="whitespace-pre-wrap font-sans">
                  {streamedText || <span className="animate-pulse text-gray-400">Thinking…</span>}
                </pre>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2 items-end bg-gray-50 rounded-xl border border-gray-200 p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to write, expand, or transform..."
              rows={3}
              className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 outline-none leading-relaxed"
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || streaming}
              className="px-3 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            >
              {streaming ? '…' : '↑'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
