import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Extract clientId from the URL
  const clientId = request.nextUrl.pathname.split('/')[3]
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify client belongs to coach
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get all client interventions
  const { data: interventions, error: interventionsError } = await supabase
    .from('client_interventions')
    .select('*')
    .eq('client_id', clientId)

  if (interventionsError) {
    return NextResponse.json({ error: 'Failed to fetch interventions' }, { status: 500 })
  }

  return NextResponse.json({ interventions })
}

export async function POST(request: NextRequest) {
  // Extract clientId from the URL
  const clientId = request.nextUrl.pathname.split('/')[3]
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify client belongs to coach
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { intervention_id, intervention_type, ...updateData } = body

    if (!intervention_id || !intervention_type) {
      return NextResponse.json(
        { error: 'Missing required fields: intervention_id and intervention_type' },
        { status: 400 }
      )
    }

    // Check if intervention exists
    const { data: existingIntervention } = await supabase
      .from('client_interventions')
      .select('id')
      .eq('client_id', clientId)
      .eq('intervention_id', intervention_id)
      .eq('intervention_type', intervention_type)
      .single()

    let result

    if (existingIntervention) {
      // Update existing record
      const { data, error } = await supabase
        .from('client_interventions')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('intervention_id', intervention_id)
        .eq('intervention_type', intervention_type)
        .select()

      if (error) throw error
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('client_interventions')
        .insert({
          client_id: clientId,
          intervention_id,
          intervention_type,
          ...updateData
        })
        .select()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ intervention: result[0] })
  } catch (error) {
    console.error('Error updating client intervention:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update intervention' },
      { status: 500 }
    )
  }
}

// Initialize client interventions for a client
export async function PUT(request: NextRequest) {
  // Extract clientId from the URL
  const clientId = request.nextUrl.pathname.split('/')[3]
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify client belongs to coach
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  try {
    // Get all craving interventions for this coach
    const { data: cravingInterventions, error: cravingError } = await supabase
      .from('craving_interventions')
      .select('id')
      .eq('coach_id', user.id)

    if (cravingError) throw cravingError

    // Get all energy interventions for this coach
    const { data: energyInterventions, error: energyError } = await supabase
      .from('energy_interventions')
      .select('id')
      .eq('coach_id', user.id)

    if (energyError) throw energyError

    // Get existing client interventions
    const { data: existingInterventions, error: existingError } = await supabase
      .from('client_interventions')
      .select('intervention_id, intervention_type')
      .eq('client_id', clientId)

    if (existingError) throw existingError

    // Create a map of existing interventions
    const existingMap = new Map()
    existingInterventions.forEach((item) => {
      existingMap.set(`${item.intervention_type}_${item.intervention_id}`, true)
    })

    // Prepare records to insert
    const recordsToInsert = []

    // Add craving interventions that don't exist yet
    for (const intervention of cravingInterventions) {
      if (!existingMap.has(`craving_${intervention.id}`)) {
        recordsToInsert.push({
          client_id: clientId,
          intervention_id: intervention.id,
          intervention_type: 'craving',
          active: true,
          times_used: 0,
          favorite: false
        })
      }
    }

    // Add energy interventions that don't exist yet
    for (const intervention of energyInterventions) {
      if (!existingMap.has(`energy_${intervention.id}`)) {
        recordsToInsert.push({
          client_id: clientId,
          intervention_id: intervention.id,
          intervention_type: 'energy',
          active: true,
          times_used: 0,
          favorite: false
        })
      }
    }

    // Insert new records if there are any
    const result = { inserted: 0 }
    if (recordsToInsert.length > 0) {
      const { error } = await supabase
        .from('client_interventions')
        .insert(recordsToInsert)

      if (error) throw error
      result.inserted = recordsToInsert.length
    }

    return NextResponse.json({
      message: `Initialized ${result.inserted} client interventions`,
      result
    })
  } catch (error) {
    console.error('Error initializing client interventions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize interventions' },
      { status: 500 }
    )
  }
}
