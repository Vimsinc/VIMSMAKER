# SANOVIM — Marketing Médico com IA

## Overview
Full-stack Brazilian medical marketing SaaS platform for 3 accounts:
- **Dr. Daniel** (Tricologia)
- **Enf. Angélica** (Enfermagem Estética)  
- **Loysby** (Medicina Esportiva)

## Architecture

### Monorepo Structure
```
artifacts/
  api-server/     - Express + TypeScript backend (port 8080)
  sanovim/        - React + Vite + TypeScript frontend
  mockup-sandbox/ - UI prototyping sandbox (port 8081)
lib/
  api-spec/       - OpenAPI spec (openapi.yaml)
  api-client-react/ - Generated React Query hooks
  api-zod/        - Generated Zod schemas
```

### Key Design Decision: Unified Server
The frontend (sanovim) is served via Vite middleware integrated into the api-server Express app (port 8080). This avoids the need for a separate frontend port. The sanovim workflow is not used in this setup.

- Dev: Vite dev middleware runs inside api-server → HMR works via port 8080
- Prod: Built sanovim static files served as static from api-server

### Frontend (artifacts/sanovim)
- React 19 + Vite 7 + TypeScript + Tailwind CSS v4
- Router: wouter
- State: React Query + AccountContext
- 7 pages: Dashboard, Content, Images, Metrics, Publish, VideoEditor, Market
- Deep navy dark theme (HSL CSS variables)
- AccountSelector: switch between 3 medical accounts globally

### Backend (artifacts/api-server)
- Express 5 + TypeScript + esbuild
- Database: PostgreSQL + Drizzle ORM (Supabase)
- 6 route modules: auth, content, images, metrics, publishing, video, market

### 6 Modules
1. **Content** - Claude AI post/reels generation, trends via Serper, history
2. **Images** - Runware AI image generation, professional card creation (Sharp compositing pipeline), history
3. **Metrics** - Instagram Graph API metrics, growth data, best posting times, top posts
4. **Publishing** - Publish/schedule posts to Instagram, history, cancel scheduled
5. **Video** - OpenAI Whisper transcription, video processing for Reels format
6. **Market** - Market trends (Serper), seasonality suggestions, monthly report

### External Services
- **Claude** (Anthropic): Content generation (posts, reels scripts, market analysis)
- **Runware**: AI image generation
- **Serper**: Google search for medical trends
- **Instagram Graph API**: Metrics and publishing (with mock fallbacks)
- **OpenAI Whisper**: Video transcription

### Environment Secrets
- `ANTHROPIC_API_KEY` - Claude AI
- `OPENAI_API_KEY` - Whisper
- `RUNWARE_API_KEY` - Image generation
- `SERPER_KEY` - Search trends
- `INSTAGRAM_TOKEN_ANGELICA/DRDANIEL/LOYSBY` - Instagram API tokens
- `INSTAGRAM_USER_ID_ANGELICA/DRDANIEL/LOYSBY` - Instagram User IDs
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - PostgreSQL database
- `SESSION_SECRET` - Session management

## Database Schema
Tables: `content_history`, `images_history`, `publishing`, `videos_history`

## API Routes
All routes under `/api/`:
- `/api/healthz` - Health check
- `/api/auth/*` - Session management
- `/api/content/*` - Content generation + history + trends
- `/api/images/*` - Image generation + cards + history
- `/api/metrics/*` - Instagram metrics per account
- `/api/publishing/*` - Post publishing + scheduling
- `/api/video/*` - Video processing + history
- `/api/market/*` - Market trends + seasonality + monthly report
