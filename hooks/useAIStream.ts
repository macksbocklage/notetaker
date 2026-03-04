'use client'
import { useState, useCallback } from 'react'
import { AIRequest } from '@/types'

export function useAIStream() {
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stream = useCallback(async (request: AIRequest): Promise<string> => {
    setStreaming(true)
    setStreamedText('')
    setError(null)

    let accumulated = ''

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamedText(prev => prev + chunk)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
    } finally {
      setStreaming(false)
    }

    return accumulated
  }, [])

  const reset = useCallback(() => {
    setStreamedText('')
    setError(null)
  }, [])

  return { stream, streaming, streamedText, error, reset }
}
