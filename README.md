# TUMmy

> The student operating system for TUM.

TUMmy is not another university chatbot.

It is the layer that sits on top of the fragmented TUM ecosystem and turns scattered websites, schedules, rooms, campus navigation, cafeteria data, and student tasks into one intelligent student experience.

One dashboard. One `UNI Copilot`. One place that knows what matters next.

For the Reply Challenge, the core idea is simple and strong:

- students lose time because TUM information is fragmented
- the important signals are spread across many websites and systems
- most tools show information, but do not help students act on it

TUMmy fixes that by combining:

- a single dashboard for the most relevant campus signals
- live integrations with real TUM-related public APIs
- an agent architecture with memory about TUM, deadlines, places, opportunities, and student context
- a `UNI Copilot` that moves from “show me data” to “help me run university life”

## Why This Wins Attention

The problem is immediate and recognizable:

> Every TUM student knows the pain of switching between portals, missing details, and reacting too late.

The product pitch is immediate:

> TUMmy watches the campus, remembers what matters, and helps students act before friction turns into stress.

Why this is powerful in a Reply Challenge setting:

- it solves a real TUM-specific pain point
- it already integrates real public campus data
- it is designed as an agent system, not just a chat wrapper
- it has a clear next step from information dashboard to autonomous assistant
- it combines product clarity, real integrations, and agent architecture in one story

## The Hook

TUM students do not need another page with more cards.

They need a system that can:

- understand the campus
- remember context
- surface the right information at the right time
- and reduce the manual overhead of being a student

That is the hook:

> TUMmy turns TUM from a collection of websites into a usable system.

## The 30-Second Demo Story

Imagine a TUM student opening one dashboard in the morning and immediately seeing:

- today’s campus food from the Mensa API
- public room and lecture hall information from TUMonline-related data
- live U6 departures from `Garching, Forschungszentrum`
- campus search and room lookup via NavigaTUM
- an assistant that knows the TUM world and can later turn those signals into actions

That is the demo in one sentence:

TUMmy makes the university feel like one system instead of ten disconnected ones.

## What The Product Is Really About

This project is about reducing student friction at TUM.

Today, students have to manually piece together:

- where they need to go
- what changed
- what is due
- what is worth noticing
- how to move across campus fast enough

TUMmy is built to become the system that handles that context for them.

In product terms, TUMmy is:

- the dashboard layer for campus visibility
- the `UNI Copilot` layer for understanding and guidance
- the memory layer for TUM knowledge and student context
- the agent layer for prioritization, planning, and action

## What Is Already Real In This Repo

This repo already contains a working Next.js app with live backend integrations.

### Live right now

- `Mensa`: live data via the TUM-Dev Eat API with OpenMensa fallback
- `TUMonline` tile: public room data via the TUM Natural Sciences API
- `Campus Finder`: live building and room search via NavigaTUM
- `Garching U-Bahn`: live U6 departures via the MVG API
- `Chatbot`: a server-side Bedrock-powered chat endpoint

### Still demo or placeholder

- `Calendar`: local demo data
- `Moodle`: local demo data
- `Login`: mock login page, not real TUM SSO
- the fully autonomous memory-backed agent is architected, but not yet fully connected to the live chat route

For a jury, that matters because:

the project already proves live integration today, while the agent layer gives it a strong tomorrow-story.

## The Big Vision

The goal is not a nicer dashboard.

The goal is:

> a TUM operating system for students

That means a system that can:

- watch campus signals
- remember what matters
- connect context across sources
- explain why something is relevant
- and prepare helpful actions before the student has to ask

That naturally leads to features like:

- room-change route rescue
- deadline protection alerts
- surfacing relevant TUM opportunities
- digesting TUM websites into student-relevant summaries
- approval-based actions instead of manual friction

## Why The Backend Is Strong

The backend is simple in structure, but strong in consequence:

> the browser never talks directly to external campus APIs

Instead, the frontend always talks to internal Next.js API routes, and those routes talk to server-side connectors.

### Backend flow

```text
UI widget
   |
   v
internal route in src/app/api/*
   |
   v
server-only connector in src/server/public-campus/*
   |
   v
external API
   |
   v
normalized payload type in src/lib/public-campus-types.ts
   |
   v
stable UI rendering
```

This gives the project a serious backend story:

- the UI stays simple
- upstream API changes are isolated in connectors
- response shapes are controlled by the app
- timeouts and revalidation stay on the server
- the architecture can scale from public APIs to authenticated TUM systems

### Backend in repo terms

The backend is easiest to understand as three layers:

| Layer | Folder | Responsibility |
| --- | --- | --- |
| UI layer | `src/components` and `src/app/page.tsx` | renders tiles and asks the backend for data |
| route layer | `src/app/api/*` | exposes internal endpoints to the frontend |
| connector layer | `src/server/public-campus/*` | talks to external APIs and normalizes responses |

And then there is one shared type layer:

| Layer | Folder | Responsibility |
| --- | --- | --- |
| type layer | `src/lib/public-campus-types.ts` | defines the payload shape that the frontend receives |

### Example: how one live widget works

