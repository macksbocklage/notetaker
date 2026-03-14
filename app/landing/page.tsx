'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Injected styles (animations + utility classes)
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
  @keyframes fadeUp   { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes spin     { to   { transform: rotate(360deg) } }
  @keyframes blink    { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
  @keyframes stream   { from { width: 0 } to { width: 100% } }
  @keyframes pulse-glow { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }
  @keyframes float    { 0%,100% { transform: translateY(0px) } 50% { transform: translateY(-6px) } }
  @keyframes marquee  { from { transform: translateX(0) } to { transform: translateX(-50%) } }

  .land-nav-link  { color: #8C8C93; text-decoration: none; font-size: 14px; transition: color 0.15s ease; font-family: var(--font-sans); }
  .land-nav-link:hover { color: #E7E7E9; }

  .land-btn-primary {
    background: #5E6AD2; color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer;
    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    display: inline-flex; align-items: center; gap: 7px;
    text-decoration: none; font-family: var(--font-sans); letter-spacing: -0.01em;
  }
  .land-btn-primary:hover { background: #6E7AE0; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(94,106,210,0.35); }

  .land-btn-ghost {
    color: #8C8C93; font-size: 14px; text-decoration: none;
    font-family: var(--font-sans); transition: color 0.15s; cursor: pointer;
    background: none; border: none; padding: 0;
  }
  .land-btn-ghost:hover { color: #E7E7E9; }

  .land-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.65s ease, transform 0.65s ease; }
  .land-reveal.visible { opacity: 1; transform: translateY(0); }

  .land-feature-card {
    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.055);
    border-radius: 14px; padding: 28px 28px 32px; transition: border-color 0.2s, background 0.2s;
  }
  .land-feature-card:hover { border-color: rgba(94,106,210,0.25); background: rgba(94,106,210,0.03); }

  .land-kbd {
    display: inline-flex; align-items: center;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 5px; padding: 2px 7px; font-size: 12px;
    font-family: var(--font-sans); color: #8C8C93;
  }

  .land-mockup { animation: float 5s ease-in-out infinite; }

  .mockup-shadow {
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.06),
      0 20px 60px rgba(0,0,0,0.7),
      0 40px 100px rgba(0,0,0,0.5),
      0 0 80px rgba(94,106,210,0.08);
  }

  @media (max-width: 768px) {
    .land-nav-links { display: none !important; }
    .land-hero-h1   { font-size: 40px !important; }
    .land-features  { grid-template-columns: 1fr !important; }
    .land-ai-cols   { flex-direction: column !important; }
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// Intersection-observer reveal hook
// ─────────────────────────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.land-reveal')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      background: scrolled ? 'rgba(8,9,10,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px) saturate(150%)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.055)' : '1px solid transparent',
      transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
    }}>
      <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <span style={{ color: '#5E6AD2', fontSize: 16, lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#E7E7E9', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
          Notetaker
        </span>
      </Link>

      <div className="land-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['Features', 'Changelog', 'Pricing'].map(l => (
          <a key={l} href="#" className="land-nav-link">{l}</a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/auth" className="land-btn-ghost">Sign in</Link>
        <Link href="/auth" className="land-btn-primary">
          Get started <Arrow />
        </Link>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero editor mockup
// ─────────────────────────────────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span style={{
      display: 'inline-block', width: 1.5, height: 12,
      background: '#5E6AD2', marginLeft: 1, verticalAlign: 'middle',
      animation: 'blink 1s step-end infinite',
    }} />
  )
}

const STREAMED = 'the onboarding experience should be fundamentally rethought to reduce early drop-off and guide users toward their first meaningful moment.'

