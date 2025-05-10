import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
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

    const supabase = createRouteHandlerClient({ cookies })
    
    // Query the clients table to validate the access token
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, coach_id')
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
      client: {
        id: client.id,
        name: client.name,
        coachId: client.coach_id
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
