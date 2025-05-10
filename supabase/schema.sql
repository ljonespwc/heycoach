-- Create tables
CREATE TABLE IF NOT EXISTS coaches (
    id uuid PRIMARY KEY,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS coach_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    tone_preset text DEFAULT 'friendly'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    full_name text,
    email text,
    birth_date date,
    gender text,
    current_weight numeric,
    desired_weight numeric,
    habit_objectives jsonb DEFAULT '{}',
    trigger_foods jsonb DEFAULT '{}',
    engagement_start_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes text,
    access_token text UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS craving_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    name text NOT NULL,
    description text NOT NULL,
    category text,
    context_tags text[],
    success_rate numeric,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS energy_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    name text NOT NULL,
    description text NOT NULL,
    category text,
    context_tags text[],
    success_rate numeric,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS client_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES clients(id),
    intervention_type text NOT NULL CHECK (intervention_type IN ('craving', 'energy')),
    intervention_id uuid NOT NULL,
    times_used integer DEFAULT 0,
    last_used_at timestamp with time zone,
    effectiveness_rating integer CHECK (effectiveness_rating BETWEEN 1 AND 10),
    coach_notes text,
    favorite boolean DEFAULT false,
    active boolean DEFAULT true,
    coach_disabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS default_craving_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text NOT NULL,
    category text,
    context_tags text[]
);

CREATE TABLE IF NOT EXISTS default_energy_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text NOT NULL,
    category text,
    context_tags text[]
);

-- Add unique constraint for coach_settings
ALTER TABLE coach_settings 
ADD CONSTRAINT coach_settings_coach_id_key UNIQUE (coach_id);

CREATE TABLE IF NOT EXISTS craving_incidents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES clients(id),
    trigger_food_id uuid REFERENCES trigger_foods(id),
    initial_intensity integer,
    final_intensity integer,
    location text,
    context text,
    tactic_used text,
    resisted boolean,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone,
    intervention_id uuid REFERENCES craving_interventions(id),
    notify_coach boolean DEFAULT false,
    day_of_week integer,
    time_of_day time without time zone
);

CREATE TABLE IF NOT EXISTS movement_incidents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES clients(id),
    blocker_type text NOT NULL,
    energy_level integer,
    activity_completed boolean,
    activity_type text,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    intervention_id uuid REFERENCES energy_interventions(id),
    notify_coach boolean DEFAULT false,
    day_of_week integer,
    time_of_day time without time zone,
    post_energy_level integer
);
