'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const API_BASE = 'http://localhost:8787'

interface Section {
  id: number
  resource_id: string
  title: string
  summary?: string
  currency_code: string
  price_minor_units: number
  mime_type: string
  size_bytes: number
  section_number: number
  created_at: string
}

interface PaymentRequest {
  user_id: string
  resource_id: string
  currency_code: string
  amount_minor_units: number
  payment_method: string
}

export default function SectionPage() {
  const params = useParams()
  const resourceId = params.resourceId as string

  const [section, setSection] = useState<Section | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    if (resourceId) {
      fetchSection()
    }
  }, [resourceId])

  const fetchSection = async () => {
    try {
      const response = await fetch(`${API_BASE}/section/${resourceId}`)
      
      if (response.status === 402) {
        // Payment required
        const data = await response.json()
        setSection(data.section)
        setHasAccess(false)
      } else if (response.ok) {
        // User has access
        const data = await response.json()
        setSection(data.section)
        setHasAccess(true)
        fetchContent()
      } else {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch section')
    } finally {
      setLoading(false)
    }
  }

  const fetchContent = async () => {
    try {
      const response = await fetch(`${API_BASE}/section/${resourceId}/content?user_id=${USER_ID}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // For PDFs, we don't need to parse as JSON - just set content to indicate it's available
      if (section?.mime_type === 'application/pdf') {
        setContent('PDF_CONTENT_AVAILABLE')
      } else {
        // For text content, parse as JSON
        const data = await response.json()
        setContent(data.content)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content')
    }
  }

  const handlePayment = async () => {
    if (!section) return

    setPaymentLoading(true)
    try {
      const paymentData: PaymentRequest = {
        user_id: 'testuser', // In a real app, this would come from authentication
        resource_id: section.resource_id,
        currency_code: section.currency_code,
        amount_minor_units: section.price_minor_units,
        payment_method: 'usdc'
      }

      const response = await fetch(`${API_BASE}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        throw new Error(`Payment failed! status: ${response.status}`)
      }

      const result = await response.json()
      alert(`Payment successful! Transaction ID: ${result.transaction_id}`)
      
      // Refresh section to get access
      setHasAccess(true)
      fetchContent()
    } catch (err) {
      alert(`Payment failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setPaymentLoading(false)
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
    return <div className="loading">Loading section...</div>
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!section) {
    return (
      <div className="alert alert-error">
        <h2>Section Not Found</h2>
        <p>The requested section could not be found.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h1 className="text-3xl font-bold mb-4">{section.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Section Details</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Section Number:</strong> {section.section_number}</div>
              <div><strong>Resource ID:</strong> {section.resource_id}</div>
              <div><strong>File Type:</strong> {section.mime_type}</div>
              <div><strong>File Size:</strong> {formatFileSize(section.size_bytes)}</div>
              <div><strong>Price:</strong> {formatPrice(section.price_minor_units, section.currency_code)}</div>
              <div><strong>Created:</strong> {new Date(section.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Access Status</h3>
            {hasAccess ? (
              <div className="alert alert-success">
                <p>✅ You have access to this section</p>
              </div>
            ) : (
              <div className="alert alert-error">
                <p>🔒 Payment required to access this section</p>
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="btn btn-success mt-2"
                >
                  {paymentLoading ? 'Processing...' : 'Purchase Section'}
                </button>
              </div>
            )}
          </div>
        </div>

        {section.summary && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Summary</h3>
            <p className="text-gray-600">{section.summary}</p>
          </div>
        )}
      </div>

      {hasAccess && content && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Section Content</h2>
          {section.mime_type === 'application/pdf' ? (
            <div className="space-y-4">
              <div className="flex space-x-4">
                <a
                  href={`${API_BASE}/section/${resourceId}/content?user_id=${USER_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  📄 Open PDF in New Tab
                </a>
                <a
                  href={`${API_BASE}/section/${resourceId}/content?user_id=${USER_ID}`}
                  download={`${section.resource_id}.pdf`}
                  className="btn btn-secondary"
                >
                  💾 Download PDF
                </a>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={`${API_BASE}/section/${resourceId}/content?user_id=${USER_ID}`}
                  width="100%"
                  height="600"
                  className="border-0"
                  title={`PDF: ${section.title}`}
                >
                  <p>Your browser does not support PDFs. 
                    <a href={`${API_BASE}/section/${resourceId}/content?user_id=${USER_ID}`} target="_blank">
                      Click here to open the PDF in a new tab
                    </a>
                  </p>
                </iframe>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border">
              <pre className="whitespace-pre-wrap text-sm">{content}</pre>
            </div>
          )}
        </div>
      )}

      {hasAccess && !content && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Section Content</h2>
          <div className="alert alert-info">
            <p>Content is being loaded...</p>
          </div>
        </div>
      )}
    </div>
  )
}
