# TUMmy

TUMmy is a campus dashboard plus student agent for TUM.

The idea is simple:

- TUM students have to jump between many separate websites and tools.
- Important information is scattered across TUM pages, campus systems, maps, cafeteria data, and transit pages.
- TUMmy puts the important parts into one interface and adds a `UNI Copilot` that helps students understand, organize, and eventually automate their university work.

The long-term goal is not just to show information. It is to build a campus operating layer on top of the TUM web ecosystem: one place that watches TUM sources, remembers what matters for the student, and suggests or prepares the next useful action.

## What This Project Is About

TUMmy is built around one problem:

> TUM students live inside a fragmented service jungle.

Schedules, rooms, deadlines, campus navigation, cafeteria menus, and transport information all live in different places. The project turns that into one student-facing system with:

- a dashboard for the most relevant TUM information
- a `UNI Copilot` for help and campus context
- an agent architecture that can remember TUM knowledge and student context
- automation-oriented planning for things like deadline alerts, room changes, and opportunity discovery

In short: this project is about displaying the important TUM web services in one place and adding an agent that helps students work less manually.

## What Works In The Current Repo

The current checkout already contains a working Next.js app with live public data integrations.

### Live in the dashboard

- `Mensa`: live menu data from the TUM-Dev Eat API, with OpenMensa fallback
- `TUMonline` tile: public room data via the TUM Natural Sciences API
- `Campus Finder`: live location search and details via NavigaTUM, available inside the `UNI Copilot` detail view
- `Garching U-Bahn`: live U6 departures for `Garching, Forschungszentrum` via the MVG API
- `Chatbot`: a server-side Bedrock-backed chat route

### Still demo or placeholder in the current source

- `Calendar`: local demo data
- `Moodle`: local demo data
- `Login`: mock login flow, not real TUM SSO
- authenticated TUM systems and real write actions are not wired yet

That distinction matters: the public data layer is already real, while the full autonomous campus agent is only partially surfaced in the web UI today.

## How The Backend Works

The web app is a Next.js app. The backend is built around internal API routes in `src/app/api`.

The important design rule is:

> the browser never talks directly to the external campus APIs.

Instead, every widget calls an internal route, and the route calls a server-side connector.

### Data flow

```text
Dashboard widget / UI
        |
        v
Internal Next.js API route in src/app/api/*
        |
        v
Server-only connector in src/server/public-campus/*
        |
        v
External public API
        |
        v
Normalized typed payload in src/lib/public-campus-types.ts
        |
        v
UI widget renders a stable internal shape
```

### Why this structure is useful

- the frontend stays simple
- external API quirks are hidden behind one backend layer
- upstream responses are normalized into stable app-specific types
- rate limiting, timeouts, and cache revalidation stay on the server
- later authenticated sources can be added without rewriting the UI

### Shared backend utility

`src/server/public-campus/fetch-json.ts` is the common fetch helper for public connectors.

It gives us:

- `server-only` execution
- a 10 second timeout
- JSON-only fetch handling
- Next.js revalidation support
- one place to enforce consistent upstream behavior

## Public API Routes In This Repo

| Internal route | Connector | External source | Purpose |
| --- | --- | --- | --- |
| `POST /api/chat` | `src/app/api/chat/route.ts` | AWS Bedrock | chat replies for the chatbot page |
| `GET /api/public/mensa` | `src/server/public-campus/mensa.ts` | TUM-Dev Eat API, OpenMensa fallback | cafeteria dishes and prices |
| `GET /api/public/tum/rooms` | `src/server/public-campus/tum-nat.ts` | TUM NAT API | public room and lecture hall data |
| `GET /api/public/navigatum/search` | `src/server/public-campus/navigatum.ts` | NavigaTUM | campus search |
| `GET /api/public/navigatum/locations/[id]` | `src/server/public-campus/navigatum.ts` | NavigaTUM | room/building details |
| `GET /api/public/navigatum/route` | `src/server/public-campus/navigatum.ts` | NavigaTUM | route lookup |
| `GET /api/public/transit/garching-forschungszentrum` | `src/server/public-campus/transit.ts` | MVG API | U6 departures for Garching Forschungszentrum |

## The Current Web Backend, Explained Simply

### 1. UI widgets call internal routes

Examples:

- `MensaTile` calls `/api/public/mensa`
- `TumOnlineTile` calls `/api/public/tum/rooms`
- `TransitTile` calls `/api/public/transit/garching-forschungszentrum`
- `CopilotDetail` calls `/api/public/navigatum/search` and `/api/public/navigatum/locations/[id]`

