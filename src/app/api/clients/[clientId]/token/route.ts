import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const clientId = request.url.split('/clients/')[1].split('/')[0]
  const supabase = await createClient()
  
  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Verify the client belongs to this coach
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('coach_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate a new token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex')

    // Update the client's access token
    console.log('Updating token for client:', clientId)
    const { data: updateData, error: updateError } = await supabase
      .from('clients')
      .update({ access_token: token })
      .eq('id', clientId)
      .eq('coach_id', user.id)
      .select()

    if (updateError) {
      console.error('Error updating token:', updateError)
      throw updateError
    }

    console.log('Token update result:', updateData)

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error generating token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
