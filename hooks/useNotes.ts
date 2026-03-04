import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Note } from '@/types'

function rowToNote(row: { id: string; title: string; content: string; created_at: string; updated_at: string }): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient())

  useEffect(() => {
    if (!userId) return

    const client = supabase.current
    client
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { console.error(error); return }

        if (!data || data.length === 0) {
          const { data: created } = await client
            .from('notes')
            .insert({ user_id: userId, title: 'Untitled', content: '' })
            .select()
            .single()
          if (created) {
            const note = rowToNote(created)
            setNotes([note])
            setActiveId(note.id)
          }
        } else {
          setNotes(data.map(rowToNote))
          setActiveId(data[0].id)
        }
        setLoading(false)
      })
  }, [userId])

  const createNote = useCallback(async () => {
    const client = supabase.current
    // Use a client-generated UUID so the optimistic ID and DB ID are identical —
    // no second setActiveId call, no double editor remount.
    const id = crypto.randomUUID()
    const now = Date.now()
    setNotes(prev => [{ id, title: 'Untitled', content: '', createdAt: now, updatedAt: now }, ...prev])
    setActiveId(id)

    const { error } = await client
      .from('notes')
      .insert({ id, user_id: userId, title: 'Untitled', content: '' })

    if (error) console.error(error)
  }, [userId])

  const updateNote = useCallback((id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => {
    setNotes(prev =>
      prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    )
    supabase.current
      .from('notes')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) console.error(error) })
  }, [userId])

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      if (next.length === 0) return prev // will be handled after async
      if (activeId === id) setActiveId(next[0].id)
      return next
    })

    await supabase.current.from('notes').delete().eq('id', id).eq('user_id', userId)

    // If we deleted the last note, create a new one
    setNotes(prev => {
      if (prev.length === 0 || (prev.length === 1 && prev[0].id === id)) {
        createNote()
        return prev
      }
      return prev
    })
  }, [userId, activeId, createNote])

  return { notes, activeId, setActiveId, loading, createNote, updateNote, deleteNote }
}
