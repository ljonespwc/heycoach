# HeyCoach - Project Documentation for Claude

## Overview
HeyCoach is a Next.js-based fitness coaching platform that provides on-demand support for clients during cravings and motivation slumps. It features a coach dashboard and a client portal for real-time intervention delivery.

## Tech Stack
- **Framework**: Next.js 15.3.1 (App Router)
- **Runtime**: React 19.0.0
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4.1-mini for coach responses
- **PWA**: Mobile app functionality

## Core Features

### Coach Dashboard
- Client management and intervention customization
- Activity monitoring and dashboard overview

### Client Portal - Unified Support Flow (Aug 2025)
- **Single Entry Point**: "Get Support" button that branches based on struggle type
- **Craving SOS**: 9-step structured conversation for food cravings
- **Energy Boost**: 9-step structured conversation for motivation/movement
- **AI Integration**: Natural coach responses with smart intervention selection
- **PWA**: Installable mobile experience with token-based access

### Conversation Flow Steps
1. **IDENTIFY_STRUGGLE**: What are you struggling with? (craving/energy)
2. **WELCOME**: Greeting and assessment
3. **IDENTIFY_CRAVING/BLOCKER**: Food selection or movement barrier
4. **GAUGE_INTENSITY/ENERGY**: Rate intensity/energy level (1-10)
5. **IDENTIFY_LOCATION**: Current location context
6. **IDENTIFY_TRIGGER/GOAL**: Emotional trigger or activity preference
7. **SUGGEST_TACTIC**: AI-powered intervention suggestion
8. **ENCOURAGEMENT**: Support during intervention
9. **RATE_RESULT**: Effectiveness rating
10. **CLOSE**: Session completion

## Database Schema
- **coaches**: Coach profiles
- **clients**: Client information  
- **craving_interventions/energy_interventions**: Support strategies
- **craving_incidents/movement_incidents**: Session records
- **client_sos_messages**: Chat messages

## Development Commands
- `npm run dev`: Development server (port 3000)
- `npm run build`: Production build
- `npm run lint`: Code checking

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key

## MCP Server Access
- **Supabase MCP Server**: `supabase-heycoach`
- **Project ID**: `tikeyswnstrdpernoysw`

## Recent Implementation (Aug 2025)

### Unified Conversation Flow
- Merged separate craving/energy entry points into single "Get Support" flow
- Created `UnifiedService` to orchestrate `CravingService` and `EnergyService`
- Dynamic UI theming based on support type (purple=craving, orange=energy)
- Context-aware Likert scale colors:
  - **Effectiveness Rating**: Green=effective, Red=ineffective
  - **Energy Level**: Green=high energy, Red=low energy
  - **Craving Intensity**: Green=low craving, Red=high craving

### Key Files
- `src/app/client-portal/home/support/page.tsx`: Unified conversation UI
- `src/lib/client-portal/unified-service.ts`: Service orchestration
- `src/app/client-portal/home/page.tsx`: Single entry point

## Security (RLS)
All tables protected with Row Level Security. Coaches access own clients only. Client portal uses token-based anonymous access with specific policies for incidents and messages.

## Authentication
- **Coaches**: Supabase Auth with middleware protection
- **Clients**: Token-based access, no accounts required

## Recent Fixes

### Aug 9, 2025 - Fixed Intervention Tracking Mismatch
Fixed issue where encouragement step mentioned wrong intervention (secondary instead of primary). Problem was services weren't setting `isSecondInterventionAccepted` flag when user accepted secondary intervention after "Another idea". Added detection logic in both `craving-service.ts` and `energy-service.ts` to properly flag secondary intervention acceptance based on intervention array length and ID matching.