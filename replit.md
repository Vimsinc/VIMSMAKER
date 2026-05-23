# VibeManager — Gerador de Conteúdo Viral com IA

## Overview
Plataforma SaaS brasileira para geração automática de conteúdo viral para criadores de conteúdo (Instagram, TikTok, YouTube). Gera ideias, carrosséis completos, legendas e hashtags usando IA.

## Architecture

### Monorepo Structure
```
artifacts/
  api-server/     - Express + TypeScript backend (port 8080)
  sanovim/        - React + Vite + TypeScript frontend (VibeManager UI)
  mockup-sandbox/ - UI prototyping sandbox (port 8081)
lib/
  api-spec/       - OpenAPI spec (openapi.yaml)
  api-client-react/ - Generated React Query hooks
  api-zod/        - Generated Zod schemas
  db/             - Drizzle ORM schema + migrations
```

### Key Design Decision: Unified Server
The frontend (sanovim) is served via Vite middleware integrated into the api-server Express app (port 8080). The sanovim workflow is not used in this setup.

- Dev: Vite dev middleware runs inside api-server → HMR works via port 8080
- Prod: Built sanovim static files served as static from api-server

### Frontend (artifacts/sanovim)
- React 19 + Vite 7 + TypeScript + Tailwind CSS v4
- Router: wouter
- State: React Query
- 6 pages: Dashboard, Generator, Images, VideoEditor, Trending, HistoryPage
- Deep navy dark theme (HSL CSS variables)

### Backend (artifacts/api-server)
- Express 5 + TypeScript + esbuild
- Database: PostgreSQL + Drizzle ORM (Supabase)
- Route modules: health, trending, generate, images, video

### Modules
1. **Generator** — Claude AI gera 3 ideias → usuário escolhe → carrossel completo (slides + legenda + hashtags)
2. **Trending** — Serper busca trending topics por nicho no Brasil, com cache 1h no DB
3. **Images** — Runware (FLUX) ou Gemini Flash / Imagen 3 para geração de imagens 1080x1350
4. **Video** — FFmpeg processa vídeo para formato Reels 9:16 + Whisper transcrição + download

### External Services
- **Claude** (Anthropic): Geração de ideias, carrosséis, legendas, hashtags
- **Runware**: Geração de imagens (FLUX Schnell)
- **Gemini** (Google): Geração de imagens Flash e Imagen 3
- **Serper**: Pesquisa de trending topics
- **OpenAI Whisper**: Transcrição de vídeo
- **FFmpeg** (system): Processamento de vídeo para Reels

### Environment Secrets
- `ANTHROPIC_API_KEY` - Claude AI
- `OPENAI_API_KEY` - Whisper
- `RUNWARE_API_KEY` - Image generation
- `GEMINI_API_KEY` - Gemini image generation
- `SERPER_KEY` - Search trends
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - PostgreSQL database

## Database Schema
Tables: `vibe_users`, `vibe_generations`, `vibe_trending_cache`

## API Routes
All routes under `/api/`:
- `/api/healthz` - Health check
- `/api/trending/suggestions` - Trending topics por nicho (com cache)
- `/api/trending/search` - Pesquisa de trending topics
- `/api/generate/ideas` - Gerar 3 ideias com Claude
- `/api/generate/carousel` - Gerar carrossel completo
- `/api/generate/legend` - Gerar legenda + hashtags
- `/api/generate/history` - Histórico de gerações
- `/api/images/generate` - Gerar imagem com Runware
- `/api/images/generate-gemini` - Gerar imagem com Gemini
- `/api/images/card-file/:filename` - Servir imagem gerada
- `/api/video/process` - Processar vídeo com FFmpeg
- `/api/video/download/:filename` - Download do vídeo processado
