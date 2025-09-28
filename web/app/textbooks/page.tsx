'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

interface TextbookSectionsResponse {
  sections: Section[]
}

export default function TextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTextbooks()
  }, [])

  const fetchTextbooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks`)
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

  const fetchSections = async (textbookSlug: string) => {
    setSectionsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/admin/textbooks/${textbookSlug}/sections`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: TextbookSectionsResponse = await response.json()
      setSections(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sections')
    } finally {
      setSectionsLoading(false)
    }
  }

  const handleTextbookSelect = (textbook: Textbook) => {
    setSelectedTextbook(textbook)
    fetchSections(textbook.slug)
  }

  const formatPrice = (priceMinorUnits: number, currencyCode: string) => {
    if (currencyCode === 'USDC') {
      return `$${(priceMinorUnits / 100).toFixed(2)} USDC`
    }
    return `${(priceMinorUnits / 100).toFixed(2)} ${currencyCode}`
  }

  if (loading) {
    return <div className="loading">Loading textbooks...</div>
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
      <h1 className="text-3xl font-bold mb-6">📚 Textbooks</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Textbooks List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Textbooks</h2>
          <div className="space-y-4">
            {textbooks.map((textbook) => (
              <div
                key={textbook.id}
                className={`card cursor-pointer transition-colors ${
                  selectedTextbook?.id === textbook.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTextbookSelect(textbook)}
              >
                <h3 className="text-lg font-semibold mb-2">{textbook.title}</h3>
                {textbook.author && (
                  <p className="text-gray-600 mb-2">by {textbook.author}</p>
                )}
                {textbook.description && (
                  <p className="text-sm text-gray-500 mb-2">{textbook.description}</p>
                )}
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{textbook.total_sections} sections</span>
                  <span>Slug: {textbook.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sections List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {selectedTextbook ? `${selectedTextbook.title} - Sections` : 'Select a textbook to view sections'}
          </h2>

          {selectedTextbook && (
            <div className="space-y-4">
              {sectionsLoading ? (
                <div className="loading">Loading sections...</div>
              ) : sections.length > 0 ? (
                sections.map((section) => (
                  <div key={section.id} className="card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">
                          Section {section.section_number}: {section.title}
                        </h4>
                        {section.summary && (
                          <p className="text-sm text-gray-600 mb-2">{section.summary}</p>
                        )}
                        <div className="text-sm text-gray-500">
                          Price: {formatPrice(section.price_minor_units, section.currency_code)}
                        </div>
                      </div>
                      <div className="ml-4 space-x-2">
                        <Link
                          href={`/section/${section.resource_id}`}
                          className="btn btn-secondary"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => {
                            alert(`This would initiate payment for ${section.title}`)
                          }}
                          className="btn btn-success"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert alert-info">
                  <p>No sections found for this textbook.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
