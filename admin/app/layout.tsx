import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fractional Document Unlock - Test App',
  description: 'Test application for the Fractional Document Unlock API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">📚 Fractional Document Unlock</h1>
            <div className="space-x-4">
              <a href="/" className="hover:underline">Home</a>
              <a href="/search" className="hover:underline">Search</a>
              <a href="/textbooks" className="hover:underline">Textbooks</a>
              <a href="/user" className="hover:underline">My Library</a>
              <a href="/admin" className="hover:underline">Admin</a>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  )
}