export interface CoachSettings {
  tone_preset: string
  custom_responses: Record<string, string> | null
}

export interface Coach {
  id: string
  full_name: string | null
  avatar_url: string | null
  coach_settings: CoachSettings | null
}
