'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, User, Search, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const API_BASE = '/api/proxy'

interface Textbook {
  id: number
  slug: string
  title: string
  author?: string
  description?: string
  total_sections: number
  created_at: string
}

export default function Home() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTextbooks()
  }, [])

  const fetchTextbooks = async () => {
    try {
      const response = await fetch(`${API_BASE}?path=/admin/textbooks`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTextbooks(data.textbooks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch textbooks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">SliceRead</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4 gradient-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            SliceRead
          </motion.h1>
        </div>
      </section>

      {/* Textbooks Grid */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {textbooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No textbooks available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {textbooks.map((textbook, index) => (
                <motion.div
                  key={textbook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <Link href={`/textbook/${textbook.slug}`}>
                    <div className="glass rounded-xl p-6 card-hover cursor-pointer h-full">
                      {/* Textbook Cover Placeholder */}
                      <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg mb-4 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-blue-400" />
                      </div>
                      
                      {/* Textbook Info */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                          {textbook.title}
                        </h3>
                        
                        {textbook.author && (
                          <p className="text-gray-400 text-sm">
                            {textbook.author}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <MessageCircle className="w-3 h-3" />
                            <span>{textbook.total_sections} sections</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-blue-400 text-sm font-medium">
                            <span>Chat</span>
                            <Search className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
