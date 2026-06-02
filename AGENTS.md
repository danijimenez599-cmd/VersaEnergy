# VersaEnergy — AI Development Guide

## Canonical Entry For AI Agents

This file is the first document every AI agent must read before opening source
code. It is the canonical operating contract for Codex, Claude, DeepSeek,
Gemini, Cursor, Copilot, Windsurf and similar coding agents.

Provider-specific files such as `CLAUDE.md`, `DEEPSEEK.md`,
`.github/copilot-instructions.md`, `.cursor/rules/project.mdc` and
`.windsurfrules` must stay lightweight bridges to this file. Do not duplicate
the full instructions there.

If a tool/runtime cannot switch models or spawn workers automatically, treat the
model-routing rules as a manual operating protocol: use minimum context,
summarize, plan, implement in small steps and reserve deep reasoning for
ambiguous/high-risk decisions.

## What is VersaEnergy

VersaEnergy is an **Energy & Utilities Management** application. It is a companion to VersaMaint (CMMS), focused on understanding how critical utilities flow, are measured, consumed, lost, and optimized within a plant, building, or process.

Utilities covered: electricity, natural gas, LPG, diesel, steam, condensate, compressed air, chilled water, hot water, industrial water, potable water, process water, refrigeration, industrial gases, solar generation, battery storage.

The core differentiator is the **Energy & Utilities Map**: a visual, semantic, multi-utility, versioned, and calculable canvas where users draw real utility networks (electrical one-line diagrams, steam networks, compressed air networks, chilled water circuits, gas/water distribution).

## Core Architecture Philosophy

> **"El canvas es solo la vista; la verdad del sistema es el grafo semántico."**

VersaEnergy does **not** store drawings (SVG/canvas). It stores a **technical graph**:

```
UtilitySystem = Graph<Node, Edge> + MeasurementPoints + StandardsProfile
```

Every element has semantic meaning:
- **Node**: equipment, connector, control/valve, measurement device, IoT point, area, consumer
- **Edge**: pipe, cable, duct, signal, logical — with flow direction, utility, line type, properties
- **MeasurementPoint**: independent entity that binds to a node, edge, system, or area — NOT just a visual icon

This means:
- A meter is an entity bound to a pipe section or equipment, not just an icon
- A line represents actual flow of steam, water, gas, air, electricity, etc.
- The system can validate: "power meter on a steam line = ERROR"
- The system can calculate: total input → measured consumption → losses → unaccounted

## Standards Reference

The system uses the following industry standards as inspiration (not to copy text, but to guide tag systems, symbols, and naming):

| Standard | Purpose |
|----------|---------|
| **ISA-5.1** | Instrumentation symbols and identification (tags: FT, PT, TT, LT, FE, FQI, etc.) |
| **IEC 60617** | Graphical symbols for electrotechnical diagrams |
| **ISO 14617** | Graphical symbols for industrial diagrams (measurement & control) |
| **ISO/IEC 81346-1:2022** | Structuring principles and reference designations for systems |
| **DEXPI** | P&ID data exchange standard (future import/export) |
| **Haystack / Brick** | Semantic tagging for buildings, IoT, HVAC, energy systems |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 19 + TypeScript 6 |
| Styling | Tailwind CSS (vite plugin) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| State | Zustand |
| Charts | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React |
| Canvas / Topology | @xyflow/react |
| PDF Reports | @react-pdf/renderer |
| Routing | react-router-dom |
| Validation | Zod |

## Critical Rules — MUST FOLLOW

1. **Zero mocks.** Everything must be persisted in Supabase. No local/mock data stores.
2. **Graph-first, not drawing-first.** Store nodes, edges, tags, properties, relationships — never raw SVG/canvas state.
3. **No assumptions about single utility.** Every entity must carry `utility_type` where applicable.
4. **Calculation logic must live outside React components** in `src/services/`.
5. **Every phase must pass `npm run build`** before being considered done.
6. **One phase = one verifiable deliverable.** Do not build multiple phases at once.
7. **All database tables must have RLS enabled** with company-scoped policies.
8. **Every meter/MeasurementPoint must have a compatible utility type and unit.**
9. **Unit conversions between utilities must be explicit and traceable.**
10. **Published topology diagram versions are frozen** — editing requires cloning to a new draft.
11. **Balances must store which diagram version they used.**
12. **Estimates must be visually distinguishable from real readings.**
13. **Each phase has its own doc in `docs/fase-NN.md`** — read it before starting work on that phase.
14. **Edge visualization uses color + line pattern + label + direction arrow** — never color alone.
15. **Frontend never talks directly to industrial protocols** (MQTT, OPC UA, Modbus). IoT bindings go through backend/gateway.
16. **Every equipment/node must have a unique tag** within its facility and utility context.

