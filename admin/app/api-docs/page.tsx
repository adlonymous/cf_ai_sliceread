'use client'

import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8787'

interface ApiInfo {
  message: string
  endpoints: string[]
}

export default function ApiDocsPage() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApiInfo()
  }, [])

  const fetchApiInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setApiInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API info')
    } finally {
      setLoading(false)
    }
  }

  const testEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`)
      const data = await response.json()
      alert(`Response (${response.status}):\n${JSON.stringify(data, null, 2)}`)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return <div className="loading">Loading API documentation...</div>
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  const endpointCategories = {
    'Search & Discovery': [
      'GET /search?q=query&textbook=slug - Search sections',
      'GET /textbook/:slug - Get textbook details',
      'GET /textbook/:slug/sections - List textbook sections'
    ],
    'Section Access': [
      'GET /section/:resource_id - Get section details (402 if payment required)',
      'GET /section/:resource_id/content - Get section content (requires payment)'
    ],
    'Payment': [
      'POST /payment - Process payment for section access'
    ],
    'User Data': [
      'GET /user/:id/sections - Get user\'s purchased sections',
      'GET /user/:id/payments - Get user\'s payment history'
    ],
    'Admin': [
      'POST /admin/upload - Upload PDF section',
      'POST /admin/textbooks - Create new textbook',
      'GET /admin/textbooks - List all textbooks',
      'GET /admin/textbooks/:slug/sections - List sections for textbook'
    ]
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">📊 API Documentation</h1>

      <div className="alert alert-info mb-6">
        <h2 className="text-xl font-semibold mb-2">API Base URL</h2>
        <p className="font-mono text-sm">{API_BASE}</p>
        <p className="text-sm mt-2">All endpoints return JSON responses with CORS headers enabled.</p>
      </div>

      {apiInfo && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">API Status</h2>
          <p className="text-green-600 font-semibold">✅ Connected and operational</p>
          <p className="text-sm text-gray-600 mt-1">{apiInfo.message}</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(endpointCategories).map(([category, endpoints]) => (
          <div key={category} className="card">
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="space-y-3">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <code className="text-sm font-mono">{endpoint}</code>
                  <button
                    onClick={() => testEndpoint(endpoint.split(' ')[1])}
                    className="btn btn-secondary text-xs"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-8">
        <h2 className="text-xl font-semibold mb-4">Request/Response Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Search Sections</h3>
            <div className="bg-gray-100 p-4 rounded text-sm">
              <div className="font-semibold mb-2">Request:</div>
              <code>GET {API_BASE}/search?q=blockchain&textbook=blockchain-fundamentals</code>
              
              <div className="font-semibold mb-2 mt-4">Response:</div>
              <pre className="whitespace-pre-wrap">{`{
  "sections": [
    {
      "id": 1,
      "resource_id": "blockchain-fundamentals-001",
      "title": "Introduction to Blockchain",
      "summary": "Basic concepts and principles...",
      "currency_code": "USDC",
      "price_minor_units": 1000,
      "mime_type": "application/pdf",
      "size_bytes": 1024000
    }
  ]
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Payment Request</h3>
            <div className="bg-gray-100 p-4 rounded text-sm">
              <div className="font-semibold mb-2">Request:</div>
              <code>POST {API_BASE}/payment</code>
              <div className="mt-2">Body:</div>
              <pre className="whitespace-pre-wrap">{`{
  "user_id": "testuser",
  "resource_id": "blockchain-fundamentals-001",
  "currency_code": "USDC",
  "amount_minor_units": 1000,
  "payment_method": "usdc"
}`}</pre>
              
              <div className="font-semibold mb-2 mt-4">Response:</div>
              <pre className="whitespace-pre-wrap">{`{
  "success": true,
  "transaction_id": "tx_123456789",
  "message": "Payment processed successfully"
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Section Access (Payment Required)</h3>
            <div className="bg-gray-100 p-4 rounded text-sm">
              <div className="font-semibold mb-2">Request:</div>
              <code>GET {API_BASE}/section/blockchain-fundamentals-001</code>
              
              <div className="font-semibold mb-2 mt-4">Response (402 Payment Required):</div>
              <pre className="whitespace-pre-wrap">{`{
  "error": "Payment required",
  "section": {
    "id": 1,
    "resource_id": "blockchain-fundamentals-001",
    "title": "Introduction to Blockchain",
    "currency_code": "USDC",
    "price_minor_units": 1000
  },
  "payment_url": "/payment"
}`}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-8">
        <h2 className="text-xl font-semibold mb-4">Error Codes</h2>
        <div className="space-y-2 text-sm">
          <div><strong>400:</strong> Bad Request - Missing or invalid parameters</div>
          <div><strong>402:</strong> Payment Required - Section requires payment to access</div>
          <div><strong>404:</strong> Not Found - Resource not found</div>
          <div><strong>500:</strong> Internal Server Error - Server-side error</div>
        </div>
      </div>
    </div>
  )
}
