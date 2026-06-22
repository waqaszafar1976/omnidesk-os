# Omnidesk OS - Complete Product Feature & Technical Specifications

This document outlines the full suite of features, engineering phase structures, and high-level architectural stacks designed for **Omnidesk OS**, bridging simple document editing, powerful smart databases, and custom no-code workspaces.

---

## 1. High-Level Technology Stack Recommendation

### Frontend Architecture (The Client Layer)
- **Core Framework**: **React (Next.js)** - provides excellent structure, SSR/SSG capabilities, and routing.
- **Real-Time CRDT Engine**: **Yjs** + **y-indexeddb** - industry-standard conflict-free synchronization with local offline persistence.
- **Rich Text Editor Core**: **Tiptap / ProseMirror** - headless, extensible rich-text editing engine.
- **Canvas Dashboard Builder**: **Pragmatic Drag and Drop** (by Atlassian) or **react-grid-layout** - optimized drag-and-drop actions.
- **Data Virtualization**: **TanStack Virtual (React Virtual)** - renders only visible viewport rows (ideal for 50,000+ data rows).
- **State Management**: **Zustand** (global state) + **TanStack Query** (server API caching).

### Backend & Real-Time Sync (The Infrastructure Layer)
- **Real-Time Coordination Server**: **Node.js (TypeScript) + Fastify** - fast event-loop asynchronous execution running `y-websocket`.
- **Core API & Business Logic Server**: **Node.js (TypeScript) + Express** (or **Go** as a secondary option) - handles relational logic, auth, billing, webhooks, and page actions.
- **Formula Sandboxing**: **isolated-vm** (Node) or **Wasmtime** (WebAssembly) - runs user formulas in isolated memory contexts safely.

### Data & Storage Layer
- **Primary Relational Database**: **PostgreSQL 15** - JSONB support for dynamic schemas, and **pgvector** enabled for semantic searches. **Row-Level Security (RLS)** is turned on at the database layer.
- **Cache & Message Broker**: **Redis (Cluster Mode)** - channels keystrokes, aggregates edits, and runs websocket pub/sub message syncing.
- **Asset Storage**: **Cloudflare R2** (or S3) - direct uploads via temporary presigned URLs with zero egress fees.

### AI & Enterprise Integration Layer
- **LLM Integration Framework**: **Vercel AI SDK** or **LangChain** - streamlines generative responses into text blocks.
- **Enterprise SSO Management**: **WorkOS** - integrates SAML 2.0 and identity directory mappings.
- **Webhook Pipeline Broker**: **BullMQ** (Redis-backed) - schedules, tracks, and retries notification actions.

### Resource Metering Gateway Architecture (Decoupled Telemetry)
- **High-Throughput Ingestion Edge**: **Go (Golang) + Gin** - lightweight edge validation, returns HTTP `202 Accepted` in `<5ms`.
- **Message Stream Buffer**: **Apache Kafka / Redpanda** - absorbs telemetry bursts, partitioned by `workspace_id` to enforce message ordering.
- **Speed Enforcement Tier**: **Redis (Cluster Mode)** - executes fast quota checks (`INCRBY`) on workspace limit thresholds.
- **Timeseries Audit Ledger**: **ClickHouse** or **TimescaleDB** - high-performance analytical storage for logs and usage reports.

---

## 2. Complete Feature List (Phase-Wise Execution)

### Phase 1 MVP Features (The Core Scaffolding)

#### 1. Core Workspace Hub (Office-Like Dashboard)
- **Unified Navigation Tree**: A left-hand sidebar displaying a nested page layout (Documents, Tables, Canvases).
- **Workspace Switcher**: Dropdown to toggle between workspaces (Student, Personal, Corporate, Industrial).
- **Global Keyword Search**: Locates text query matches across titles and body contents.

#### 2. Collaborative Document Editor (Module A - Word Processor)
- **Tiptap/ProseMirror Integration**: Text formatting (Bold, Italic, Strikethrough, Headings, Lists), images insertion, and local file uploads.
- **Markdown Shortcuts**: Auto-transforms text to formatted styles (e.g. typing `# ` transforms line to heading).
- **Slash Commands**: Typing `/` opens a quick portal to insert checklist widgets or database tables.

#### 3. Dynamic Smart Tables (Module B - Spreadsheet / Database Hybrid)
- **Strict Column Configurations**: Support for typed columns (`Text`, `Number`, `Date`, `Select Dropdown`, `Boolean`).
- **Formula Evaluation Engine**: Custom calculations evaluated dynamically per row.
- **Calculations Ribbon**: Instant sum, average, or count of a column displayed on the bottom sheet row.

