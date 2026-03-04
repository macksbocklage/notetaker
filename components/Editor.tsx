'use client'
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Mark, mergeAttributes } from '@tiptap/core'
import { forwardRef, useImperativeHandle } from 'react'
import { SelectionState, AIMode } from '@/types'
import { marked } from 'marked'

// ── Formatting toolbar ────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
}

function FBtn({ active, onPress, title, children }: {
  active?: boolean
  onPress: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onPress() }}
      title={title}
      style={{
        height: 24, minWidth: 24, padding: '0 5px',
        borderRadius: 5, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 12,
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        transition: 'background 0.1s ease, color 0.1s ease',
      }}
    >
      {children}
    </button>
  )
}

function StatusBar({ editor }: { editor: TiptapEditor | null }) {
  if (!editor) return null
  const text = editor.getText().trim()
  const words = text ? text.split(/\s+/).length : 0
  const mins = Math.ceil(words / 225)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '5px 16px', borderTop: '1px solid var(--border)',
      flexShrink: 0, background: 'var(--bg)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
        {words === 0 ? 'No words yet' : `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`}
      </span>
      {words > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
          {mins < 1 ? '<1' : mins} min read
        </span>
      )}
    </div>
  )
}

function FormatBar({ editor }: { editor: TiptapEditor | null }) {
  if (!editor) return null
  const chain = () => editor.chain().focus()
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 1,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg)',
      }}
    >
      <FBtn active={editor.isActive('heading', { level: 1 })} onPress={() => chain().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>H1</span>
      </FBtn>
      <FBtn active={editor.isActive('heading', { level: 2 })} onPress={() => chain().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>H2</span>
      </FBtn>
      <FBtn active={editor.isActive('heading', { level: 3 })} onPress={() => chain().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '-0.01em' }}>H3</span>
      </FBtn>

      <Divider />

      <FBtn active={editor.isActive('bold')} onPress={() => chain().toggleBold().run()} title="Bold (⌘B)">
        <span style={{ fontWeight: 700 }}>B</span>
      </FBtn>
      <FBtn active={editor.isActive('italic')} onPress={() => chain().toggleItalic().run()} title="Italic (⌘I)">
        <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>I</span>
      </FBtn>
      <FBtn active={editor.isActive('code')} onPress={() => chain().toggleCode().run()} title="Inline code">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 3 1 6.5 4 10" /><polyline points="9 3 12 6.5 9 10" />
        </svg>
      </FBtn>

      <Divider />

      <FBtn active={editor.isActive('blockquote')} onPress={() => chain().toggleBlockquote().run()} title="Blockquote">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="1" y1="3" x2="1" y2="10" /><line x1="4" y1="3" x2="12" y2="3" /><line x1="4" y1="6.5" x2="10" y2="6.5" /><line x1="4" y1="10" x2="11" y2="10" />
        </svg>
      </FBtn>
      <FBtn active={editor.isActive('bulletList')} onPress={() => chain().toggleBulletList().run()} title="Bullet list">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="2" cy="3.5" r="0.8" fill="currentColor" stroke="none" /><line x1="5" y1="3.5" x2="12" y2="3.5" />
          <circle cx="2" cy="6.5" r="0.8" fill="currentColor" stroke="none" /><line x1="5" y1="6.5" x2="12" y2="6.5" />
          <circle cx="2" cy="9.5" r="0.8" fill="currentColor" stroke="none" /><line x1="5" y1="9.5" x2="12" y2="9.5" />
        </svg>
      </FBtn>
      <FBtn active={editor.isActive('orderedList')} onPress={() => chain().toggleOrderedList().run()} title="Ordered list">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" stroke="none">
          <rect x="0" y="2.5" width="3" height="1.2" rx="0.5" /><rect x="0" y="6" width="3" height="1.2" rx="0.5" /><rect x="0" y="9.5" width="3" height="1.2" rx="0.5" />
          <rect x="5" y="2.5" width="7" height="1.2" rx="0.5" /><rect x="5" y="6" width="7" height="1.2" rx="0.5" /><rect x="5" y="9.5" width="7" height="1.2" rx="0.5" />
        </svg>
      </FBtn>
    </div>
  )
}

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
      <div className="h-full flex flex-col">
        <FormatBar editor={editor} />
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="min-h-full" />
        </div>
        <StatusBar editor={editor} />
      </div>
    )
  }
)

Editor.displayName = 'Editor'
export default Editor