## Current Project State

This is a building under construction. Some phases are already implemented, and
some are plans for future work.

Canonical source of truth:

1. `AGENTS.md` for operating rules, architecture, commands and phase status.
2. `docs/00_DOCUMENTATION_INDEX.md` for documentation priority and navigation.
3. `docs/05_MASTER_IMPROVEMENT_PLAN.md` for future implementation phases.
4. `docs/04_CURRENT_STATE_REFERENCE.md` for what exists, what works and known
   gaps.
5. `docs/01_PRODUCT_VISION.md` and `docs/02_TOPOLOGY_ENGINE.md` for product and
   topology intent.
6. `docs/fase-NN.md` files are build-phase references and historical contracts.
7. `docs/03_AI_DEVELOPMENT_ROADMAP.md` is historical planning context only.

Do not reintroduce old mock/local-data instructions from early planning docs.
The current project rule is Supabase-first and zero mocks.

## Project Structure

```
src/
  app/            # AppShell, router, providers, layouts
  shared/         # Reusable components: Button, Badge, Card, Modal, EmptyState, etc.
  modules/        # Feature modules (one folder per module)
    inicio/       # Dashboard / Utilities Cockpit
    mapa/         # Energy & Utilities Map (canvas + topology)
      canvas/     # React Flow canvas, custom nodes, edges
      palette/    # Node palette grouped by family
      inspector/  # Side inspector for selected elements
    modelo/       # Energy & Utilities Model (catalogs CRUD)
    medicion/     # Measurement: readings, CSV import, data quality
    balances/     # Utility balances, calculations
    desempeno/    # EnPI, baselines, targets, performance
    acciones/     # Savings actions, Kanban
    iso50001/     # SGEn workspace aligned with ISO 50001, no standard text copied
    reportes/     # PDF/CSV reports
    admin/        # Administration, users, settings
  store/          # Zustand stores
  services/       # Pure logic — NO React dependency
    supabase.ts             # Supabase client singleton
    topology-engine/        # Graph compiler, validators, queries
      graphTypes.ts         # TypeScript types for graph model
      validators.ts         # Validation rules engine
      compiler.ts           # Canvas → graph compiler
      graphQueries.ts       # Graph traversal and queries
      utilityRules.ts       # Utility-specific rules
      unitConversion.ts     # Unit conversion utilities
      topologyVersioning.ts # Diagram versioning logic
      serialization.ts      # JSON snapshot serialization
    balance-engine/         # Balance calculation, losses, overlays
    standards-engine/       # Standards catalog (ISA-5.1, IEC 60617, ISO 14617, 81346)
    measurement-engine/     # Accumulator logic, delta calculation, rollover
supabase/
  migrations/     # SQL migration files
docs/             # Phase documentation (fase-00.md, fase-01.md, ...)
```

## Available Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Mandatory Reading Flow

Before editing, follow this flow:

1. Read this file.
2. Convert the user's natural-language request into a brief technical task.
3. Read `docs/00_DOCUMENTATION_INDEX.md`.
4. For future product/UI/business work, read
   `docs/04_CURRENT_STATE_REFERENCE.md` and
   `docs/05_MASTER_IMPROVEMENT_PLAN.md`.
5. Read the relevant `docs/fase-NN.md` document only when the change touches a
   specific original build phase or historical implementation detail.
6. Read `docs/01_PRODUCT_VISION.md` or `docs/02_TOPOLOGY_ENGINE.md` only when the
   change touches product direction, topology, graph semantics or utilities.
7. Inspect only the source files needed for the task.
8. If the change touches DB/RLS/schema, inspect the relevant migration files in
   `supabase/migrations/`.
9. Verify with `npm run build` for code changes.
10. Update docs when behavior, architecture, schema, phase status or guardrails
   change.

Do not scan the repo randomly to "understand everything". Build a task-specific
context packet.

## Natural-Language Request Intake

The user may ask for work in broad natural language without naming files,
functions or exact modules. That is expected.

Before implementation, the top model should produce this internal brief:

