import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json(
      { error: 'Access token is required' },
      { status: 400 }
    )
  }

  // Validate the token against the clients table
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('access_token', token)
    .eq('status', 'active')
    .single()

  if (error || !client) {
    return NextResponse.json(
      { error: 'Invalid or expired access token' },
      { status: 401 }
    )
  }

  // Set a cookie with the client information
  // This will be used to authenticate the client for subsequent requests
  const cookieStore = await cookies()
  cookieStore.set({
    name: 'client_session',
    value: JSON.stringify({
      id: client.id,
      coach_id: client.coach_id,
      name: client.full_name,
      authenticated: true,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const cookieStore = await cookies()
  const clientSession = cookieStore.get('client_session')?.value
  
  if (!clientSession) {
    return NextResponse.json({ authenticated: false })
  }
  
  try {
    const session = JSON.parse(clientSession)
    
    // Check if the session has expired
    if (new Date(session.expires) < new Date()) {
      cookieStore.delete('client_session')
      return NextResponse.json({ authenticated: false })
    }
    
    return NextResponse.json({
      authenticated: true,
      client: {
        id: session.id,
        coach_id: session.coach_id,
        name: session.name
      }
    })
  } catch {
    cookieStore.delete('client_session')
    return NextResponse.json({ authenticated: false })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('client_session')
  return NextResponse.json({ success: true })
}
