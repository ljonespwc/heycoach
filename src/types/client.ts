export interface Client {
  id: string;
  coach_id: string;
  full_name: string;
  email: string;
  birth_date: string | null;
  gender: string | null;
  current_weight: number | null;
  desired_weight: number | null;
  habit_objectives: Record<string, boolean | string | number> | null;
  trigger_foods: Record<string, boolean | string | number> | null;
  engagement_start_date: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  access_token: string | null;
}
