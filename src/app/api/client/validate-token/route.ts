import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Create anonymous Supabase client for token validation only
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Query the clients table to validate the access token
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, full_name, coach_id')
      .eq('access_token', token)
      .single()

    if (error || !client) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      )
    }

    // Set a cookie with the client's ID
    // Create a new response with the client data
    const response = NextResponse.json({
      valid: true,
      clientId: client.id,
      coachId: client.coach_id,
      client: {
        id: client.id,
        name: client.full_name,
        full_name: client.full_name,
        coach_id: client.coach_id  // Use consistent property name
      }
    })

    // Set the cookie in the response
    response.cookies.set('client_id', client.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