#### 4. Custom Project Canvas Builder (Module C - No-Code Drag-and-Drop)
- **Atlassian Pragmatic D&D Grid**: Draggable layout page grid to build custom modules.
- **UI Block Widgets**: Summary metrics widgets, read-only table grids, and rich text note cards.
- **Parameters Connection Modal**: Links canvas cards to columns to perform aggregate math (e.g. total recovery sum).

---

### Phase 2 Features (Intelligence & Real-Time Sync)

#### 5. Real-Time Collaboration & CRDT Engine
- **Yjs Shared Documents**: Syncs keypresses and document updates instantly.
- **Presence Indicators**: Color-coded cursor tags showing names of active workspace editors.
- **Redis Pub/Sub WebSocket Routing**: Distributes traffic across instances to sync keystrokes across cluster nodes.
- **Debounced Snapshots**: Writes snapshot states to PostgreSQL database every 2–3 seconds to protect database integrity.

#### 6. Cross-Table Relations & Rollups (Advanced Database)
- **Relational Columns**: Links columns directly across different tables (e.g. mapping customer lines to invoice sheets).
- **Rollup Aggregations**: Pulls and aggregates values from linked tables (e.g. summing all recoveries mapped to a customer).
- **Bi-Directional Auto-Sync**: Editing or deleting references updates the linked table values instantly.

#### 7. Multi-Perspective View Engine
- **Kanban Board View**: Displays rows grouped by select columns, allowing status drag-and-drop.
- **Calendar & Timeline (Gantt) View**: Maps rows containing date cells onto calendar tracks.
- **Gallery Card View**: Displays records as card grids using cover images or rich-text summaries.

#### 8. Omnidesk AI (Intelligence Layer)
- **Semantic Search Engine**: Concepts-based queries powered by **pgvector** (e.g. looking up "unpaid invoices" yields "outstanding balances").
- **Inline AI Co-Writer**: Slash command (`/ai`) editor helper to generate, rewrite, or summarize text blocks.
- **AI Automation & Formulas Generator**: Generates formula strings or automation triggers from natural language prompts.

#### 9. Background Automations & Webhook Broker
- **Lifecycle Listeners**: Triggers tasks on database operations (`ROW_CREATED`, `CELL_UPDATED`).
- **Webhook Delivery queue**: **BullMQ** task processor handling webhooks execution, rate limiting, and failures retry.

---

### Phase 3 Features (Enterprise Hardening & Extensibility)

#### 10. Database-Level RLS & Compliance Standards
- **PostgreSQL Row-Level Security (RLS)**: Enforces hard isolation checks at the PostgreSQL engine level to ensure workspace security.
- **Immutable Ledger Audit Logs**: A tamper-proof transaction log tracking all read, write, export, and delete operations for workspace security.
- **Identity Management (SSO)**: SAML 2.0 / OIDC integrations with identity brokers (Okta, Entra ID, G-Suite).

#### 11. Developer Ecosystem & Extensibility
- **Extensible Component SDK**: Frontend sandbox framework to load third-party React/Vue modules.
- **REST & GraphQL Public API**: Open token-based developer API endpoints to allow external systems to programmatically query and append rows to smart tables.
- **Built-in Connectors**: Native integrations with Slack, GitHub, HubSpot, and Salesforce.

#### 12. High-Scale Infrastructure & Scaling
- **Viewport Cell Virtualization**: Uses TanStack Virtual to render only active viewport lines, keeping performance smooth on 100,000+ rows.
- **Usage Credits Metering**: Enforces billing usage caps by logging AI tokens consumed, storage volumes, and webhook notifications executed per workspace tier.
- **Multi-Region Data Residency Routing**: Segment database instances and media store links across distinct geographic cloud locations (e.g. US-East vs EU-Central) to satisfy GDPR residency rules.

#### 13. Secure Media Pipeline
- **S3 Presigned URLs**: Clients upload files directly to Cloudflare R2/S3 using brief temporary tokens.
- **ClamAV Anti-Malware Scan**: Asynchronously scans uploaded attachments before they are made accessible to other users in the workspace.

---

## 3. Product Phase Structure & Roadmaps

### 🚀 Phase 1: Scaffolding & Core Productivity Components (Weeks 1–12)
*Focus: Deploy a fast, single-user document and smart table workspace.*

```
[Phase 1 Structure]
 ├── Frontend UI Track: Navigation tree sidebar, Document editor base, Smart table grid, LTR/RTL.
 ├── Backend API Track: JWT authentication pools, Workspace databases, isolated-vm sandbox.
 └── DevOps Infrastructure: Docker environments orchestration, Local Postgres seed scripts, CI/CD.
```

