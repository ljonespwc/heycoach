import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    
    // Extract form fields
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const interventionType = formData.get('intervention_type') as string
    const contextTagsJson = formData.get('context_tags') as string

    // Validate required fields
    if (!name || !description || !category || !interventionType) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, description, category, and intervention type are required' 
      }, { status: 400 })
    }

    // Validate intervention type
    if (!['craving', 'energy'].includes(interventionType)) {
      return NextResponse.json({ 
        error: 'Invalid intervention type. Must be "craving" or "energy"' 
      }, { status: 400 })
    }

    // Parse context tags
    let contextTags: string[] = []
    try {
      contextTags = contextTagsJson ? JSON.parse(contextTagsJson) : []
    } catch {
      return NextResponse.json({ error: 'Invalid context tags format' }, { status: 400 })
    }

    // Determine the correct table based on intervention type
    const tableName = interventionType === 'craving' ? 'craving_interventions' : 'energy_interventions'

    // Create intervention in the appropriate table
    const { data: intervention, error: createError } = await supabase
      .from(tableName)
      .insert({
        coach_id: user.id,
        name: name.trim(),
        description: description.trim(),
        category,
        context_tags: contextTags,
        active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating intervention:', createError)
      return NextResponse.json({ 
        error: 'Failed to create intervention: ' + createError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      intervention,
      message: `${interventionType.charAt(0).toUpperCase() + interventionType.slice(1)} intervention template created successfully`
    })

  } catch (error) {
    console.error('Unexpected error creating intervention:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}