```md
Goal:
Likely phase/module:
Expected behavior:
Docs to read:
Source files likely involved:
Risks:
Assumptions:
Blocking questions:
Recommended model class:
Verification:
```

Ask the user 1 to 3 short questions only when a missing answer would affect
schema, RLS, auth, data integrity, graph semantics, ISO evidence, calculations,
published topology versions or cross-module behavior.

If the change is low-risk and reversible, proceed with explicit assumptions.
Do not ask the user to identify files if the project docs and source tree can
reasonably infer them.

## Minimum Context Packet

To control token cost, load only:

- the user's request;
- the technical brief;
- this `AGENTS.md`;
- `docs/00_DOCUMENTATION_INDEX.md`;
- `docs/04_CURRENT_STATE_REFERENCE.md` and
  `docs/05_MASTER_IMPROVEMENT_PLAN.md` for future work;
- the relevant `docs/fase-NN.md` only when needed;
- product/topology docs only when relevant;
- necessary source files;
- relevant migrations when DB/RLS/schema is touched;
- current errors, build output or diff summaries.

For long chats, compress older discussion into:

```md
Goal:
Decisions:
Files inspected:
Files changed:
Constraints:
Risks:
Pending:
```

Keep decisions, constraints, exact still-relevant errors and acceptance
criteria. Drop old logs, abandoned exploration and repeated explanations.

## Multi-Model Delegation Policy

Use expensive reasoning for judgment, not mechanical work.

Model classes:

- `frontier_reasoning`: GPT-5.5, Claude Opus 4.7, DeepSeek high-reasoning model
  or latest equivalent. Use for ambiguous intake, architecture, graph semantics,
  DB/RLS/auth, calculations, versioning rules, ISO evidence, risk review and
  final review.
- `strong_coding`: Sonnet/GPT/DeepSeek coder-class model or equivalent. Use for
  implementation of clear plans, UI modules, services, tests and contained
  refactors.
- `cheap_utility`: Haiku/mini/small/fast model or equivalent. Use for grep,
  docs reading, file inventory, summaries, formatting and mechanical
  verification.

Default flow:

1. Top model normalizes the request and decides scope.
2. Cheap worker explores bounded docs/files when useful.
3. Coding model implements clear, contained changes.
4. Cheap worker verifies diff/build checklist when useful.
5. Top model reviews high-risk changes.

Escalate to `frontier_reasoning` when a task touches graph truth, unit
conversion, cross-utility calculations, RLS/auth/schema, published versions,
data loss, ISO evidence or ambiguous product behavior.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=http://127.0.0.1:64321
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Supabase Local

| Service | URL |
|----------|-----|
| API (REST) | `http://127.0.0.1:64321` |
| Studio | `http://127.0.0.1:64323` |
| Database | `postgresql://postgres:postgres@127.0.0.1:64322/postgres` |

## Core Domain Model

### UtilityDefinition (configurable catalog)

```ts
type UtilityCategory = 'fluid' | 'gas' | 'electrical' | 'thermal' | 'custom'

interface UtilityDefinition {
  id: string
  name: string
  category: UtilityCategory
  defaultUnit: string
  flowUnits: string[]
  energyUnits?: string[]
  allowedNodeTypes: string[]
  allowedMeterTypes: string[]
  lineStyle: {
    color: string
    strokeWidth: number
    strokeDasharray?: string
  }
}
```

### Diagram Node Types (by family)

**Equipment (equipment)**: boiler, pump, compressor, chiller, cooling_tower, tank, transformer, panel, generator, heat_exchanger, motor, consumer, custom_equipment

**Connectors / Distribution (connector)**: pipe, duct, cable, busbar, header, manifold, branch, junction

**Control / Isolation (control)**: valve, damper, breaker, disconnect, control_valve, regulator, check_valve

**Measurement (measurement)**: flow_meter, energy_meter, pressure_sensor, temperature_sensor, level_sensor, current_transformer, power_meter, gas_meter, water_meter, steam_meter, custom_meter

**IoT / Data (iot)**: iot_device, gateway, plc, rtu, edge_device, virtual_point, api_source, manual_reading_source

**Organizational (organizational)**: area, process, production_line, site, cost_center

**Special (special)**: utility_source, loss_node, group, annotation

### Diagram Edge Types