The `Garching U-Bahn` tile is a good example:

1. `TransitTile.tsx` calls `/api/public/transit/garching-forschungszentrum`
2. `src/app/api/public/transit/garching-forschungszentrum/route.ts` receives the request
3. that route calls `src/server/public-campus/transit.ts`
4. the connector calls the MVG API
5. the raw MVG response is normalized into `PublicTransitPayload`
6. the tile renders a stable shape with departure times, platform, and direction

The same pattern is used for:

- Mensa
- TUM room data
- NavigaTUM search
- transit

### The two backend paths in this project

There are really two backend stories in this repo:

#### 1. The live Next.js backend

This is what powers the app today.

It includes:

- public API routes under `src/app/api/public/*`
- the chat route under `src/app/api/chat/route.ts`
- the server connectors in `src/server/public-campus/*`

#### 2. The agent backend

This is the autonomous campus-agent layer prepared under `workers/campus_agent`.

Its job is different:

- ingest TUM-related documents
- build memory
- rank what matters next
- prepare actions and alerts

That separation is useful:

- the Next.js backend is the live product API layer
- the worker backend is the decision and memory layer for the agent

## Live Integrations Already Connected

| Internal route | Connector | External source | Why it matters |
| --- | --- | --- | --- |
| `POST /api/chat` | `src/app/api/chat/route.ts` | AWS Bedrock | powers the live assistant backend |
| `GET /api/public/mensa` | `src/server/public-campus/mensa.ts` | TUM-Dev Eat API, OpenMensa fallback | daily student-life data that is immediately useful |
| `GET /api/public/tum/rooms` | `src/server/public-campus/tum-nat.ts` | TUM NAT API | public TUM room and lecture hall information |
| `GET /api/public/navigatum/search` | `src/server/public-campus/navigatum.ts` | NavigaTUM | campus search and room discovery |
| `GET /api/public/navigatum/locations/[id]` | `src/server/public-campus/navigatum.ts` | NavigaTUM | place detail lookup |
| `GET /api/public/navigatum/route` | `src/server/public-campus/navigatum.ts` | NavigaTUM | route planning |
| `GET /api/public/transit/garching-forschungszentrum` | `src/server/public-campus/transit.ts` | MVG API | live U-Bahn departures for a real TUM mobility use case |

## Why This Architecture Matters For Reply

This is not just “we connected some APIs”.

The backend is designed like a real campus integration layer:

- each source has its own connector
- each connector translates raw upstream data into app-owned types
- the frontend consumes one consistent interface
- the architecture can grow from public APIs to authenticated systems later

That is exactly the kind of system you build when the goal is an actual agent, not a toy demo.

## The Role Of `UNI Copilot`

The `UNI Copilot` is the product face of the agent.

Right now, in the current repo, it works in two layers:

### Compact tile on the dashboard

This is the quick entry point:

- `src/components/home/tiles/CopilotTile.tsx`

It signals that the product is not just a dashboard. There is intelligence sitting above the data.

### Detail view with real campus utility

The detail view currently gives:

- a path into the live chatbot
- live campus lookup through NavigaTUM
- building and room discovery

It lives in:

- `src/components/home/details/CopilotDetail.tsx`

So the `UNI Copilot` is already the narrative center of the product: the place where campus context becomes guidance.

## How The Live Chat Works Today

The current chat backend is:

- `src/app/api/chat/route.ts`

Flow:

1. the browser sends messages to `POST /api/chat`
2. the backend normalizes the chat history
3. the backend calls AWS Bedrock
4. the reply is returned to the UI

Supported configuration in the current code:

- `BEDROCK_API_KEY` or `AWS_BEARER_TOKEN`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- `BEDROCK_REGION`
- `BEDROCK_MODEL_ID`

Default model in the code:

- `us.anthropic.claude-3-5-haiku-20241022-v1:0`

### Important honesty point

The live chat is real, but today it is still a direct Bedrock route.

It does not yet pull memory from the campus-agent pipeline or from `cognee`. That is the next architectural connection, not something we should overclaim.

## How The Agent Uses `cognee` Memory

This repo also contains a separate campus-agent architecture under `workers/campus_agent`.

In this snapshot, those Python files are only present as compiled `.pyc` artifacts, but they still show the intended system design very clearly.

### What the memory is for

The agent needs to remember:

- what exists in the TUM ecosystem
- what changed recently
- what matters to a specific student
- how different TUM signals relate to each other

So this is not just chat history memory.

It is campus memory.

### The shared memory input: `SourceDocument`

Different sources are normalized into a common shape called `SourceDocument`.

From the worker artifacts, that includes fields such as:

- `source_id`
- `source_name`
- `item_id`
- `title`
- `summary`
- `content`
- `timestamp`
- `kind`
- `metadata`

This is a very important architectural choice:

before the agent can reason, all TUM information is translated into one common document model.

### What kinds of TUM knowledge go into memory

The worker artifacts show fixture and source categories such as:

- `tumonline/schedule.json`
- `moodle/deadlines.json`
- `opportunities/public_opportunities.json`
- `webscraper/tum_sites_snapshot.json`