function EditorMockup() {
  const [streamed, setStreamed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i < STREAMED.length) {
        setStreamed(STREAMED.slice(0, ++i))
      } else {
        setDone(true)
        clearInterval(t)
      }
    }, 22)
    return () => clearInterval(t)
  }, [])

  const notes = [
    { title: 'Q4 Planning', date: '2m ago', active: true },
    { title: 'Product Ideas', date: '1h ago' },
    { title: 'Research Notes', date: 'Yesterday' },
    { title: 'Sprint Review', date: '2d ago' },
    { title: 'Team Sync', date: '3d ago' },
  ]

  return (
    <div className="land-mockup mockup-shadow" style={{
      borderRadius: 13, overflow: 'hidden',
      background: '#0C0D0F',
      border: '1px solid rgba(255,255,255,0.08)',
      maxWidth: 860, width: '100%', margin: '0 auto',
    }}>
      {/* Chrome */}
      <div style={{
        height: 38, background: '#111214',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 7,
      }}>
        {['#FF5F57','#FEBC2E','#28C840'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.9 }} />
        ))}
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 5,
            padding: '3px 14px', fontSize: 11, color: '#4D4D54',
            fontFamily: 'var(--font-sans)',
          }}>notetaker</div>
        </div>
      </div>

      <div style={{ display: 'flex', height: 400 }}>
        {/* Sidebar */}
        <div style={{
          width: 188, background: '#08090A', flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.055)',
          padding: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#5E6AD2', fontSize: 12 }}>✦</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E7E7E9', fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em' }}>Notetaker</span>
            </div>
          </div>

          <div style={{ fontSize: 10, color: '#4D4D54', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, padding: '0 6px 6px', fontFamily: 'var(--font-sans)' }}>
            Notes
          </div>

          {notes.map(n => (
            <div key={n.title} style={{
              padding: '7px 8px', borderRadius: 7, marginBottom: 1,
              background: n.active ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}>
              <div style={{
                fontSize: 12, fontWeight: n.active ? 500 : 400,
                color: n.active ? '#E7E7E9' : '#8C8C93',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{n.title}</div>
              <div style={{ fontSize: 10, color: '#4D4D54', fontFamily: 'var(--font-sans)', marginTop: 1 }}>{n.date}</div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Format bar */}
          <div style={{
            height: 36, borderBottom: '1px solid rgba(255,255,255,0.055)',
            background: '#08090A', display: 'flex', alignItems: 'center',
            padding: '0 20px', gap: 2,
          }}>
            {['H1','H2','B','I'].map(f => (
              <div key={f} style={{
                width: 24, height: 24, borderRadius: 5, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, color: '#4D4D54', fontFamily: 'var(--font-sans)',
                fontWeight: f === 'B' ? 700 : 400, cursor: 'default',
              }}>{f}</div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '28px 40px', position: 'relative', overflow: 'hidden', background: '#08090A' }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: '#E7E7E9',
              fontFamily: 'var(--font-sans)', marginBottom: 14,
              letterSpacing: '-0.02em', lineHeight: 1.25,
            }}>
              Q4 Planning Session
            </div>

            <div style={{ fontSize: 13, color: '#8C8C93', lineHeight: 1.75, fontFamily: 'var(--font-sans)', marginBottom: 16 }}>
              The team aligned on three core objectives for the quarter. First, we need to address the growing backlog of customer requests that have accumulated over the last two sprints.
            </div>

            {/* AI floating toolbar */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{
                position: 'absolute', top: -38, left: 0,
                background: '#111214', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9, padding: '5px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                fontFamily: 'var(--font-sans)',
              }}>
                <span style={{ color: '#5E6AD2', fontSize: 13 }}>✦</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#E7E7E9' }}>
                  {done ? 'Rewrite' : 'Rewriting…'}
                </span>
                {!done && (
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    border: '1.5px solid rgba(255,255,255,0.08)',
                    borderTopColor: '#5E6AD2',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                  }} />
                )}
                {done && (
                  <div style={{ display: 'flex', gap: 5, marginLeft: 4 }}>
                    {[['✓ Accept', '#5E6AD2', '#fff'], ['✕ Reject', 'transparent', '#8C8C93']].map(([label, bg, color]) => (
                      <button key={String(label)} style={{
                        fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 500,
                        background: String(bg), color: String(color),
                        border: bg === 'transparent' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                      }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deleted text */}
              <div style={{
                fontSize: 13, lineHeight: 1.75, fontFamily: 'var(--font-sans)',
                textDecoration: 'line-through', color: '#4D4D54',
                background: 'rgba(255,60,60,0.05)',
                borderRadius: 3, padding: '1px 4px', display: 'inline',
              }}>
                we need to drastically rethink and overhaul our entire onboarding process
              </div>
            </div>

            {/* Inserted / streaming text */}
            <div style={{
              fontSize: 13, lineHeight: 1.75, fontFamily: 'var(--font-sans)',
              color: '#C8C8D0',
              background: 'rgba(94,106,210,0.1)',
              border: '1px solid rgba(94,106,210,0.2)',
              borderRadius: 4, padding: '2px 6px',
              display: 'inline',
            }}>
              {streamed}{!done && <StreamingCursor />}
            </div>

            {/* Status bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '6px 40px', borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', gap: 16, background: '#08090A',
            }}>
              {['312 words', '2 min read'].map(t => (
                <span key={t} style={{ fontSize: 11, color: '#4D4D54', fontFamily: 'var(--font-sans)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '120px 40px 80px', overflow: 'hidden',
    }}>
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 80%)',
      }} />

      {/* Purple glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 500, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(94,106,210,0.38) 0%, transparent 70%)',
        animation: 'pulse-glow 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 780, width: '100%' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(94,106,210,0.1)', border: '1px solid rgba(94,106,210,0.25)',
          borderRadius: 100, padding: '5px 14px', marginBottom: 40,
          animation: 'fadeUp 0.6s ease both',
        }}>
          <span style={{ fontSize: 13, color: '#5E6AD2', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>✦</span>
          <span style={{ fontSize: 12, color: '#8C8C93', fontFamily: 'var(--font-sans)', letterSpacing: '0.01em' }}>
            Now with streaming AI rewrites
          </span>
        </div>

        {/* Headline */}
        <h1 className="land-hero-h1" style={{
          fontSize: 72, lineHeight: 1.0, fontWeight: 600,
          color: '#E7E7E9', letterSpacing: '-0.04em',
          fontFamily: 'var(--font-sans)',
          marginBottom: 24,
        }}>
          Write at the speed<br />of thought.
        </h1>

        {/* Subhead */}
        <p className="land-hero-sub" style={{
          fontSize: 18, lineHeight: 1.65, color: '#8C8C93',
          fontFamily: 'var(--font-sans)', fontWeight: 400,
          maxWidth: 520, margin: '0 auto 44px',
        }}>
          Notetaker is a distraction-free editor with AI built into every keystroke.
          Rewrite, expand, and sharpen your thinking — without breaking your flow.
        </p>

        {/* CTAs */}
        <div className="land-hero-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 80 }}>
          <Link href="/auth" className="land-btn-primary" style={{ fontSize: 15, padding: '12px 24px' }}>
            Start writing free <Arrow />
          </Link>
          <Link href="/auth" className="land-btn-ghost" style={{ fontSize: 15 }}>
            Sign in
          </Link>
        </div>

        {/* Mockup */}
        <div className="land-hero-mock">
          <EditorMockup />
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Marquee strip
// ─────────────────────────────────────────────────────────────────────────────

function MarqueeStrip() {
  const items = ['Engineers', 'Product Managers', 'Researchers', 'Writers', 'Founders', 'Designers', 'Students', 'Analysts']
  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.055)',
      borderBottom: '1px solid rgba(255,255,255,0.055)',
      padding: '14px 0', overflow: 'hidden',
      background: 'rgba(255,255,255,0.01)',
    }}>
      <div style={{
        display: 'flex', animation: 'marquee 20s linear infinite', width: 'max-content',
      }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{
            fontSize: 12, color: '#4D4D54', fontFamily: 'var(--font-sans)',
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
            padding: '0 40px',
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Features grid
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 2.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15z" strokeDasharray="3 3" />
        <path d="M10 6v4l3 2" />
      </svg>
    ),
    label: 'Inline AI',
    headline: 'AI that stays inside the editor.',
    body: 'Press ⌘J on any selection. Rewrite, shorten, expand, or improve — all as streaming diffs you can accept or reject in one keystroke. No popups, no tabs.',
    kbd: ['⌘J'],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="2" width="16" height="16" rx="3" />
        <path d="M7 7h6M7 10h4" />
      </svg>
    ),
    label: 'Keyboard-first',
    headline: 'Every action has a shortcut.',
    body: 'Navigate, create, search, and trigger AI without ever touching the mouse. ⌘K opens the command palette. ⌘N creates a note. ⌘⇧F hides everything.',
    kbd: ['⌘K', '⌘N', '⌘⇧F'],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 10h12M10 4v12" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="8" />
      </svg>
    ),
    label: 'Always synced',
    headline: 'Saves as you type. Everywhere.',
    body: 'Every note is persisted automatically within 400ms of your last keystroke. Open on another device and it\'s right there, unchanged.',
    kbd: [],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h14v14H3z" />
        <path d="M7 9l3 3 3-3" />
      </svg>
    ),
    label: 'Focus mode',
    headline: 'Collapse everything. Just write.',
    body: 'Press ⌘⇧F to hide the sidebar entirely. One keystroke back brings it all. Writing tools should disappear on command.',
    kbd: ['⌘⇧F'],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="5" />
        <path d="M12.5 12.5L17 17" />
      </svg>
    ),
    label: 'Instant search',
    headline: 'Find anything in milliseconds.',
    body: 'Full-text search across every note. ⌘K surfaces notes and commands at once. Type to filter. Arrow keys to navigate. Enter to go.',
    kbd: ['⌘K'],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 6h12M4 10h8M4 14h10" />
      </svg>
    ),
    label: 'Rich formatting',
    headline: 'Markdown-native, visually refined.',
    body: 'Headings, bold, italic, code, quotes, and lists. Formatting that renders immediately as you type. Export to Markdown anytime.',
    kbd: [],
  },
]

function Features() {
  return (
    <section style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div className="land-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E6AD2', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 16 }}>
          Capabilities
        </div>
        <h2 style={{
          fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1,
          color: '#E7E7E9', fontFamily: 'var(--font-sans)', marginBottom: 16,
        }}>
          Built for how you actually think.
        </h2>
        <p style={{ fontSize: 16, color: '#8C8C93', fontFamily: 'var(--font-sans)', maxWidth: 460, margin: '0 auto' }}>
          Everything you need to capture and refine ideas. Nothing you don&apos;t.
        </p>
      </div>

      <div className="land-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {FEATURES.map((f, i) => (
          <div key={i} className="land-feature-card land-reveal" style={{ transitionDelay: `${i * 60}ms` }}>
            <div style={{ color: '#5E6AD2', marginBottom: 18 }}>{f.icon}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5E6AD2', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 8 }}>
              {f.label}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E7E7E9', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.35 }}>
              {f.headline}
            </h3>
            <p style={{ fontSize: 14, color: '#8C8C93', fontFamily: 'var(--font-sans)', lineHeight: 1.7, marginBottom: f.kbd.length ? 16 : 0 }}>
              {f.body}
            </p>
            {f.kbd.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {f.kbd.map(k => <span key={k} className="land-kbd">{k}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI deep-dive section
// ─────────────────────────────────────────────────────────────────────────────

function CommandPaletteMockup() {
  const notes = ['Q4 Planning Session', 'Product Ideas', 'Research Notes', 'Sprint Review']
  const commands = ['New note  ⌘N', 'Toggle focus  ⌘⇧F', 'Download as Markdown', 'Delete note']
  return (
    <div style={{
      background: '#0C0D0F', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      overflow: 'hidden', maxWidth: 480, width: '100%',
    }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: '#4D4D54', flexShrink: 0 }}>
          <circle cx="6" cy="6" r="4" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
        </svg>
        <span style={{ fontSize: 14, color: '#E7E7E9', fontFamily: 'var(--font-sans)', flex: 1 }}>research</span>
        <span className="land-kbd">ESC</span>
      </div>

      {/* Commands */}
      <div style={{ padding: '8px 0' }}>
        <div style={{ fontSize: 10, color: '#4D4D54', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px 6px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          Commands
        </div>
        {commands.slice(0, 2).map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', fontSize: 13, fontFamily: 'var(--font-sans)',
            color: i === 0 ? '#E7E7E9' : '#8C8C93',
            background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}>
            <span>{c.split('  ')[0]}</span>
            <span style={{ fontSize: 11, color: '#4D4D54' }}>{c.split('  ')[1]}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.055)', margin: '0 0 8px' }} />

      {/* Notes */}
      <div style={{ padding: '0 0 8px' }}>
        <div style={{ fontSize: 10, color: '#4D4D54', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px 6px', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          Notes
        </div>
        {notes.filter(n => n.toLowerCase().includes('research')).concat(notes.filter(n => !n.toLowerCase().includes('research'))).slice(0, 3).map((n, i) => (
          <div key={i} style={{
            padding: '8px 14px', fontSize: 13, fontFamily: 'var(--font-sans)',
            color: i === 0 ? '#E7E7E9' : '#8C8C93',
            background: i === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}>
            {i === 0
              ? <><span style={{ color: '#5E6AD2' }}>Research</span>{n.slice(8)}</>
              : n}
          </div>
        ))}
      </div>

      {/* Hints */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.055)',
        padding: '8px 14px', display: 'flex', gap: 16,
      }}>
        {['↑↓ Navigate', '↵ Select', 'Esc Close'].map(h => (
          <span key={h} style={{ fontSize: 11, color: '#4D4D54', fontFamily: 'var(--font-sans)' }}>{h}</span>
        ))}
      </div>
    </div>
  )
}

function AISection() {
  return (
    <section style={{
      padding: '120px 40px',
      borderTop: '1px solid rgba(255,255,255,0.055)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* BG gradient */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 50% 60% at 20% 50%, rgba(94,106,210,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Row 1 — AI writing */}
        <div className="land-ai-cols" style={{ display: 'flex', alignItems: 'center', gap: 80, marginBottom: 140 }}>
          <div style={{ flex: '0 0 400px' }}>
            <div className="land-reveal" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E6AD2', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 16 }}>
              AI Writing
            </div>
            <h2 className="land-reveal" style={{
              fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1,
              color: '#E7E7E9', fontFamily: 'var(--font-sans)', marginBottom: 20,
            }}>
              Watch AI rewrite your prose in real time.
            </h2>
            <p className="land-reveal" style={{ fontSize: 15, color: '#8C8C93', fontFamily: 'var(--font-sans)', lineHeight: 1.7, marginBottom: 28 }}>
              Select any text, press ⌘J, and choose a mode. The original text stays visible as a deletion mark while AI streams in a replacement. Accept or reject in a single keystroke.
            </p>
            <div className="land-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Rewrite', 'Rephrase for clarity and concision'],
                ['Shorter', 'Trim without losing the core idea'],
                ['Improve', 'Elevate tone, flow, and precision'],
                ['Expand', 'Add depth and supporting detail'],
              ].map(([mode, desc]) => (
                <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="land-kbd">{mode}</span>
                  <span style={{ fontSize: 13, color: '#8C8C93', fontFamily: 'var(--font-sans)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="land-reveal" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <EditorMockup />
          </div>
        </div>

        {/* Row 2 — Command palette */}
        <div className="land-ai-cols" style={{ display: 'flex', alignItems: 'center', gap: 80, flexDirection: 'row-reverse' }}>
          <div style={{ flex: '0 0 400px' }}>
            <div className="land-reveal" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5E6AD2', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 16 }}>
              Command Palette
            </div>
            <h2 className="land-reveal" style={{
              fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1,
              color: '#E7E7E9', fontFamily: 'var(--font-sans)', marginBottom: 20,
            }}>
              Find anything. Do anything. Press ⌘K.
            </h2>
            <p className="land-reveal" style={{ fontSize: 15, color: '#8C8C93', fontFamily: 'var(--font-sans)', lineHeight: 1.7, marginBottom: 28 }}>
              One shortcut surfaces your notes, commands, and actions. Search full text across every note. Navigate with arrows. The mouse is optional.
            </p>
            <div className="land-reveal" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['⌘K  Search', '⌘N  New note', '⌘W  Delete', '⌘⇧F  Focus'].map(s => (
                <span key={s} className="land-kbd" style={{ fontSize: 12, padding: '4px 10px' }}>{s}</span>
              ))}
            </div>
          </div>

          <div className="land-reveal" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <CommandPaletteMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote callout
// ─────────────────────────────────────────────────────────────────────────────

function Quote() {
  return (
    <section style={{
      borderTop: '1px solid rgba(255,255,255,0.055)',
      borderBottom: '1px solid rgba(255,255,255,0.055)',
      padding: '100px 40px', textAlign: 'center',
      background: 'rgba(255,255,255,0.01)',
    }}>
      <div className="land-reveal" style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{
          fontSize: 32, lineHeight: 1.4, fontWeight: 500,
          color: '#E7E7E9', fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.02em', marginBottom: 32,
        }}>
          &ldquo;The right amount of AI — present when you need it, invisible when you don&apos;t.&rdquo;
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #5E6AD2, #9B59B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
            A
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#E7E7E9', fontFamily: 'var(--font-sans)' }}>Alex R.</div>
            <div style={{ fontSize: 12, color: '#4D4D54', fontFamily: 'var(--font-sans)' }}>Product Lead</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section style={{
      padding: '140px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 400,
        background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(94,106,210,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="land-reveal" style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.0,
          color: '#E7E7E9', fontFamily: 'var(--font-sans)', marginBottom: 20,
        }}>
          Your best thinking,<br />
          <span style={{ color: '#8C8C93' }}>amplified.</span>
        </h2>
        <p style={{
          fontSize: 17, color: '#8C8C93', fontFamily: 'var(--font-sans)',
          maxWidth: 420, margin: '0 auto 44px', lineHeight: 1.65,
        }}>
          Free to start. No credit card. Just open a note and begin.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Link href="/auth" className="land-btn-primary" style={{ fontSize: 16, padding: '14px 28px' }}>
            Start writing free <Arrow />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.055)',
      padding: '32px 40px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#5E6AD2', fontSize: 14 }}>✦</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#4D4D54', fontFamily: 'var(--font-sans)' }}>Notetaker</span>
      </div>

      <div style={{ display: 'flex', gap: 28 }}>
        {['Privacy', 'Terms', 'Changelog', 'GitHub'].map(l => (
          <a key={l} href="#" className="land-nav-link" style={{ fontSize: 13 }}>{l}</a>
        ))}
      </div>

      <span style={{ fontSize: 13, color: '#4D4D54', fontFamily: 'var(--font-sans)' }}>
        © {new Date().getFullYear()} Notetaker
      </span>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared icons
// ─────────────────────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5h9M7.5 2.5l4 4-4 4" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  useReveal()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <div style={{ background: '#08090A', color: '#E7E7E9', minHeight: '100vh' }}>
        <Nav />
        <Hero />
        <MarqueeStrip />
        <Features />
        <AISection />
        <Quote />
        <CTA />
        <Footer />
      </div>
    </>
  )
}
