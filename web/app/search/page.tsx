'use client'

import { useState } from 'react'

const API_BASE = 'http://localhost:8787'

interface Section {
  id: number
  resource_id: string
  title: string
  summary: string
  currency_code: string
  price_minor_units: number
  mime_type: string
  size_bytes: number
}

interface SearchResponse {
  sections: Section[]
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [textbookSlug, setTextbookSlug] = useState('')
  const [results, setResults] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ q: query })
      if (textbookSlug) params.append('textbook', textbookSlug)

      const response = await fetch(`${API_BASE}/search?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: SearchResponse = await response.json()
      setResults(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">🔍 Search Sections</h1>

      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="form-group">
            <label htmlFor="query">Search Query</label>
            <input
              type="text"
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for topics, keywords, or concepts..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="textbookSlug">Textbook (Optional)</label>
            <input
              type="text"
              id="textbookSlug"
              value={textbookSlug}
              onChange={(e) => setTextbookSlug(e.target.value)}
              placeholder="e.g., blockchain-fundamentals"
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          <h3>Search Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Search Results ({results.length} found)
          </h2>
          <div className="space-y-4">
            {results.map((section) => (
              <div key={section.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                    <p className="text-gray-600 mb-2">{section.summary}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>📄 {section.mime_type}</span>
                      <span>📏 {formatFileSize(section.size_bytes)}</span>
                      <span>💰 {formatPrice(section.price_minor_units, section.currency_code)}</span>
                    </div>
                  </div>
                  <div className="ml-4 space-x-2">
                    <a
                      href={`/section/${section.resource_id}`}
                      className="btn btn-secondary"
                    >
                      View Details
                    </a>
                    <button
                      onClick={() => {
                        // Simulate payment for testing
                        alert(`This would initiate payment for ${section.title}`)
                      }}
                      className="btn btn-success"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="alert alert-info mt-6">
          <h3>No Results Found</h3>
          <p>Try adjusting your search terms or check the spelling.</p>
        </div>
      )}
    </div>
  )
}