That means the memory is intended to cover:

- schedule changes
- deadline changes
- public TUM opportunities
- crawled TUM website content

So when we say “the agent knows TUM”, that is what we mean:

it is designed to ingest the TUM campus world as structured memory, not just answer one-off prompts.

### Memory providers in the agent

The artifacts show multiple memory modes:

- `auto`
- `local`
- `cognee`

The memory layer includes:

- `LocalMemoryAdapter`
- `CogneeMemoryAdapter`

### What `cognee` does in this architecture

In this project, `cognee` is the intended memory engine behind the campus agent.

Its job is to:

- ingest normalized TUM documents
- extract entities and relationships
- make those relationships retrievable
- let the planner ask: what matters next for this student?

The artifacts show that the `CogneeMemoryAdapter` builds memory asynchronously, serializes document content, and queries the memory with prompts like:

> What should the TUM campus agent do next for this student?

That is exactly the difference between a dashboard and an agent.

The dashboard shows data.

The memory-backed agent can decide what is relevant inside that data.

### Fallback behavior

The worker also supports a local fallback when `cognee` is not available.

The local memory snapshot contains:

- provider
- dataset
- documents
- entities
- relationships
- retrieval preview

This makes the architecture demo-safe:

- if `cognee` is available, the agent can use the richer memory path
- if not, the system can still run with a local memory snapshot

The artifacts indicate that `cognee` mode expects:

- `LLM_API_KEY`

or

- `OPENAI_API_KEY`

## The Agent Pipeline

From the worker artifacts, the autonomous campus-agent pipeline is structured as:

1. load source documents
2. build memory
3. define the mission
4. consolidate signals
5. plan actions
6. build alerts
7. export a run artifact

### Agent roles

- `MissionControlAgent`
- `SignalHarvesterAgent`
- `CampusPlannerAgent`
- `ActionRunnerAgent`

### What those roles mean

- `MissionControlAgent`: defines the high-level goal
- `SignalHarvesterAgent`: consolidates and counts source signals
- `CampusPlannerAgent`: ranks what should matter next
- `ActionRunnerAgent`: turns plans into alerts and approval-ready outputs

### The kinds of actions the pipeline is aiming for

The worker strings show example actions like:

- route rescue after room changes
- deadline shield alerts
- surfacing research opportunities
- quiet digests when nothing urgent happened

That is why this project is a strong Reply fit:

the architecture is already pointed toward proactive student support, not passive chat.

## Current State

Today, the repo already proves:

- the web app is real
- the public API integrations are real
- the dashboard is real
- the Bedrock chat backend is real
- the memory architecture is already designed
- the `cognee`-based agent path is already visible in the worker artifacts

What remains to finish:

- connecting live chat to the memory layer
- restoring the Python worker as editable source
- replacing mocked sources like Calendar and Moodle

The strongest way to frame it is:

> TUMmy already proves the campus integration layer. The next step is to turn that layer into a fully memory-backed campus agent.

That is a good jury position because it shows both:

- traction
- and a believable path to autonomy

## Repo Map

### Core frontend

- `src/app/page.tsx`: dashboard
- `src/app/chatbot/page.tsx`: chat UI
- `src/components/home/tiles/*`: dashboard widgets
- `src/components/home/details/*`: detailed views, including `UNI Copilot`

### Backend routes

- `src/app/api/chat/route.ts`
- `src/app/api/public/*`

### Server connectors

- `src/server/public-campus/fetch-json.ts`
- `src/server/public-campus/mensa.ts`
- `src/server/public-campus/tum-nat.ts`
- `src/server/public-campus/navigatum.ts`
- `src/server/public-campus/transit.ts`

### Shared typed payloads

- `src/lib/public-campus-types.ts`

### Agent artifacts

- `workers/campus_agent/__pycache__/agents.cpython-310.pyc`
- `workers/campus_agent/__pycache__/memory.cpython-310.pyc`
- `workers/campus_agent/__pycache__/pipeline.cpython-310.pyc`
- `workers/campus_agent/__pycache__/fixtures.cpython-310.pyc`

## Local Development

Install:

```bash
npm install
```

Run:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

## Environment Variables

### Bedrock chat

Use one of:

```bash
BEDROCK_API_KEY=...
```

or:

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Optional:

```bash
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0
```

### Planned `cognee` memory mode

The worker artifacts indicate one of:

```bash
LLM_API_KEY=...
```

or:

```bash
OPENAI_API_KEY=...
```

## Best Next Steps

If we want to turn this from a strong demo into the full agent product, the highest-value next steps are:

1. connect `/api/chat` to the campus-agent memory layer
2. restore the Python worker as editable source files
3. replace mocked `Calendar` and `Moodle` with authenticated connectors
4. ingest more TUM pages into `cognee`
5. expose approval-based actions through the `UNI Copilot`

## One-Line Pitch

TUMmy turns the fragmented TUM web ecosystem into a student operating system: a live campus dashboard today, and a memory-backed `UNI Copilot` that can understand TUM, remember what matters, and help run student life tomorrow.
