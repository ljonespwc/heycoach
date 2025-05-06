export interface BaseIntervention {
  id: string;
  name: string;
  description: string;
  category: string | null;
  context_tags: string[] | null;
  active: boolean;
}

export interface CravingIntervention extends BaseIntervention {
  coach_id: string;
  success_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnergyIntervention extends BaseIntervention {
  coach_id: string;
  success_rate: number | null;
  created_at: string;
  updated_at: string;
}
