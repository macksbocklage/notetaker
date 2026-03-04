'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account.')
    }

    setLoading(false)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="mb-8 text-center">
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            Notetaker
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create an account'}
          </p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 mb-4 cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)', fontSize: '12px' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="rounded-lg px-3 py-2.5 outline-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="rounded-lg px-3 py-2.5 outline-none"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />

          {error && (
            <p style={{ fontFamily: 'var(--font-sans)', color: '#DC2626', fontSize: '13px' }}>{error}</p>
          )}
          {success && (
            <p style={{ fontFamily: 'var(--font-sans)', color: '#16A34A', fontSize: '13px' }}>{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2.5 cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
            }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p
          className="mt-5 text-center"
          style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-tertiary)', fontSize: '13px' }}
        >
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null) }}
            className="cursor-pointer underline"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