### 2. Internal routes call connector functions

Each route keeps logic thin and moves real integration work into `src/server/public-campus`.

That means:

- route handlers parse query params
- connector files call upstream APIs
- connector files normalize the response
- the route returns the normalized payload to the browser

### 3. The app owns the response shape

All public campus responses are typed in `src/lib/public-campus-types.ts`.

This is important because it decouples the UI from raw upstream formats. If an external API changes, only the connector needs to change.

## How `UNI Copilot` Works Today

`UNI Copilot` currently has two layers:

### 1. The dashboard tile

The compact `UNI Copilot` tile is a lightweight entry point on the home screen.

It lives in:

- `src/components/home/tiles/CopilotTile.tsx`

### 2. The detail view

When opened, the copilot detail currently shows:

- a link into the chatbot
- live campus lookup via NavigaTUM
- building and room detail lookup

It lives in:

- `src/components/home/details/CopilotDetail.tsx`

So in the current repo, the `UNI Copilot` is already the place where campus help starts, but it is not yet fully connected to the autonomous memory pipeline.

## How The Chat Backend Works

The chat endpoint is:

- `src/app/api/chat/route.ts`

It currently works like this:

1. The browser sends the message history to `POST /api/chat`
2. The backend normalizes the messages
3. The backend calls AWS Bedrock
4. The route returns the text reply

### Current chat model setup

The route supports:

