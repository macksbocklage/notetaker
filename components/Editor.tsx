'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Mark, mergeAttributes } from '@tiptap/core'
import { forwardRef, useImperativeHandle } from 'react'
import { SelectionState, AIMode } from '@/types'
import { marked } from 'marked'

export interface EditorHandle {
  insertAtCursor: (markdown: string) => void
  replaceSelection: (markdown: string) => void
  applyDiff: (from: number, to: number, text: string, mode: AIMode) => void
  acceptDiff: () => void
  rejectDiff: () => void
  focus: () => void
  getText: () => string
}

interface EditorProps {
  initialContent: string
  onChange: (html: string) => void
  onSelectionChange?: (selection: SelectionState) => void
}

// Transient marks for AI diff — not persisted (no parseHTML)
const AIDeletion = Mark.create({
  name: 'aiDeletion',
  parseHTML() { return [] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'ai-deletion' }), 0]
  },
})

const AIInsertion = Mark.create({
  name: 'aiInsertion',
  parseHTML() { return [] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'ai-insertion' }), 0]
  },
})

function toHTML(content: string): string {
  if (!content?.trim()) return ''
  if (content.trimStart().startsWith('<')) return content
  return marked.parse(content) as string
}

// Scan the document for all contiguous ranges bearing a given mark
function getRangesForMark(
  editor: ReturnType<typeof useEditor>,
  markName: string
): Array<{ from: number; to: number }> {
  if (!editor) return []
  const { doc, schema } = editor.state
  const markType = schema.marks[markName]
  if (!markType) return []

  const ranges: Array<{ from: number; to: number }> = []
  let start: number | null = null
  let end: number | null = null

  doc.descendants((node, pos) => {
    if (!node.isText) return
    const hasMark = node.marks.some(m => m.type === markType)
    if (hasMark) {
      if (start === null) start = pos
      end = pos + node.nodeSize
    } else {
      if (start !== null && end !== null) {
        ranges.push({ from: start, to: end })
        start = null
        end = null
      }
    }
  })
  if (start !== null && end !== null) ranges.push({ from: start, to: end })
  return ranges
}

const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ initialContent, onChange, onSelectionChange }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Start writing…' }),
        AIDeletion,
        AIInsertion,
      ],
      content: toHTML(initialContent),
      onUpdate({ editor }) {
        onChange(editor.getHTML())
      },
      onSelectionUpdate({ editor }) {
        if (!onSelectionChange) return
        const { from, to } = editor.state.selection

        if (from === to) {
          onSelectionChange({ text: '', rect: null, from: 0, to: 0 })
          return
        }

        const text = editor.state.doc.textBetween(from, to, ' ')
        if (!text.trim()) {
          onSelectionChange({ text: '', rect: null, from: 0, to: 0 })
          return
        }

        const fromCoords = editor.view.coordsAtPos(from)
        const toCoords = editor.view.coordsAtPos(to)
        if (!fromCoords || !toCoords) {
          onSelectionChange({ text, rect: null, from, to })
          return
        }

        const top = Math.min(fromCoords.top, toCoords.top)
        const bottom = Math.max(fromCoords.bottom, toCoords.bottom)
        const rect = {
          top, bottom,
          left: fromCoords.left,
          right: toCoords.right,
          width: toCoords.right - fromCoords.left,
          height: bottom - top,
          x: fromCoords.left,
          y: top,
          toJSON: () => ({}),
        } as DOMRect

        onSelectionChange({ text, rect, from, to })
      },
      editorProps: {
        attributes: {
          class: 'prose prose-neutral prose-lg max-w-3xl mx-auto focus:outline-none px-12 py-12 min-h-full',
        },
      },
      immediatelyRender: false,
    })

    useImperativeHandle(ref, () => ({
      insertAtCursor(markdown: string) {
        if (!editor) return
        const html = marked.parse(markdown) as string
        const { to } = editor.state.selection
        editor.chain().focus().setTextSelection(to).insertContent(html).run()
      },

      replaceSelection(markdown: string) {
        if (!editor) return
        const html = marked.parse(markdown) as string
        editor.chain().focus().insertContent(html).run()
      },

      applyDiff(from: number, to: number, text: string, mode: AIMode) {
        if (!editor) return

        if (mode === 'rewrite') {
          // Mark original text as deleted
          editor.chain()
            .setTextSelection({ from, to })
            .setMark('aiDeletion')
            .run()

          // Insert new text immediately after with insertion mark
          editor.chain()
            .setTextSelection(to)
            .insertContent({
              type: 'text',
              text: text.trim(),
              marks: [{ type: 'aiInsertion' }],
            })
            .run()
        } else {
          // explain/analyze: insert block content after selection, no diff marks
          const html = marked.parse(text) as string
          editor.chain().setTextSelection(to).insertContent(html).run()
        }
      },

      acceptDiff() {
        if (!editor) return
        const deletions = getRangesForMark(editor, 'aiDeletion')
        const insertions = getRangesForMark(editor, 'aiInsertion')
        if (deletions.length === 0 && insertions.length === 0) return

        const chain = editor.chain()
        // 1. Unset insertion marks (keep text, no position shift)
        insertions.forEach(r =>
          chain.setTextSelection({ from: r.from, to: r.to }).unsetMark('aiInsertion')
        )
        // 2. Delete deletion text (reverse order — though typically just one range)
        deletions.slice().reverse().forEach(r =>
          chain.setTextSelection({ from: r.from, to: r.to }).deleteSelection()
        )
        chain.run()
      },

      rejectDiff() {
        if (!editor) return
        const deletions = getRangesForMark(editor, 'aiDeletion')
        const insertions = getRangesForMark(editor, 'aiInsertion')

        if (deletions.length === 0 && insertions.length === 0) {
          // explain/analyze mode — undo the block insertion
          editor.commands.undo()
          return
        }

        const chain = editor.chain()
        // 1. Delete insertion text (higher pos — doesn't affect deletion positions)
        insertions.slice().reverse().forEach(r =>
          chain.setTextSelection({ from: r.from, to: r.to }).deleteSelection()
        )
        // 2. Unset deletion marks (keep original text)
        deletions.forEach(r =>
          chain.setTextSelection({ from: r.from, to: r.to }).unsetMark('aiDeletion')
        )
        chain.run()
      },

      focus() {
        editor?.commands.focus()
      },

      getText() {
        return editor?.getText() ?? ''
      },
    }), [editor])

    return (
      <div className="h-full overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    )
  }
)

Editor.displayName = 'Editor'
export default Editor
