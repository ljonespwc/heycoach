# HeyCoach - Project Documentation for Claude

## Overview
HeyCoach is a Next.js-based fitness coaching platform that provides on-demand support for clients during cravings and motivation slumps. It features a dual-interface system: a coach dashboard and a client portal for real-time intervention delivery.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.3.1 (App Router)
- **Runtime**: React 19.0.0
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Supabase Auth
- **State Management**: React Query (@tanstack/react-query)
- **UI Components**: Headless UI, Heroicons, Lucide React
- **Toast Notifications**: Sonner
- **PWA**: next-pwa for mobile app functionality
- **AI**: OpenAI GPT integration for coach responses

### Project Structure
```
src/
├── app/                          # Next.js App Router
│   ├── (coach)/                  # Coach dashboard routes
│   │   ├── clients/              # Client management
│   │   ├── dashboard/            # Main coach dashboard
│   │   └── profile/              # Coach profile
│   ├── api/                      # API routes
│   │   ├── client-portal/        # Client portal auth
│   │   ├── clients/              # Client CRUD operations
│   │   └── profile/              # Profile management
│   ├── auth/                     # Authentication pages
│   ├── client-portal/            # Client-facing pages
│   └── globals.css               # Global styles
├── components/                   # Reusable components
│   ├── client-portal/            # Client portal components
│   ├── clients/                  # Client management components
│   ├── forms/                    # Form components
│   ├── interventions/            # Intervention management
│   ├── nav/                      # Navigation components
│   ├── profile/                  # Profile components
│   └── ui/                       # Base UI components
├── lib/                          # Utility libraries
│   ├── client-portal/            # Client portal logic
│   └── supabase/                 # Database clients
├── middleware/                   # Authentication middleware
└── types/                        # TypeScript type definitions
```

## Database Schema

### Core Tables
- **coaches**: Coach profiles and settings
- **clients**: Client information and preferences
- **craving_interventions**: Strategies for managing cravings
- **energy_interventions**: Tactics for motivation/movement
- **craving_incidents**: Records of craving episodes
- **movement_incidents**: Records of energy/motivation episodes
- **client_sos_messages**: Chat messages between clients and system

### Key Relationships
- Coaches have many clients
- Clients have many interventions (both craving and energy)
- Incidents track real-time client interactions
- Messages belong to specific incidents

## Core Features

### Coach Dashboard
- **Client Management**: Add, edit, and monitor clients
- **Intervention Library**: Customize strategies for clients
- **Dashboard**: Overview of client activity and incidents
- **Profile Management**: Coach settings and customization

### Client Portal
- **Craving SOS**: Real-time support for food cravings
- **Movement Support**: Motivation for physical activity
- **PWA Capability**: Installable mobile app experience
- **Token-based Access**: Secure, shareable client links

### Conversation Flow
The craving support follows a structured conversation with AI-powered natural responses:
1. **WELCOME**: Initial greeting and assessment
2. **IDENTIFY_CRAVING**: Food selection and identification  
3. **GAUGE_INTENSITY**: Rate craving intensity (1-10)
4. **IDENTIFY_LOCATION**: Where the craving is happening
5. **IDENTIFY_TRIGGER**: Context/emotional trigger
6. **SUGGEST_TACTIC**: AI-powered intervention suggestion
7. **ENCOURAGEMENT**: Support during intervention
8. **RATE_RESULT**: Post-intervention effectiveness rating
9. **CLOSE**: Session completion

### AI Integration (GPT-4.1-mini)
**Enhanced Coach Responses**: The conversation flow uses OpenAI GPT-4.1-mini to generate natural, contextual coach responses while maintaining the structured data collection process.

**Smart Intervention Selection**: New AI-powered system intelligently selects primary and secondary interventions based on comprehensive client context.

**Key Features:**
- **Contextual Awareness**: AI responses reference client name, specific food craving, intensity level, location, and trigger
- **Natural Language**: Conversations feel more human-like while preserving therapeutic structure
- **Smart Interventions**: LLM selects most effective interventions based on craving type, intensity, location, trigger, time of day, and client's available strategies
- **Dual Selection**: AI picks both primary and secondary interventions simultaneously, ensuring no duplication
- **Intelligence Factors**: Considers intervention categories, complementary strategies, time-based appropriateness, and contextual effectiveness
- **Robust Fallbacks**: Automatic fallback to hardcoded responses if AI service fails
- **Cost Efficient**: Using GPT-4.1-mini (~$0.0005 per conversation + ~$0.002 per smart selection) for optimal cost-performance balance
- **Personalized Tone**: AI adopts the coach's persona and maintains warm, non-judgmental communication

**Implementation:**
- `src/lib/openai/coach-ai.ts`: OpenAI service with step-specific prompts
- `src/app/api/ai/smart-interventions/route.ts`: Smart intervention selection endpoint using GPT-4.1-mini
- `src/lib/client-portal/smart-interventions.ts`: Client-side functions for intelligent intervention selection
- Context tracking across conversation steps for personalized responses
- Error handling with graceful degradation to standard responses
- Smart selection triggered automatically when all context is collected (food, intensity, location, trigger)

