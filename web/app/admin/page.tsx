'use client'

import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8787'

interface Textbook {
  id: number
  slug: string
  title: string
  author?: string
  description?: string
  total_sections: number
  created_at: string
}

interface Section {
  id: number
  resource_id: string
  title: string
  summary?: string
  currency_code: string
  price_minor_units: number
  section_number: number
  mime_type: string
  size_bytes: number
}

interface TextbookResponse {
  textbooks: Textbook[]
}

interface SectionResponse {
  sections: Section[]
}

export default function AdminPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTextbook, setSelectedTextbook] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'textbooks' | 'upload' | 'sections'>('textbooks')

  // Form states
  const [newTextbook, setNewTextbook] = useState({
    slug: '',
    title: '',
    author: '',
    description: ''
  })
  const [uploadData, setUploadData] = useState({
    textbook_slug: '',
    section_number: 1,
    price_minor_units: 1000,
    currency_code: 'USDC'
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploadSections, setUploadSections] = useState<Section[]>([])

  useEffect(() => {
    fetchTextbooks()
  }, [])

  const fetchTextbooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: TextbookResponse = await response.json()
      setTextbooks(data.textbooks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch textbooks')
    } finally {
      setLoading(false)
    }
  }

  const fetchSections = async (textbookSlug: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks/${textbookSlug}/sections`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: SectionResponse = await response.json()
      setSections(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sections')
    }
  }

  const fetchUploadSections = async (textbookSlug: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks/${textbookSlug}/sections`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: SectionResponse = await response.json()
      setUploadSections(data.sections)
    } catch (err) {
      console.error('Failed to fetch sections for upload:', err)
    }
  }

  const handleCreateTextbook = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTextbook),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      alert(`Textbook created successfully! ID: ${result.textbook.id}`)
      setNewTextbook({ slug: '', title: '', author: '', description: '' })
      fetchTextbooks()
    } catch (err) {
      alert(`Failed to create textbook: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

    const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!file || !uploadData.textbook_slug) {
        alert('Please select a file and textbook')
        return
      }

      // Check file size (1MB limit)
      const MAX_FILE_SIZE = 1024 * 1024 // 1MB
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large! Size: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 1MB. Please use a smaller file.`)
        return
      }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('textbook_slug', uploadData.textbook_slug)
      formData.append('section_number', uploadData.section_number.toString())
      formData.append('price_minor_units', uploadData.price_minor_units.toString())
      formData.append('currency_code', uploadData.currency_code)

      const response = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`)
      }

      alert(`PDF uploaded successfully! Section ID: ${result.section.resource_id}`)
      setFile(null)
      setUploadData({ textbook_slug: '', section_number: 1, price_minor_units: 1000, currency_code: 'USDC' })
      if (uploadData.textbook_slug) {
        fetchSections(uploadData.textbook_slug)
      }
    } catch (err) {
      alert(`Failed to upload PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const formatPrice = (priceMinorUnits: number, currencyCode: string) => {
    if (currencyCode === 'USDC') {
      return `$${(priceMinorUnits / 100).toFixed(2)} USDC`
    }
    return `${(priceMinorUnits / 100).toFixed(2)} ${currencyCode}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return <div className="loading">Loading admin panel...</div>
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">🔧 Admin Panel</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('textbooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'textbooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Textbooks
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upload PDFs
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            View Sections
          </button>
        </nav>
      </div>

      {/* Textbooks Tab */}
      {activeTab === 'textbooks' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Create New Textbook</h2>
            <form onSubmit={handleCreateTextbook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="slug">Slug (Unique ID)</label>
                  <input
                    type="text"
                    id="slug"
                    value={newTextbook.slug}
                    onChange={(e) => setNewTextbook(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., blockchain-fundamentals"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    value={newTextbook.title}
                    onChange={(e) => setNewTextbook(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Blockchain Fundamentals"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="author">Author</label>
                  <input
                    type="text"
                    id="author"
                    value={newTextbook.author}
                    onChange={(e) => setNewTextbook(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={newTextbook.description}
                    onChange={(e) => setNewTextbook(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the textbook"
                    rows={3}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success">Create Textbook</button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Existing Textbooks</h2>
            <div className="space-y-4">
              {textbooks.map((textbook) => (
                <div key={textbook.id} className="border rounded p-4">
                  <h3 className="font-semibold">{textbook.title}</h3>
                  {textbook.author && <p className="text-gray-600">by {textbook.author}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">Slug: {textbook.slug}</span>
                    <span className="text-sm text-gray-500">{textbook.total_sections} sections</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Upload PDF Section</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a PDF file and specify which textbook and section number it belongs to. The filename will be used as the title (underscores converted to spaces).
            <br />
            <span className="text-red-600 font-semibold">⚠️ File size limit: 1MB (for direct storage)</span>
          </p>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="form-group">
              <label htmlFor="file">PDF File</label>
              <input
                type="file"
                id="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              {file && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Selected: {file.name}</span>
                  <span className={`ml-2 font-semibold ${
                    file.size > 1024 * 1024 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </span>
                  {file.size > 1024 * 1024 && (
                    <div className="text-red-600 text-xs mt-1">
                      ⚠️ File exceeds 1MB limit and will be rejected
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="textbook_slug">Select Textbook</label>
                  <select
                    id="textbook_slug"
                    value={uploadData.textbook_slug}
                    onChange={(e) => {
                      setUploadData(prev => ({ ...prev, textbook_slug: e.target.value }))
                      if (e.target.value) {
                        fetchUploadSections(e.target.value)
                      } else {
                        setUploadSections([])
                      }
                    }}
                    required
                  >
                    <option value="">Choose a textbook...</option>
                    {textbooks.map((textbook) => (
                      <option key={textbook.id} value={textbook.slug}>
                        {textbook.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="section_number">Section Number</label>
                  <input
                    type="number"
                    id="section_number"
                    min="1"
                    value={uploadData.section_number}
                    onChange={(e) => setUploadData(prev => ({ ...prev, section_number: parseInt(e.target.value) || 1 }))}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    The order/sequence of this section within the textbook
                  </div>
                  {uploadData.textbook_slug && uploadSections.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                      <div className="font-semibold text-blue-800 mb-1">Existing sections:</div>
                      <div className="text-blue-700">
                        {uploadSections.map(s => s.section_number).sort((a, b) => a - b).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="price_minor_units">Price (USDC Cents)</label>
                  <input
                    type="number"
                    id="price_minor_units"
                    value={uploadData.price_minor_units}
                    onChange={(e) => setUploadData(prev => ({ ...prev, price_minor_units: parseInt(e.target.value) || 0 }))}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current: ${(uploadData.price_minor_units / 100).toFixed(2)} USDC
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="currency_code">Currency</label>
                  <input
                    type="text"
                    id="currency_code"
                    value="USDC"
                    disabled
                    className="bg-gray-100"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Only USDC is supported
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-success" disabled={!file || !uploadData.textbook_slug}>
              Upload PDF
            </button>
          </form>
        </div>
      )}

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">View Sections</h2>
            <div className="form-group">
              <label htmlFor="section_textbook">Select Textbook</label>
              <select
                id="section_textbook"
                value={selectedTextbook}
                onChange={(e) => {
                  setSelectedTextbook(e.target.value)
                  if (e.target.value) {
                    fetchSections(e.target.value)
                  } else {
                    setSections([])
                  }
                }}
              >
                <option value="">Select textbook to view sections</option>
                {textbooks.map((textbook) => (
                  <option key={textbook.id} value={textbook.slug}>
                    {textbook.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTextbook && sections.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                Sections in {textbooks.find(t => t.slug === selectedTextbook)?.title}
              </h2>
              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          Section {section.section_number}: {section.title}
                        </h3>
                        {section.summary && (
                          <p className="text-sm text-gray-600 mt-1">{section.summary}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                          <span>📄 {section.mime_type}</span>
                          <span>📏 {formatFileSize(section.size_bytes)}</span>
                          <span>💰 {formatPrice(section.price_minor_units, section.currency_code)}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col space-y-2">
                        <span className="text-sm text-gray-500">ID: {section.resource_id}</span>
                        {section.mime_type === 'application/pdf' && (
                          <a
                            href={`${API_BASE}/section/${section.resource_id}/content?admin=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                          >
                            📄 View PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
