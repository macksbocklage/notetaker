import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Playfair_Display, Lora } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Notetaker',
  description: 'AI-powered markdown notes editor',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${playfair.variable} ${lora.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