- **Weeks 1–4: Workspace Hub & Navigation Sidebar**
  - *Backend*: Initialize EAV-JSONB schemas, user records, and JWT authorization headers.
  - *Frontend*: Next.js page layout configurations. Build navigation sidebar with drag-and-drop hierarchy actions.
  - *DevOps*: Configure local workspace docker-compose scripts and base CI/CD pipelines.
- **Weeks 5–8: Module A (Collaborative Editor) & Module C (Canvas Dashboard)**
  - *Frontend*: Integrate headless Tiptap/ProseMirror text blocks. Build ribbon headers, and slash command menus.
  - *Canvas Builder*: Setup dynamic canvas workspace and place basic Metric Card widget elements.
- **Weeks 9–12: Module B (Smart Tables V1) & Locales**
  - *Frontend/Backend*: Enforce type checks (`Text`, `Number`, `Date`, `Select Dropdown`, `Boolean`). Add **TanStack Virtual** support.
  - *Formula Sandboxing*: Set up sandboxed calculation service using `isolated-vm`.
  - *Locales*: Implement translation files supporting structural LTR/RTL layout orientation shifts.

---

### 📡 Phase 2: Intelligence, Sync & Real-Time Multiplayer (Weeks 13–24)
*Focus: Transform Omnidesk into a connected, real-time, smart collaborative tool.*

```
[Phase 2 Structure]
 ├── Collaboration Sync: Yjs CRDT binding, Fastify Websockets coordination, Redis pub/sub.
 ├── Advanced Relations: Cross-table linkage maps, Rollup calculations, Kanban/Gantt components.
 └── Intelligence & Auto: Vector pipeline (pgvector), Vercel AI SDK routes, BullMQ execution.
```

- **Weeks 13–16: Real-Time Engine (CRDTs & WebSockets)**
  - *Server Engine*: Set up Fastify real-time coordination server supported by a Redis pub/sub broker.
  - *State Sync*: Bind Tiptap document blocks and Smart Table cell schemas to Yjs CRDT model.
  - *Offline Sync Buffer*: Implement client IndexedDB queues and backend debouncing hooks (every 2-3s writes).
- **Weeks 17–20: Advanced Relational Database Views**
  - *Relational Schemas*: Configure cross-table relations and rollup aggregate calculations, preventing circular dependencies.
  - *Views Rendering*: Create alternative database representations: Kanban card layouts and project timeline Gantt charts.
- **Weeks 21–24: Omnidesk AI Integration & Automations**
  - *AI Engine*: Deploy `pgvector` pipeline converting page updates into vector embeddings for semantic search.
  - *AI Utilities*: Connect Vercel AI SDK to inline slash command (`/ai`) text actions.
  - *Automations*: Integrate BullMQ queue triggers to execute outbound notification webhook payloads.

---

### 🛡️ Phase 3: Enterprise Hardening & Ecosystem Scale (Weeks 25–36+)
*Focus: Secure system borders, open developer gateways, and optimize high-throughput scaling.*

```
[Phase 3 Structure]
 ├── Compliance & Security: Postgres Row-Level Security, WorkOS SSO identity, Ledger audit logs.
 ├── Developer Gates: Public API tokens, Custom Component SDK, Slack/GitHub integrators.
 └── Infrastructure Scale: TanStack virtualization optimization, Cloudflare R2 uploads, Go Metering API.
```

- **Weeks 25–28: Hardened Architecture & Security**
  - *Isolation RLS*: Enforce native PostgreSQL RLS isolation checks on workspaces.
  - *Enterprise SSO*: Direct SAML 2.0 / OIDC logins configuration (Okta, Entra ID) using WorkOS.
  - *Ledger Trails*: Build a tamper-proof audit log tracking read, write, and export operations.
- **Weeks 29–32: Public APIs & External Integrations**
  - *Developer Gates*: Establish developer token routes and rate-limited public REST / GraphQL endpoints.
  - *Integrations*: Integrate native syncing connections to Slack, GitHub, HubSpot, and Salesforce.
- **Weeks 33–36+: Developer SDK, Metering & Launch**
  - *Component SDK*: Iframe/sandbox component configuration to run third-party React blocks safely.
  - *Consumption Metering*: Deploy high-throughput ingestion edge (Go/Gin), partitioned broker queue, and ClickHouse storage.
  - *Optimization Run*: Execute performance load tests and final penetration audits.
