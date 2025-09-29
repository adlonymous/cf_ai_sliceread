'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const API_BASE = 'http://localhost:8787'

interface Section {
  id: number
  resource_id: string
  title: string
  summary?: string
  currency_code: string
  price_minor_units: number
  section_number: number
  created_at: string
}

interface Payment {
  id: number
  user_id: string
  resource_id: string
  currency_code: string
  amount_minor_units: number
  payment_status: string
  facilitator_tx_id?: string
  paid_at?: string
  created_at: string
}

interface UserSectionsResponse {
  sections: Section[]
}

interface UserPaymentsResponse {
  payments: Payment[]
}

export default function UserPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'sections' | 'payments'>('sections')

  const userId = 'testuser' // In a real app, this would come from authentication

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const [sectionsResponse, paymentsResponse] = await Promise.all([
        fetch(`${API_BASE}/user/${userId}/sections`),
        fetch(`${API_BASE}/user/${userId}/payments`)
      ])

      if (!sectionsResponse.ok) {
        throw new Error(`Failed to fetch sections: ${sectionsResponse.status}`)
      }
      if (!paymentsResponse.ok) {
        throw new Error(`Failed to fetch payments: ${paymentsResponse.status}`)
      }

      const sectionsData: UserSectionsResponse = await sectionsResponse.json()
      const paymentsData: UserPaymentsResponse = await paymentsResponse.json()

      setSections(sectionsData.sections)
      setPayments(paymentsData.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      case 'refunded': return 'text-gray-600'
      case 'expired': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return <div className="loading">Loading your library...</div>
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
      <h1 className="text-3xl font-bold mb-6">👤 My Library</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Sections ({sections.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment History ({payments.length})
          </button>
        </nav>
      </div>

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Purchased Sections</h2>
          {sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        Section {section.section_number}: {section.title}
                      </h3>
                      {section.summary && (
                        <p className="text-gray-600 mb-2">{section.summary}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>💰 {formatPrice(section.price_minor_units, section.currency_code)}</span>
                        <span>📅 Purchased: {formatDate(section.created_at)}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link
                        href={`/section/${section.resource_id}`}
                        className="btn btn-secondary"
                      >
                        View Section
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              <h3>No Purchased Sections</h3>
              <p>You haven't purchased any sections yet. <Link href="/textbooks" className="underline">Browse textbooks</Link> to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.resource_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(payment.amount_minor_units, payment.currency_code)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getStatusColor(payment.payment_status)}`}>
                          {payment.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.facilitator_tx_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <h3>No Payment History</h3>
              <p>You haven't made any payments yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
