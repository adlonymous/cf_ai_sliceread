'use client'

import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8787'

interface ApiInfo {
  message: string
  endpoints: string[]
}

export default function Home() {
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

  if (loading) {
    return <div className="loading">Loading API information...</div>
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <h2>Error</h2>
        <p>{error}</p>
        <p>Make sure your Cloudflare Worker is running on port 8787</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome to Fractional Document Unlock</h1>
      
      <div className="alert alert-info">
        <h2 className="text-xl font-semibold mb-2">API Status: Connected ✅</h2>
        <p>Your Cloudflare Worker is running and responding to requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">🔍 Search</h3>
          <p className="text-gray-600 mb-4">Search for sections across all textbooks</p>
          <a href="/search" className="btn">Test Search</a>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">📚 Textbooks</h3>
          <p className="text-gray-600 mb-4">Browse available textbooks and sections</p>
          <a href="/textbooks" className="btn">View Textbooks</a>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">👤 My Library</h3>
          <p className="text-gray-600 mb-4">View your purchased sections</p>
          <a href="/user" className="btn">My Library</a>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">⚡ Payment Test</h3>
          <p className="text-gray-600 mb-4">Test the payment flow</p>
          <a href="/payment-test" className="btn">Test Payment</a>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">🔧 Admin</h3>
          <p className="text-gray-600 mb-4">Upload PDFs and manage content</p>
          <a href="/admin" className="btn">Admin Panel</a>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3">📊 API Endpoints</h3>
          <p className="text-gray-600 mb-4">View all available API endpoints</p>
          <a href="/api-docs" className="btn">API Documentation</a>
        </div>
      </div>

      {apiInfo && (
        <div className="card mt-8">
          <h2 className="text-xl font-semibold mb-4">Available API Endpoints</h2>
          <div className="space-y-2">
            {apiInfo.endpoints.map((endpoint, index) => (
              <div key={index} className="font-mono text-sm bg-gray-100 p-2 rounded">
                {endpoint}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}