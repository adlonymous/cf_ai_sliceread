import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'http://localhost:8787'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  console.log('🔍 [PROXY] GET request received')
  console.log('🔍 [PROXY] Path:', path)
  console.log('🔍 [PROXY] All search params:', Object.fromEntries(searchParams.entries()))

  if (!path) {
    console.error('❌ [PROXY] No path parameter provided')
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 })
  }

  try {
    // Build the full URL with all query parameters
    const url = new URL(`${API_BASE}${path}`)
    // Copy all search params except 'path'
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        url.searchParams.set(key, value)
      }
    })

    console.log('🌐 [PROXY] Fetching from worker:', url.toString())
    const response = await fetch(url.toString())
    console.log('📡 [PROXY] Worker response status:', response.status)
    console.log('📡 [PROXY] Worker response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('📥 [PROXY] Worker response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ [PROXY] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  console.log('🔍 [PROXY] POST request received')
  console.log('🔍 [PROXY] Path:', path)
  console.log('🔍 [PROXY] All search params:', Object.fromEntries(searchParams.entries()))

  if (!path) {
    console.error('❌ [PROXY] No path parameter provided')
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    console.log('📤 [PROXY] Request body:', body)

    // Build the full URL with all query parameters
    const url = new URL(`${API_BASE}${path}`)
    // Copy all search params except 'path'
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        url.searchParams.set(key, value)
      }
    })

    console.log('🌐 [PROXY] POSTing to worker:', url.toString())
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('📡 [PROXY] Worker response status:', response.status)
    console.log('📡 [PROXY] Worker response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('📥 [PROXY] Worker response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ [PROXY] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to send data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
