import './globals.css'
import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({ 
  weight: ['400', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Trivia Scavenger Party Game',
  description: 'Vibrant party game combining trivia and scavenger hunts with real-time multiplayer',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#e63950',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