```ts
type DiagramEdgeType =
  | 'pipe'        // Fluid/gas piping
  | 'cable'       // Electrical cable
  | 'duct'        // Air/ventilation duct
  | 'busbar'      // Electrical busbar
  | 'signal'      // Control/signal line
  | 'logical'     // Logical relationship (not physical flow)

type FlowDirection =
  | 'source_to_target'
  | 'target_to_source'
  | 'bidirectional'
  | 'unknown'
```

### Edge Visualization (multi-channel, not color-only)

```ts
const utilityEdgeStyles: Record<string, EdgeStyle> = {
  steam:        { color: '#7c3aed', width: 4, dash: '8 4' },
  electricity:  { color: '#1e40af', width: 2 },
  water:        { color: '#0891b2', width: 3 },
  natural_gas:  { color: '#ea580c', width: 3, dash: '2 4' },
  compressed_air: { color: '#0d9488', width: 3 },
  chilled_water:  { color: '#06b6d4', width: 3 },
}
```

Every edge MUST show: color + line pattern + label + direction arrow + tooltip + legend entry.

### MeasurementPoint (independent entity)

```ts
interface MeasurementPoint {
  id: string
  tag: string
  name: string

  target: {
    type: 'node' | 'edge' | 'system' | 'area'
    id: string
  }

  utility: string

  measurementType:
    | 'instantaneous'  // Sensor: reads current value at a moment
    | 'accumulator'    // Counter: total accumulating over time
    | 'counter'        // Simple counter
    | 'status'         // Binary/state
    | 'calculated'     // Derived from formula
    | 'manual'         // Human-entered

  quantity:
    | 'flow' | 'volume' | 'mass' | 'energy' | 'power'
    | 'pressure' | 'temperature' | 'level'
    | 'current' | 'voltage' | 'runtime' | 'custom'

  unit: string

  source: MeasurementSource
}

type MeasurementSource =
  | { kind: 'manual'; frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand' }
  | { kind: 'iot'; protocol: 'mqtt' | 'opcua' | 'modbus' | 'http' | 'bacnet'; address: string; topic?: string; nodeId?: string; pollingSeconds?: number }
  | { kind: 'calculated'; formula: string; inputs: string[] }

interface AccumulatorConfig {
  rollover?: { enabled: boolean; maxValue: number }
  multiplier: number
  offset: number
  allowNegativeDelta: boolean
  resetDetection: boolean
}
```

Key rule: **A MeasurementPoint is NOT a visual node**. It is a data entity that can be bound to any node, edge, system, or area. The canvas MAY display a meter icon linked to the bound element, but the MeasurementPoint exists independently.

## Build Phase Reference

These phases document the original construction path. They are useful as
reference for what was built, but future work should normally follow
`docs/05_MASTER_IMPROVEMENT_PLAN.md`.

| Phase | Name | Status | Doc |
|-------|------|--------|-----|
| 0 | Fundación del Repo + Supabase | ✅ Complete | [fase-00.md](docs/fase-00.md) |
| 1 | App Shell + Auth + Multi-tenant | ✅ Complete | [fase-01.md](docs/fase-01.md) |
| 2 | Modelo + Utility Definitions + Standards + MeasurementPoints | ✅ Complete | [fase-02.md](docs/fase-02.md) |
| 3 | Mapa — Grafo Técnico MVP (React Flow) | ✅ Complete | [fase-03.md](docs/fase-03.md) |
| 4 | Motor de Grafo + Validación + Versionado + Serialización | ✅ Complete | [fase-04.md](docs/fase-04.md) |
| 5 | Medición + Acumuladores + IoT Binding | ✅ Complete | [fase-05.md](docs/fase-05.md) |
| 6 | Balances + Overlays Visuales | ✅ Complete | [fase-06.md](docs/fase-06.md) |
| 7 | EnPI, Baselines, Objetivos | ✅ Complete | [fase-07.md](docs/fase-07.md) |
| 8 | Acciones y Proyectos de Mejora | ✅ Complete (8a) | [fase-08.md](docs/fase-08.md) |
| 9 | Workspace SGEn alineado con ISO 50001 | ✅ Complete (9a) | [fase-09.md](docs/fase-09.md) |
| 10 | Reportes PDF/CSV + SVG/JSON Export | ⬜ Pending | [fase-10.md](docs/fase-10.md) |
| 11 | QA, Demo Dataset, Beta | ⬜ Pending | [fase-11.md](docs/fase-11.md) |

## Future Improvement Plan

