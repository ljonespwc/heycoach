// Types and enums extracted from craving-service.ts

export type MessageSender = 'coach' | 'client' | 'system';
export type MessageType = 'text' | 'option_selection' | 'intensity_rating' | 'location_selection' | 'tactic_response' | 'followup_response';

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  type: MessageType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
}

export interface CravingIncident {
  id: string;
  clientId: string;
  triggerFood: string;
  initialIntensity: number;
  result_rating?: number;
  location?: string;
  context?: string;
  tacticUsed?: string;
  createdAt: Date;
  resolvedAt?: Date;
  interventionId?: string;
}

export interface Coach {
  id: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
}

export interface Client {
  id: string;
  coach_id: string;
  full_name: string;
  email?: string;
  status: string;
  created_at: string;
}

export enum ConversationStep {
  WELCOME = 'welcome',
  IDENTIFY_CRAVING = 'identify_craving',
  GAUGE_INTENSITY = 'gauge_intensity',
  IDENTIFY_LOCATION = 'identify_location',
  IDENTIFY_TRIGGER = 'identify_trigger',
  SUGGEST_TACTIC = 'suggest_tactic',
  CONSENT_CHECK = 'consent_check',
  ENCOURAGEMENT = 'encouragement',
  FOLLOWUP = 'followup',
  RATE_RESULT = 'rate_result',
  CLOSE = 'close',
}
