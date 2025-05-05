-- Create tables
CREATE TABLE IF NOT EXISTS coaches (
    id uuid PRIMARY KEY,
    full_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS coach_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    tone_preset text DEFAULT 'friendly'::text NOT NULL,
    custom_responses jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY,
    coach_id uuid NOT NULL REFERENCES coaches(id),
    full_name text,
    weight_goal numeric,
    habit_objectives jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS craving_interventions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id uuid NOT NULL REFERENCES coaches(id),
    name text NOT NULL,
    description text NOT NULL,
    category text,
    duration_minutes integer,
    intensity_range jsonb,
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
    duration_minutes integer,
    energy_level_range jsonb,
    intensity_level text,
    equipment_needed text[],
    success_rate numeric,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS trigger_foods (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id uuid NOT NULL REFERENCES clients(id),
    food_name text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
