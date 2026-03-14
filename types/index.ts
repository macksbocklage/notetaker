export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export type AIMode = 'explain' | 'analyze' | 'rewrite' | 'expand' | 'custom' | 'improve' | 'summarize' | 'shorter' | 'longer'

export interface AIRequest {
  mode: AIMode
  selectedText?: string
  prompt?: string
  context?: string
}

export interface SelectionState {
  text: string
  rect: DOMRect | null
  from: number   // ProseMirror doc position
  to: number
}
