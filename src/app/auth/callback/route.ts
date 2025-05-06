import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

// Define interfaces for intervention types
interface DefaultIntervention {
  id: string
  name: string
  description: string
  category?: string
  context_tags?: string[]
}

/**
 * Populates default interventions for a new coach from template tables
 * @param supabase - Supabase client
 * @param coachId - UUID of the newly created coach
 */
async function populateDefaultInterventions(supabase: SupabaseClient, coachId: string) {
  try {
    // 1. Fetch all default craving interventions
    const { data: defaultCravingInterventions, error: cravingError } = await supabase
      .from('default_craving_interventions')
      .select('*')
    
    if (cravingError) {
      console.error('Error fetching default craving interventions:', cravingError)
      return
    }
    
    // 2. Fetch all default energy interventions
    const { data: defaultEnergyInterventions, error: energyError } = await supabase
      .from('default_energy_interventions')
      .select('*')
    
    if (energyError) {
      console.error('Error fetching default energy interventions:', energyError)
      return
    }
    
    // 3. Insert default craving interventions for the coach
    if (defaultCravingInterventions && defaultCravingInterventions.length > 0) {
      const cravingInterventionsToInsert = defaultCravingInterventions.map((intervention: DefaultIntervention) => ({
        coach_id: coachId,
        name: intervention.name,
        description: intervention.description,
        category: intervention.category,
        context_tags: intervention.context_tags,
        success_rate: null,
        active: true
      }))
      
      const { error: insertCravingError } = await supabase
        .from('craving_interventions')
        .insert(cravingInterventionsToInsert)
      
      if (insertCravingError) {
        console.error('Error inserting default craving interventions:', insertCravingError)
      }
    }
    
    // 4. Insert default energy interventions for the coach
    if (defaultEnergyInterventions && defaultEnergyInterventions.length > 0) {
      const energyInterventionsToInsert = defaultEnergyInterventions.map((intervention: DefaultIntervention) => ({
        coach_id: coachId,
        name: intervention.name,
        description: intervention.description,
        category: intervention.category,
        context_tags: intervention.context_tags,
        success_rate: null,
        active: true
      }))
      
      const { error: insertEnergyError } = await supabase
        .from('energy_interventions')
        .insert(energyInterventionsToInsert)
      
      if (insertEnergyError) {
        console.error('Error inserting default energy interventions:', insertEnergyError)
      }
    }
    
    console.log(`Successfully populated default interventions for coach ${coachId}`)
  } catch (error) {
    console.error('Error in populateDefaultInterventions:', error)
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  if (code) {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      if (!data.session) {
        console.error('No session in exchange response')
        return NextResponse.redirect(new URL('/auth/login?error=no_session', request.url))
      }

      // Create coach record if it doesn't exist
      const { data: existingCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', data.session.user.id)
        .single()

      if (!existingCoach) {
        const { error: createError } = await supabase
          .from('coaches')
          .insert([{ id: data.session.user.id }])

        if (createError) {
          console.error('Error creating coach record:', createError)
          return NextResponse.redirect(new URL('/auth/login?error=coach_creation_failed', request.url))
        }
        
        // Populate default interventions for the new coach
        await populateDefaultInterventions(supabase, data.session.user.id)
      }

      // Successful authentication
      return NextResponse.redirect(new URL(next, request.url))
    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  }

  // No code present
  return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
}