Use [docs/05_MASTER_IMPROVEMENT_PLAN.md](docs/05_MASTER_IMPROVEMENT_PLAN.md)
for future implementation. It splits the remaining product hardening into short
MP phases focused on business logic, energy engineering and UI.

## MP Phase Status (Master Improvement Plan)

| Phase | Name | Status |
|-------|------|--------|
| MP-00 | Reorden documental y reglas de trabajo | ✅ Complete |
| MP-01 | Contexto global y shell operacional | ✅ Complete |
| MP-02 | Cockpit de Energy & Utilities | ✅ Complete |
| MP-03 | Modelo guiado y MeasurementPoint binding | ✅ Complete |
| MP-04 | Workspace técnico del mapa | ✅ Complete |
| MP-05 | Pipeline de medición y calidad de datos | ✅ Complete |
| MP-06 | Balance Run Wizard y overlays | ✅ Complete |
| MP-07 | EnPI, baseline y objetivos operables | ✅ Complete |
| MP-08 | Oportunidades, triage y M&V | ✅ Complete (base) |
| MP-09 | Workspace de proyectos energéticos + Gantt | ✅ Complete (base) |
| MP-10 | SGEn operativo alineado con ISO 50001 | ⬜ Pending |
| MP-11 | Reportes y exportaciones | ⬜ Pending |
| MP-12 | Administración y configuración energética | ⬜ Pending |
| MP-13 | Demo dataset, QA y beta | ⬜ Pending |

## Lightweight Plan Improvements

Keep these improvements small and practical:

1. Treat the current backend/domain base as a foundation, not something to
   rewrite casually.
2. Keep `README.md` as the human handoff and `AGENTS.md` as the AI handoff.
3. When a master-plan phase becomes large, split delivery into "service logic
   first" and "UI wiring second", but keep the same MP phase as the source of
   truth.
4. Avoid old mock-first prompts. This project is already Supabase-first.
5. Do not create competing roadmap documents; update the master plan or current
   state reference.

## Visual Design Tokens

- **Brand Blue** (#1e40af): Versa brand + electricity
- **Teal/Green** (#0d9488): Energy efficiency, sustainability, compressed air
- **Orange** (#ea580c): Gas, fuels, moderate deviations
- **Purple** (#7c3aed): Steam, thermal processes
- **Cyan** (#0891b2): Chilled water, industrial water, refrigeration
- **Red** (#dc2626): Losses, leaks, alarms, critical deviations
- **Gray** (#6b7280): Missing data, estimates, inactive

### Map Overlay Convention
- **Green**: Within target
- **Amber**: Moderate deviation
- **Red**: Critical deviation, loss, or leak
- **Gray**: No data or inactive
- **Thick line**: Higher utility flow
- **Dashed line**: Estimate or logical relation

Edge identification MUST use multi-channel approach:
- Color (by utility)
- Line pattern (solid = physical, dashed = estimate, dotted = logical)
- Label (tag or name)
- Direction arrow
- Tooltip
- Legend entry

## Key Design Decisions

1. **Graph-first, not drawing-first.** The canvas is the view; the graph is the truth.
2. **MeasurementPoint is independent.** It binds to nodes, edges, systems, or areas — not just a node type.
3. Module registry (`src/modules/index.ts`) defines all available modules; sidebar renders from it.
4. Zustand stores for UI state; Supabase for all persistent data.
5. Topology engine (`src/services/topology-engine/`) is pure logic, no React dependency.
6. Balance engine (`src/services/balance-engine/`) is pure logic, no React dependency.
7. Standards engine (`src/services/standards-engine/`) catalogs ISA-5.1, IEC 60617, ISO 14617, ISO/IEC 81346.
8. Diagram versioning: draft → published (frozen) → clone to new draft → edit → publish.
9. SGEn / ISO 50001 module translates energy management into practical workflows; it must not copy ISO text, tables, definitions, clauses or official checklists.
10. The product must not imply ISO certification, ISO endorsement, or replacement of the official standard.
11. VersaMaint compatibility starts with the shared asset-tree contract
    (plant -> area -> system -> equipment). Live bidirectional sync remains a
    post-MVP integration unless a shared asset registry/API is explicitly built.
12. Frontend never talks directly to industrial protocols (MQTT, OPC UA, Modbus).
13. Every equipment/node must have a unique tag.
14. Edges must specify flow direction.
15. Validation engine runs from Phase 4 onward.