- bearer-token auth through `BEDROCK_API_KEY` or `AWS_BEARER_TOKEN`
- AWS credential auth through `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- configurable region through `BEDROCK_REGION`
- configurable model through `BEDROCK_MODEL_ID`

Default model in the current code:

- `us.anthropic.claude-3-5-haiku-20241022-v1:0`

### Important current limitation

The web chat route currently talks directly to Bedrock.

It does not yet retrieve memory from the campus-agent worker or from `cognee`. So the web chat is live, but the full TUM memory layer is still an architectural layer rather than a finished UI integration.

## How The Campus Agent Uses `cognee` For Memory

This repo also contains a separate campus-agent architecture under `workers/campus_agent`.

Important: in this checkout, that Python part is only present as compiled `.pyc` artifacts in `workers/campus_agent/__pycache__`, not as editable source files. But the structure is still clear from the artifacts.

### The job of the memory layer

The agent needs memory for two things:

- memory about TUM and the project world
- memory about what matters to a student right now

That means it should remember things like:

- course names
- room changes
- deadlines
- TUM opportunity pages
- campus locations
- previously seen alerts
- relationships between topics, labs, buildings, courses, and tasks

### The normalized memory unit: `SourceDocument`

The worker pipeline uses a normalized document shape called `SourceDocument`.

From the artifacts, it contains fields such as:

- `source_id`
- `source_name`
- `item_id`
- `title`
- `summary`
- `content`
- `timestamp`
- `kind`
- `metadata`

That is the key idea: different TUM sources are first converted into one shared document format before memory is built.

### The sources the agent is built to ingest

From the worker fixture loader, the agent pipeline is designed around documents like:

- `tumonline/schedule.json`
- `moodle/deadlines.json`
- `opportunities/public_opportunities.json`
- `webscraper/tum_sites_snapshot.json`

So the memory is not only meant for one app screen. It is meant to hold a broad TUM context:

- academic schedule signals
- deadline signals
- public TUM opportunities
- crawled TUM website knowledge

### Memory providers: local or `cognee`

From the worker artifacts, the campus agent supports multiple memory modes:

- `auto`
- `local`
- `cognee`

The memory layer includes:

- `LocalMemoryAdapter`
- `CogneeMemoryAdapter`

### What `cognee` is doing in this design

In this project, `cognee` is the intended structured memory engine for the campus agent.

Its role is:

- ingest normalized TUM documents
- build entities and relationships out of those documents
- make that memory searchable for the planner
- return relevant campus context when the agent needs to decide what to do next

The worker artifacts show that `CogneeMemoryAdapter` builds memory asynchronously, serializes document text, and queries the memory with prompts like:

> What should the TUM campus agent do next for this student?

That means `cognee` is not just a storage bucket here. It is the retrieval layer the agent uses to turn TUM information into agent decisions.

### What happens if `cognee` is not available

The artifacts also show a local fallback path:

- if `cognee` is not ready, the system can fall back to a local memory adapter
- strict `cognee` mode can also be forced

The worker config indicates:

- `LLM_API_KEY` or `OPENAI_API_KEY` is required for `cognee` mode
- there is also a `cognee_ready` check

So the intended behavior is:

- use `cognee` when available
- otherwise fall back to local memory for a demo-safe run

### What the local fallback stores

The local memory adapter builds a `MemorySnapshot` with:

- provider
- dataset
- documents
- entities
- relationships
- retrieval preview

This fallback is useful for demos because the agent can still reason over normalized TUM documents even without the full `cognee` stack.

## How The Agent Pipeline Is Structured

From the worker artifacts, the autonomous campus-agent pipeline has these stages:

1. load fixture or source documents
2. build memory from those documents
3. define the mission
4. consolidate signals
5. plan actions
6. build alerts
7. write a run artifact

### Named agent roles in the pipeline

The worker includes these roles:

- `MissionControlAgent`
- `SignalHarvesterAgent`
- `CampusPlannerAgent`
- `ActionRunnerAgent`

### What those roles do

- `MissionControlAgent`: defines the high-level mission for the student
- `SignalHarvesterAgent`: counts and consolidates source coverage
- `CampusPlannerAgent`: decides what actions matter most
- `ActionRunnerAgent`: turns planned actions into alert messages and approval prompts

### What kinds of actions it plans

From the pipeline strings, the planner is built around examples like:

- route rescue after a room change
- deadline shield alerts
- surfacing a high-fit research opportunity
- quiet digests when there is nothing urgent

That matches the overall product goal very well: not just answering questions, but planning student-helpful actions.

## What The Agent Currently Produces

The worker data model includes:

- `PlannedAction`
- `AlertMessage`
- `TraceEvent`
- `PipelineResult`

So the intended agent output is not “one chat answer”.

It is a structured decision package:

- what happened
- what the agent thinks matters
- what action it wants to take
- which source documents support that action
- whether the action needs approval

## Important Reality Check About The Current Repo

To make this README honest and easy to understand:

- the Next.js web app and public API backend are present as source code and work now
- the `UNI Copilot` UI exists now
- the Bedrock chat route exists now
- the campus-agent memory architecture with `cognee` is visible from the worker artifacts
- but the web chat is not yet wired to the `cognee` memory pipeline in this checkout
- and the Python worker is not currently included as editable source files

So the right way to describe the project today is:

> TUMmy already has a live campus dashboard backend and the first real TUM public integrations. The full autonomous agent memory layer is already designed around `cognee`, but is not yet fully connected to the live web chat in this repo snapshot.

## Repo Map

### Frontend pages

- `src/app/page.tsx`: home dashboard
- `src/app/chatbot/page.tsx`: chat UI
- `src/app/login/page.tsx`: mock login page

### Internal backend routes

- `src/app/api/chat/route.ts`
- `src/app/api/public/*`

### Server-side API connectors

- `src/server/public-campus/fetch-json.ts`
- `src/server/public-campus/mensa.ts`
- `src/server/public-campus/tum-nat.ts`
- `src/server/public-campus/navigatum.ts`
- `src/server/public-campus/transit.ts`

### Shared payload types

- `src/lib/public-campus-types.ts`

### Agent architecture artifacts

- `workers/campus_agent/__pycache__/agents.cpython-310.pyc`
- `workers/campus_agent/__pycache__/memory.cpython-310.pyc`
- `workers/campus_agent/__pycache__/pipeline.cpython-310.pyc`
- `workers/campus_agent/__pycache__/fixtures.cpython-310.pyc`

## Local Development

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Environment Variables

### For chat with AWS Bedrock

Set one of these auth options:

```bash
BEDROCK_API_KEY=...
```

or

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Optional:

```bash
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0
```

### For the planned `cognee` memory layer

The worker artifacts indicate that `cognee` mode expects one of:

```bash
LLM_API_KEY=...
```

or

```bash
OPENAI_API_KEY=...
```

## Recommended Next Steps

If you want to turn the current repo into the full product vision, the highest-value next steps are:

1. Connect `/api/chat` to the campus-agent memory layer instead of calling Bedrock directly.
2. Restore the Python worker as editable source files instead of `.pyc` artifacts only.
3. Replace the demo `Calendar` and `Moodle` data with real authenticated connectors.
4. Use `cognee` as the retrieval layer for TUM websites, opportunities, deadlines, and prior alerts.
5. Add approval-based agent actions for messages, deadline nudges, and route rescues.

## One-Sentence Summary

TUMmy is a unified TUM student dashboard with a `UNI Copilot`: the live backend already aggregates public campus APIs, and the broader agent architecture is designed to use `cognee` memory so it can understand TUM context, remember what matters, and help automate student work.
