# TUMmy

TUMmy is a Next.js dashboard and assistant for TUM student workflows.

It combines:
- Campus widgets (Mensa, NavigaTUM, transit, rooms)
- An Agent API pipeline (Cognee retrieval + Gemini/Vertex generation)
- Action-oriented assistant flows (calendar, reminders, email drafts, watchlists)
- Guest/member session modes with scoped chat history

## Current Status

This repository is actively developed and includes both production-style integrations and demo-style modules.

Live integrations:
- Mensa (`TUM-Dev Eat API`, with OpenMensa fallback)
- NavigaTUM search/location/route
- MVG departures (U6 at Garching Forschungszentrum)
- TUM NAT room data
- Agent API with Cognee retrieval + LLM generation

Demo/local behavior:
- Login is session-based mock auth (not real TUM SSO)
- Some dashboard content is static/demo-oriented
- Guest mode intentionally limits capabilities and reliability

## Tech Stack

- Next.js `16.2.4` (App Router)
- React `19`
- TypeScript (strict)
- Node.js `>=20.9.0`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` and configure at least one LLM path plus Cognee (recommended for grounded chat).

3. Start development server:

```bash
npm run dev
```

4. Open:

- `http://localhost:3000` (dashboard)
- `http://localhost:3000/chatbot` (standalone chatbot)

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Production build
- `npm run start` - Run built app
- `npm run cognee:seed` - Seed Cognee with local docs (`README.md`, `tum_systems.md`) and trigger cognify

## Environment Variables

### LLM provider selection

- `LLM_PROVIDER=vertex|gemini`

If `LLM_PROVIDER` is not set, provider auto-selection uses Vertex when Vertex hints are present, otherwise Gemini.

### Gemini (direct API)

- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- Optional legacy aliases: `LLM_KEY`, `LLM_API_KEY`
- `LLM_MODEL` (default: `gemini-2.5-flash`)

### Vertex AI

Required:
- `LLM_PROVIDER=vertex`
- `VERTEX_PROJECT_ID`

Optional:
- `VERTEX_LOCATION` (default: `us-central1`)
- `VERTEX_MODEL` (fallback used by `LLM_MODEL` resolution)
- `VERTEX_AUTH_MODE=api_key|bearer`
- `VERTEX_API_KEY` (when auth mode is `api_key`)
- `VERTEX_BEARER_TOKEN` or `GOOGLE_OAUTH_ACCESS_TOKEN` (when auth mode is `bearer`)

Notes:
- Vertex path is fail-fast: if required Vertex config is missing, request fails instead of silently falling back.

### Cognee retrieval

Required for retrieval:
- `COGWIT_API_BASE`
- `COGWIT_API_KEY`

Optional:
- `COGWIT_SEARCH_PATH` (default tries multiple endpoint candidates)
- `COGWIT_TIMEOUT_MS` (default `4500`)
- `COGWIT_TOP_K` (default `6`)
- `COGWIT_SEARCH_TYPE` (default `GRAPH_COMPLETION`)
- `COGWIT_TENANT_ID`
- `COGWIT_DATASET_NAME`

### Debug behavior

- `CHAT_DEBUG=1`

Debug payloads are only returned when `CHAT_DEBUG=1` and the request is from localhost.

## App Structure

```text
src/
  app/
    api/
      chat/
      agent/enrich-email/
      public/
    chatbot/
    login/
    roomfinder/
  components/home/
    details/
    tiles/
    copilot/
    data/
  lib/
    auth-session.ts
    calendar-custom-events.ts
    calendar-course-overrides.ts
    chat-agent-actions.ts
    copilot-context.ts
  server/
    chat/
      cognee.ts
      dashboard-context.ts
    public-campus/
      mensa.ts
      navigatum.ts
      transit.ts
      tum-nat.ts
      fetch-json.ts
scripts/
  cognee-seed.mjs
```

## Authentication and Modes

Auth is client-side session mock auth:
- Session keys: `isLoggedIn`, `accountType`
- Account types: `member`, `guest`

Guest mode:
- Restricted tile visibility on dashboard
- Agent endpoint runs in sandbox mode (no live retrieval or external LLM calls)
- Action workflows are blocked in Copilot Action Center
- Chat history is scoped by account type to prevent guest/member leakage

## Agent API Pipeline

Main Agent API route: `POST /api/chat`

Flow:
1. Validate incoming message history
2. If guest mode: return sandbox/demo response
3. Retrieve context from Cognee (`retrieveCogneeContext`)
4. Build runtime dashboard context snapshot
5. Compose system context + grounding rules
6. Call selected LLM provider (Vertex or Gemini)
7. Return response + retrieval metadata (+ optional localhost debug)

The frontend (`useCopilotChat`) parses assistant output for structured actions using `<agent_action>{...}</agent_action>` blocks.

Supported action types:
- `calendar_add`
- `calendar_sync_export`
- `calendar_export_custom_week`
- `calendar_sync_google`
- `email_draft`
- `reminder_add`
- `course_watch_add`
- `course_registration_assist`
- `open_url`

## Calendar Features

Calendar supports two editable layers:

1. Custom entries (`calendar-custom-events`):
- Add/edit/delete
- Recurrence: `weekly`, `monthly`, `once`
- Stored in localStorage (`tummy.custom-calendar-events.v1`)

2. Built-in course overrides (`calendar-course-overrides`):
- Edit default module entries
- Hide/restore default entries
- Stored in localStorage (`tummy.calendar.course-overrides.v1`)

## API Endpoints

### Agent API

- `POST /api/chat`
  - Role: Main Agent API orchestration endpoint
  - Body: `{ messages, calendarEvents?, guestMode? }`
  - Returns: assistant reply, provider, retrieval metadata, optional localhost debug

- `POST /api/agent/enrich-email`
  - Resolves placeholder/role recipient emails via Cognee context

### Public campus data

- `GET /api/public/mensa?canteenId=&referenceDate=`
- `GET /api/public/transit/garching-forschungszentrum?limit=`
- `GET /api/public/tum/rooms?campusId=&limit=`
- `GET /api/public/navigatum/search?q=&limit=`
- `GET /api/public/navigatum/locations/[id]`
- `GET /api/public/navigatum/route?from=&to=&routeCosting=&time=&arriveBy=&lang=`

## Data and Caching Notes

- Public connector fetches use a shared wrapper with:
  - JSON accept headers
  - 10s timeout
  - Route-specific revalidate windows
- Mensa connector uses Eat API first, then OpenMensa fallback
- Transit endpoint filters MVG departures to U6 at Garching Forschungszentrum

## Local Storage Keys (Operational)

Common keys used by app behavior:
- `isLoggedIn`
- `accountType`
- `tummy.copilot.chat-history.member`
- `tummy.copilot.chat-history.guest`
- `tummy.custom-calendar-events.v1`
- `tummy.calendar.course-overrides.v1`
- `tummy.course.watchlist.v1`
- `tummy.course.registration.requests.v1`
- `tummy.personal.reminders.v1`

## Known Limitations

- Login page UI mirrors TUM style but does not perform real TUM SSO backend verification.
- Some dashboard modules remain static/demo-oriented.
- Guest mode intentionally serves non-authoritative responses.

## Contribution Notes

- Keep API wrappers in `src/server/public-campus/*` as the only place external payloads are normalized.
- Keep client components free from direct external API calls.
- For Agent API changes, preserve provider fail-fast behavior and localhost-only debug gating.
- For calendar changes, keep custom events and built-in course overrides as separate layers.
