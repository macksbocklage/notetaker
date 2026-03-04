'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { forwardRef, useImperativeHandle } from 'react'
import { SelectionState } from '@/types'
import { marked } from 'marked'

export interface EditorHandle {
  insertAtCursor: (markdown: string) => void
  replaceSelection: (markdown: string) => void
  focus: () => void
  getText: () => string
}

interface EditorProps {
  initialContent: string  // HTML (or legacy markdown, auto-detected)
  onChange: (html: string) => void
  onSelectionChange?: (selection: SelectionState) => void
}

// Legacy notes were stored as markdown — detect and convert
function toHTML(content: string): string {
  if (!content?.trim()) return ''
  if (content.trimStart().startsWith('<')) return content
  return marked.parse(content) as string
}

const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ initialContent, onChange, onSelectionChange }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Start writing…' }),
      ],
      content: toHTML(initialContent),
      onUpdate({ editor }) {
        onChange(editor.getHTML())
      },
      onSelectionUpdate({ editor }) {
        if (!onSelectionChange) return
        const { from, to } = editor.state.selection

        if (from === to) {
          onSelectionChange({ text: '', rect: null })
          return
        }

        const text = editor.state.doc.textBetween(from, to, ' ')
        if (!text.trim()) {
          onSelectionChange({ text: '', rect: null })
          return
        }

        const fromCoords = editor.view.coordsAtPos(from)
        const toCoords = editor.view.coordsAtPos(to)
        if (!fromCoords || !toCoords) {
          onSelectionChange({ text, rect: null })
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

        onSelectionChange({ text, rect })
      },
      editorProps: {
        attributes: {
          class: 'prose prose-neutral prose-lg max-w-none focus:outline-none px-12 py-10 min-h-full',
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