## Development Commands

```bash
# Development server
npm run dev                    # Main app on port 3000
npm run dev:client-portal      # Client portal on port 3001

# Build and deployment
npm run build                  # Production build
npm start                     # Start production server
npm run lint                  # ESLint code checking
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key for AI responses

## MCP Server Access
- **Supabase MCP Server**: `supabase-heycoach` available for database operations
- **Project ID**: `tikeyswnstrdpernoysw`
- Use MCP tools prefixed with `mcp__` for direct database access when needed

## Key Components

### CravingService (`src/lib/client-portal/craving-service.ts`)
Central service managing client-coach interactions:
- Session initialization and token validation
- Message processing and database operations
- Conversation flow management
- AI response integration

### Middleware (`src/middleware.ts`)
Handles authentication routing:
- Coach authentication for dashboard routes
- Bypasses auth for client portal routes
- Supabase session management

### Database Utilities (`src/lib/client-portal/craving-db.ts`)
Database operations for client portal:
- Client/coach information retrieval
- Incident creation and updates
- Message storage and retrieval

## Styling System

### CSS Variables
Custom properties for theming:
- Primary: Purple gradient (`--primary`)
- Secondary: Orange gradient (`--secondary`) 
- Accent: Pink gradient (`--accent`)
- Light/dark mode support

### Custom Classes
- `.crave-bubble`: Craving intervention styling
- `.move-bubble`: Movement intervention styling
- `.chat-bubble`: Animated message appearance
- `.gradient-text`: Multi-color gradient text

## Authentication Flow

### Coach Authentication
- Supabase Auth with session management
- Middleware protection for dashboard routes
- Profile management and settings

### Client Authentication
- Token-based access system
- No account required for clients
- PWA-friendly with localStorage persistence

## API Endpoints

### Client Management
- `POST /api/clients/create`: Create new client
- `PUT /api/clients/update`: Update client information
- `GET /api/clients/[clientId]/interventions`: Get client interventions
- `POST /api/clients/[clientId]/token`: Generate access token

### Client Portal
- `GET /api/client-portal/auth`: Validate client session
- `GET /api/client/validate-token`: Validate client token

## Recent Changes (from git commits)
- Auto-focus input field after coach messages in craving SOS chat
- Pass stored selectedFood to coach response in craving service  
- Remove selectedFood references from craving conversation flow
- Persist selected food across conversation steps
- Simplified craving prompt text for better user engagement

## Development Notes

### Code Style
- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Tailwind CSS for styling
- Component composition pattern

### Database Patterns
- UUID primary keys
- Timestamp tracking (created_at, updated_at)
- JSON fields for flexible data storage
- Soft deletes with active/inactive status

### Security Policies (RLS)
**IMPORTANT**: All database tables are protected with Row Level Security (RLS). Security audit completed Aug 2025.

**Key Security Features:**
- **Multi-tenant isolation**: Coaches can only access their own clients and data
- **Token-based client access**: Client portal validates access via `get_client_from_token()`
- **Anonymous client portal access**: Secure policies for client-side Supabase operations
- **Comprehensive policies**: 35+ RLS policies across 11 tables ensuring data privacy
- **Helper functions**: Secure ownership validation with proper `search_path` settings

**Security Functions:**
- `public.get_client_from_token()`: Validates client portal access via token (header-based)
- `public.user_owns_client(uuid)`: Checks if authenticated coach owns a client
- `public.user_owns_message_incident(uuid, text)`: Validates coach access to messages
- `public.client_owns_message_incident(uuid, text)`: Validates client access to messages

**Access Patterns:**
- **Coaches (authenticated)**: Own clients, interventions, incidents, messages only
- **Client Portal (anonymous/public)**: 
  - Create/view incidents for valid token-holding clients
  - Create/view messages for valid incidents
  - View coach info for their assigned coach
  - Update own client data (limited fields)
- **Server-side (service_role)**: Token validation queries for authentication
- **Default Tables**: Read-only access for reference data

**Client Portal RLS Policies:**
- `client_portal_view_coaches`: Access coach data for token-validated clients
- `client_portal_create_incidents`: Create craving/movement incidents
- `client_portal_create_messages`: Save chat messages to incidents
- `client_portal_view_messages`: View incident message history
- `allow_anonymous_token_validation`: Enable token-based authentication
- `allow_server_token_validation`: Enable server-side token validation

### Error Handling
- Silent fallbacks for client portal functionality
- Toast notifications for user feedback
- Console logging for debugging

## Testing Strategy
No test framework currently configured. Consider adding:
- Jest for unit tests
- Playwright for e2e tests
- React Testing Library for component tests

## Deployment Considerations
- Next.js production build required
- Environment variables must be configured
- Supabase database migrations needed
- PWA assets generated during build