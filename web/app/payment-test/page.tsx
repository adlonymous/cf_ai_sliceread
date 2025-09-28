'use client'

import { useState } from 'react'

const API_BASE = 'http://localhost:8787'

interface PaymentRequest {
  user_id: string
  resource_id: string
  currency_code: string
  amount_minor_units: number
  payment_method: string
}

interface PaymentResponse {
  success: boolean
  transaction_id: string
  message: string
}

export default function PaymentTestPage() {
  const [formData, setFormData] = useState<PaymentRequest>({
    user_id: 'testuser',
    resource_id: 'blockchain-fundamentals-001',
    currency_code: 'USDC',
    amount_minor_units: 1000,
    payment_method: 'usdc'
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PaymentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: PaymentResponse = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount_minor_units' ? parseInt(value) || 0 : value
    }))
  }

  const formatPrice = (priceMinorUnits: number, currencyCode: string) => {
    if (currencyCode === 'USDC') {
      return `$${(priceMinorUnits / 100).toFixed(2)} USDC`
    }
    return `${(priceMinorUnits / 100).toFixed(2)} ${currencyCode}`
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">⚡ Payment Test</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Test Payment</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label htmlFor="user_id">User ID</label>
              <input
                type="text"
                id="user_id"
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="resource_id">Resource ID</label>
              <input
                type="text"
                id="resource_id"
                name="resource_id"
                value={formData.resource_id}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="currency_code">Currency</label>
              <input
                type="text"
                id="currency_code"
                name="currency_code"
                value="USDC"
                disabled
                className="bg-gray-100"
              />
              <div className="text-xs text-gray-500 mt-1">
                Only USDC is supported
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="amount_minor_units">Amount (Minor Units)</label>
              <input
                type="number"
                id="amount_minor_units"
                name="amount_minor_units"
                value={formData.amount_minor_units}
                onChange={handleInputChange}
                required
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {formatPrice(formData.amount_minor_units, formData.currency_code)}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="payment_method">Payment Method</label>
              <input
                type="text"
                id="payment_method"
                name="payment_method"
                value="USDC"
                disabled
                className="bg-gray-100"
              />
              <div className="text-xs text-gray-500 mt-1">
                Only USDC payments are supported
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? 'Processing Payment...' : 'Test Payment'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Payment Results</h2>
          
          {loading && (
            <div className="loading">Processing payment...</div>
          )}

          {error && (
            <div className="alert alert-error">
              <h3>Payment Failed</h3>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="alert alert-success">
              <h3>Payment Successful! ✅</h3>
              <div className="mt-2 space-y-2">
                <div><strong>Transaction ID:</strong> {result.transaction_id}</div>
                <div><strong>Message:</strong> {result.message}</div>
              </div>
            </div>
          )}

          {!loading && !error && !result && (
            <div className="alert alert-info">
              <p>Fill out the form and click "Test Payment" to simulate a payment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
        <div className="space-x-4">
          <button
            onClick={() => setFormData({
              user_id: 'testuser',
              resource_id: 'blockchain-fundamentals-001',
              currency_code: 'USDC',
              amount_minor_units: 1000,
              payment_method: 'usdc'
            })}
            className="btn btn-secondary"
          >
            Test Section 1
          </button>
          <button
            onClick={() => setFormData({
              user_id: 'testuser',
              resource_id: 'blockchain-fundamentals-002',
              currency_code: 'USDC',
              amount_minor_units: 1500,
              payment_method: 'usdc'
            })}
            className="btn btn-secondary"
          >
            Test Section 2
          </button>
          <button
            onClick={() => setFormData({
              user_id: 'testuser',
              resource_id: 'test-pdf-001',
              currency_code: 'USDC',
              amount_minor_units: 500,
              payment_method: 'usdc'
            })}
            className="btn btn-secondary"
          >
            Test PDF Section
          </button>
        </div>
      </div>
    </div>
  )
}
