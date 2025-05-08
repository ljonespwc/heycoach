import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Get and validate form data
  const formData = await request.formData()
  const id = formData.get('id') as string
  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const birth_date = formData.get('birth_date') as string
  const gender = formData.get('gender') as string
  const current_weight = formData.get('current_weight') ? parseFloat(formData.get('current_weight') as string) : null
  const desired_weight = formData.get('desired_weight') ? parseFloat(formData.get('desired_weight') as string) : null
  const engagement_start_date = formData.get('engagement_start_date') as string
  const status = formData.get('status') as string
  const notes = formData.get('notes') as string
  const habit_objectives = formData.get('habit_objectives') ? JSON.parse(formData.get('habit_objectives') as string) : {}
  const trigger_foods = formData.get('trigger_foods') ? JSON.parse(formData.get('trigger_foods') as string) : []

  // Simple validations
  if (!id) {
    return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
  }
  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }
  if (!birth_date) {
    return NextResponse.json({ error: 'Birth date is required' }, { status: 400 })
  }
  if (!gender) {
    return NextResponse.json({ error: 'Gender is required' }, { status: 400 })
  }
  if (!status || !['active', 'inactive'].includes(status)) {
    return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
  }

  try {
    // Verify the client belongs to this coach
    const { data: existingClient, error: verifyError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('coach_id', user.id)
      .single()
    
    if (verifyError || !existingClient) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    // Update client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .update({
        full_name,
        email: email || null,
        birth_date: birth_date || null,
        gender,
        current_weight,
        desired_weight,
        habit_objectives,
        engagement_start_date: engagement_start_date || null,
        status,
        notes: notes || null
      })
      .eq('id', id)
      .eq('coach_id', user.id)
      .select()
      .single()
    
    if (clientError) throw clientError

    // Handle trigger foods - first delete existing ones
    const { error: deleteError } = await supabase
      .from('trigger_foods')
      .delete()
      .eq('client_id', id)
    
    if (deleteError) {
      console.error('Error deleting existing trigger foods:', deleteError)
      // Continue even if deletion fails
    }

    // Add new trigger foods if any
    if (trigger_foods.length > 0) {
      // Remove duplicates from trigger_foods array
      const uniqueTriggerFoods = Array.from(new Set(trigger_foods)) as string[]
      
      const triggerFoodsData = uniqueTriggerFoods.map((food) => ({
        client_id: id,
        food_name: food,
        category: null // Category could be added in a future enhancement
      }))

      const { error: triggerFoodsError } = await supabase
        .from('trigger_foods')
        .insert(triggerFoodsData)
      
      if (triggerFoodsError) {
        console.error('Error adding trigger foods:', triggerFoodsError)
        // Continue even if trigger foods insertion fails
      }
    }

    return NextResponse.json(client)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update client'
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
