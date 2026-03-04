import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { AIRequest } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function buildPrompt(request: AIRequest): string {
  const { mode, selectedText, prompt, context } = request

  switch (mode) {
    case 'explain':
      return `You are a helpful writing assistant. The user has selected the following text from their document:\n\n"${selectedText}"\n\nPlease explain this text clearly and concisely. If it contains technical terms, define them. Respond in markdown.`

    case 'analyze':
      return `You are a helpful writing assistant. The user has selected the following text:\n\n"${selectedText}"\n\nAnalyze this text. Comment on tone, clarity, structure, and any improvements you'd suggest. Respond in markdown.`

    case 'rewrite':
      return `You are a helpful writing assistant. The user has selected the following text:\n\n"${selectedText}"\n\nRewrite this text to be clearer and more concise while preserving the original meaning. Return ONLY the rewritten text as plain prose — no markdown, no asterisks, no bullet points, no explanations. Just the improved sentence or paragraph.`

    case 'expand':
      return `You are a helpful writing assistant. The user has the following document context:\n\n${context ?? ''}\n\nUser prompt: ${prompt}\n\nGenerate well-written markdown content that fits naturally into this document. Return only the content, no preamble.`

    case 'custom':
      return `You are a helpful writing assistant embedded in a markdown notes editor.\n\nDocument context:\n${context ?? '(empty document)'}\n\nUser request: ${prompt}\n\nRespond with a single-sentence summary (in markdown) that captures the core idea of your answer in under 20 words, with no labels or introductory phrases. After the summary, provide a concise, practical, and well‑structured markdown response that directly addresses the user’s request. Never use complcated language or jargon. Never use any phrases like "Summary".`

    default:
      return prompt ?? ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRequest = await req.json()
    const userPrompt = buildPrompt(body)

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      stream: true,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(new TextEncoder().encode(text))
          }
        }
        controller.close()
      },
      cancel() {
        stream.controller.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('AI route error:', error)
    return new Response(JSON.stringify({ error: 'AI generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
