'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { 
  ArrowLeft, 
  Send, 
  BookOpen, 
  User, 
  Eye, 
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react'
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

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  referenced_sections?: Array<{
    resource_id: string
    title: string
    section_number: number
  }>
  timestamp: Date
  isFollowUp?: boolean
}

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  resourceId: string
  title: string
}

const PDFViewer = ({ isOpen, onClose, resourceId, title }: PDFViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [scale, setScale] = useState(1)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchPDF()
    }
  }, [isOpen, resourceId])

  const fetchPDF = async () => {
    console.log('📄 [WEB APP] Fetching PDF for resource:', resourceId)
    setLoading(true)
    setError(null)
    try {
      // Use the direct section content endpoint
      const sectionUrl = `${API_BASE}?path=/section/${resourceId}/content&user_id=anonymous`
      console.log('🌐 [WEB APP] Fetching section content from:', sectionUrl)
      
      const response = await fetch(sectionUrl)
      console.log('📡 [WEB APP] Section content response status:', response.status)
      console.log('📡 [WEB APP] Section content response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        // Check if it's a PDF response
        const contentType = response.headers.get('content-type')
        console.log('📄 [WEB APP] Content type:', contentType)
        
        if (contentType && contentType.includes('application/pdf')) {
          // It's a PDF, set the URL directly
          console.log('📄 [WEB APP] Direct PDF content received, setting URL')
          setPdfUrl(sectionUrl)
          return
        } else {
          // It might be a JSON response with R2 URL or external key
          console.log('📄 [WEB APP] JSON response received, parsing...')
          try {
            const data = await response.json()
            console.log('📄 [WEB APP] Section data:', data)
            
            if (data.r2_url) {
              console.log('📄 [WEB APP] Using R2 URL:', data.r2_url)
              setPdfUrl(data.r2_url)
            } else if (data.external_key) {
              console.log('📄 [WEB APP] Using external key, falling back to section endpoint')
              setPdfUrl(sectionUrl)
            } else {
              throw new Error('No PDF content available')
            }
          } catch (jsonError) {
            console.log('📄 [WEB APP] Failed to parse as JSON, treating as PDF content')
            // If JSON parsing fails, treat it as PDF content
            setPdfUrl(sectionUrl)
          }
        }
      } else if (response.status === 403) {
        console.log('🚫 [WEB APP] Access denied, trying AI PDF endpoint...')
        // Access denied - try AI PDF endpoint as fallback
        const aiUrl = `${API_BASE}?path=/ai/pdf/${resourceId}&user_id=anonymous`
        console.log('🌐 [WEB APP] Fetching AI PDF info from:', aiUrl)
        
        const aiResponse = await fetch(aiUrl)
        console.log('📡 [WEB APP] AI PDF response status:', aiResponse.status)
        
        if (aiResponse.ok) {
          // Check if AI response is PDF content
          const aiContentType = aiResponse.headers.get('content-type')
          console.log('📄 [WEB APP] AI PDF content type:', aiContentType)
          
          if (aiContentType && aiContentType.includes('application/pdf')) {
            console.log('📄 [WEB APP] AI returned direct PDF content')
            setPdfUrl(aiUrl)
          } else {
            try {
              const aiData = await aiResponse.json()
              console.log('📄 [WEB APP] AI PDF data:', aiData)
              
              if (aiData.r2_url) {
                console.log('📄 [WEB APP] Using AI R2 URL:', aiData.r2_url)
                setPdfUrl(aiData.r2_url)
              } else if (aiData.external_key) {
                console.log('📄 [WEB APP] Using AI external key, falling back to section endpoint')
                setPdfUrl(sectionUrl)
              } else {
                throw new Error('No PDF URL available')
              }
            } catch (jsonError) {
              console.log('📄 [WEB APP] AI response is not JSON, treating as PDF content')
              setPdfUrl(aiUrl)
            }
          }
        } else {
          throw new Error(`Access denied: ${response.status}`)
        }
      } else {
        throw new Error(`Failed to fetch PDF: ${response.status}`)
      }
    } catch (err) {
      console.error('❌ [WEB APP] PDF fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const handleReset = () => setScale(1)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-gray-900 rounded-2xl shadow-2xl w-[95vw] h-[95vh] max-w-7xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {loading && (
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white/10 rounded text-gray-300"
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm font-medium text-gray-300">{Math.round(scale * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white/10 rounded text-gray-300"
                  disabled={scale >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-white/10 rounded text-gray-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* PDF Content */}
          <div className="flex-1 p-6 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="loading-dots mb-4">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <p className="text-gray-400">Loading PDF...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400 mb-2">Failed to load PDF</p>
                  <p className="text-gray-400 text-sm">{error}</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full overflow-auto">
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  className="w-full h-full border-0 rounded-lg"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                  title={`PDF: ${title}`}
                />
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function TextbookPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [textbook, setTextbook] = useState<Textbook | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfViewer, setPdfViewer] = useState<{
    isOpen: boolean
    resourceId: string
    title: string
  }>({
    isOpen: false,
    resourceId: '',
    title: ''
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (slug) {
      fetchTextbook()
    }
  }, [slug])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTextbook = async () => {
    try {
      const response = await fetch(`${API_BASE}?path=/textbook/${slug}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTextbook(data.textbook)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch textbook')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !textbook) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      console.log('🚀 [WEB APP] Sending chat message to AI...')
      console.log('📤 [WEB APP] Request payload:', {
        message: inputMessage.trim(),
        textbook_slug: textbook.slug,
        session_id: 'default'
      })
      
      const apiUrl = `${API_BASE}?path=/ai/chat`
      console.log('🌐 [WEB APP] API URL:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          textbook_slug: textbook.slug,
          session_id: 'default'
        })
      })

      console.log('📡 [WEB APP] Response status:', response.status)
      console.log('📡 [WEB APP] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 [WEB APP] AI Response data:', data)
      console.log('📥 [WEB APP] AI Response content:', data.response)
      console.log('📥 [WEB APP] Referenced sections:', data.referenced_sections)
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Parse the AI response to find the specific section mentioned
      const responseText = data.response
      const sectionMatch = responseText.match(/\*\*Section (\d+):\s*([^*]+)\*\*/i)
      
      if (sectionMatch && data.referenced_sections && data.referenced_sections.length > 0) {
        const mentionedSectionNumber = parseInt(sectionMatch[1])
        const mentionedSectionTitle = sectionMatch[2].trim()
        
        // Find the specific section that was mentioned
        const mentionedSection = data.referenced_sections.find((section: any) => 
          section.section_number === mentionedSectionNumber
        )
        
        if (mentionedSection) {
          console.log('📖 [WEB APP] Found mentioned section:', mentionedSection)
          
          const followUpMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            type: 'ai',
            content: `📖 **View Section ${mentionedSection.section_number}**: ${mentionedSection.title}\n\nClick below to view the PDF content:`,
            referenced_sections: [mentionedSection], // Only the specific mentioned section
            timestamp: new Date(),
            isFollowUp: true
          }
          
          // Add a small delay to make the follow-up message appear after the main response
          setTimeout(() => {
            console.log('⏰ [WEB APP] Adding follow-up message after 500ms delay')
            setMessages(prev => [...prev, followUpMessage])
          }, 500)
        }
      }
    } catch (err) {
      console.error('❌ [WEB APP] Error in sendMessage:', err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const openPDFViewer = (resourceId: string, title: string) => {
    console.log('📖 [WEB APP] Opening PDF viewer for section:', resourceId, 'Title:', title)
    setPdfViewer({
      isOpen: true,
      resourceId,
      title
    })
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

  if (error || !textbook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-400 mb-4">{error || 'Textbook not found'}</p>
          <Link href="/" className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Textbooks
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{textbook.title}</h1>
                  {textbook.author && (
                    <p className="text-sm text-gray-400">by {textbook.author}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{textbook.title}</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Ask me anything about this textbook.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
                  <button
                    onClick={() => setInputMessage("What are the main topics covered in this textbook?")}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-all"
                  >
                    <h4 className="font-medium text-white mb-1 text-sm">Main Topics</h4>
                    <p className="text-xs text-gray-400">What are the main topics covered?</p>
                  </button>
                  <button
                    onClick={() => setInputMessage("Can you explain the key concepts from chapter 1?")}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 text-left hover:bg-white/10 transition-all"
                  >
                    <h4 className="font-medium text-white mb-1 text-sm">Key Concepts</h4>
                    <p className="text-xs text-gray-400">Explain key concepts from chapter 1</p>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`chat-bubble ${message.type === 'user' ? 'chat-bubble-user' : message.isFollowUp ? 'chat-bubble-ai border-l-4 border-blue-400 bg-blue-500/5' : 'chat-bubble-ai'}`}>
                    {message.type === 'user' ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                    
                    {message.type === 'ai' && message.isFollowUp && message.referenced_sections && message.referenced_sections.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="space-y-1">
                          {message.referenced_sections.map((section, index) => (
                            <button
                              key={index}
                              onClick={() => openPDFViewer(section.resource_id, section.title)}
                              className="flex items-center space-x-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg transition-colors w-full text-left"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Section {section.section_number}: {section.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="chat-bubble chat-bubble-ai">
                  <div className="loading-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-6 bg-black/20">
            <div className="flex space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewer
        isOpen={pdfViewer.isOpen}
        onClose={() => setPdfViewer(prev => ({ ...prev, isOpen: false }))}
        resourceId={pdfViewer.resourceId}
        title={pdfViewer.title}
      />
    </div>
  )
}
