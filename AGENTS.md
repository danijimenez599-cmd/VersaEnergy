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
13. **Each module has its own doc in `docs/modules/<MODULE>.md`** — read it before starting work on that module.
14. **Edge visualization uses color + line pattern + label + direction arrow** — never color alone.
15. **Frontend never talks directly to industrial protocols** (MQTT, OPC UA, Modbus). IoT bindings go through backend/gateway.
16. **Every equipment/node must have a unique tag** within its facility and utility context.

## Current Project State

VersaEnergy has a functional base with an **asset-tree-first** shell
architecture where modules act as discipline lenses on the selected asset.
A refactor (MP-R0→R7) was completed in June 2026.

Canonical source of truth:

1. `AGENTS.md` for operating rules, architecture, commands and phase status.
2. `docs/00_DOCUMENTATION_INDEX.md` for documentation priority and navigation.
3. `docs/modules/<MODULE>.md` for per-module contracts (CMMS-quality docs).
4. `docs/05_MASTER_IMPROVEMENT_PLAN.md` for future implementation phases.
5. `docs/04_CURRENT_STATE_REFERENCE.md` for what exists, what works and known
   gaps.
6. `docs/DATABASE.md` for tables, migrations and RLS.
7. `docs/VERIFY.md` for verification by change type.
8. `docs/01_PRODUCT_VISION.md` and `docs/02_TOPOLOGY_ENGINE.md` for product and
   topology intent.

Do not reintroduce old mock/local-data instructions from archived planning docs.
The current project rule is Supabase-first and zero mocks.

## Project Structure

```
src/
  app/            # AppShell (asset-tree-first), router, providers, layouts
  shared/         # Reusable components
    AssetTree/    # Shared asset tree component (ported from CMMS)
    AssetLenses/  # Asset detail with discipline lenses
    Button.tsx, Badge.tsx, Card.tsx, Modal.tsx, etc.
  modules/        # Feature modules (one folder per module)
    inicio/       # Dashboard / Utilities Cockpit
    mapa/         # Energy & Utilities Map (canvas + topology)
      canvas/     # React Flow canvas, custom nodes, edges
      palette/    # Node palette grouped by family
      inspector/  # Side inspector for selected elements
    modelo/       # Equipos — Asset tree, areas, systems, equipment, meters
    medicion/     # Measurement: readings, CSV import, data quality
    balances/     # Utility balances, calculations
    desempeno/    # EnPI, baselines, targets, performance
    acciones/     # Savings actions, Kanban, projects, Gantt, M&V
    iso50001/     # SGEn workspace aligned with ISO 50001
    reportes/     # PDF/CSV reports (UI ready, render pending)
    admin/        # Administration, users, settings (UI ready, backend pending)
  store/          # Zustand stores (uiStore)
  services/       # Pure logic — NO React dependency
    asset-tree.ts           # Asset tree service (reads from assets_compat)
    cockpit.ts              # KPI calculations for dashboard
    equipmentSpecs.ts       # Equipment spec templates
    supabase.ts             # Supabase client singleton
    topology-engine/        # Graph compiler, validators, queries
    balance-engine/         # Balance calculation, losses, overlays
    measurement-engine/     # Accumulator logic, delta calculation, rollover
    improvement-engine/     # Improvement scoring, triage
    sgen-engine/            # SGEn evidence and compliance logic
supabase/
  migrations/     # SQL migration files (21 files, 00000-00020)
docs/
  modules/        # Per-module documentation (CMMS-quality)
  DATABASE.md     # Table/migration/RLS reference
  VERIFY.md       # Verification guide by change type
  MAPA_SCADA_PLAN.md  # Refactor SCADA Fases 0-5 (COMPLETO)
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
4. Read `docs/modules/<MODULE>.md` for the affected module.
5. For future product/UI/business work, read
   `docs/04_CURRENT_STATE_REFERENCE.md` and
   `docs/05_MASTER_IMPROVEMENT_PLAN.md`.
6. Read `docs/01_PRODUCT_VISION.md` or `docs/02_TOPOLOGY_ENGINE.md` only when the
   change touches product direction, topology, graph semantics or utilities.
7. Inspect only the source files needed for the task.
8. If the change touches DB/RLS/schema, read `docs/DATABASE.md` and inspect the
   relevant migration files in `supabase/migrations/`.
9. Verify with `npm run build` for code changes.
10. Update docs per `docs/VERIFY.md` when behavior, architecture, schema,
    phase status or guardrails change.

Do not scan the repo randomly to "understand everything". Build a task-specific
context packet.

## Change Map (if you change X, read Y)

| Change | Read first | Verify |
|--------|-----------|--------|
| Cockpit / KPIs | `docs/modules/INICIO.md`, `src/services/cockpit.ts` | `npm run build` |
| Asset tree / Equipos | `docs/modules/EQUIPOS.md`, `src/services/asset-tree.ts` | `npm run build` |
| Canvas / Mapa / Topology | `docs/modules/MAPA.md`, `docs/MAPA_SCADA_PLAN.md`, `docs/02_TOPOLOGY_ENGINE.md` | `npm run build` |
| Medicion / readings | `docs/modules/MEDICION.md` | `npm run build` |
| Balances | `docs/modules/BALANCES.md` | `npm run build` |
| EnPI / Desempeno | `docs/modules/DESEMPENO.md` | `npm run build` |
| Acciones / Proyectos | `docs/modules/ACCIONES.md` | `npm run build` |
| SGEn / ISO 50001 | `docs/modules/SGEN.md` | `npm run build`; no ISO text |
| Reportes | `docs/modules/REPORTES.md` | `npm run build` |
| Admin / Settings | `docs/modules/ADMIN.md` | `npm run build`; check RLS |
| DB / schema / RLS | `docs/DATABASE.md`, migration files | `npm run build` |

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
- the relevant `docs/modules/<MODULE>.md` for the affected module;
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

Original build phases (0-11) have been completed and their historical documentation has been removed to keep the workspace clean. For current state, see
`docs/04_CURRENT_STATE_REFERENCE.md`.

All original phases 0-9 are complete. Phases 10-11 are subordinated to
the master improvement plan.

## Future Improvement Plan

Use [docs/05_MASTER_IMPROVEMENT_PLAN.md](docs/05_MASTER_IMPROVEMENT_PLAN.md)
for future implementation.

## Phase Status

### Original MP Phases

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
| MP-08 | Oportunidades, triage y M&V | ✅ Complete |
| MP-09 | Workspace de proyectos energéticos + Gantt | ✅ Complete |
| MP-10 | SGEn operativo alineado con ISO 50001 | ✅ Complete |
| MP-11 | Reportes y exportaciones | ⏳ UI ready, exportacion pendiente |
| MP-12 | Administración y configuración energética | ⏳ UI ready, backend pendiente |
| MP-13 | Demo dataset, QA y beta | ⏳ Dataset rico completado; QA pendiente |

### Refactor MP-R (2026-06-02)

| Phase | Name | Status |
|-------|------|--------|
| MP-R0 | Cierre de identidad visual | ✅ Complete |
| MP-R1 | AssetTree compartido | ✅ Complete |
| MP-R2 | Shell asset-tree-first + lentes | ✅ Complete |
| MP-R3 | Migrar disciplinas a lentes | ✅ Complete |
| MP-R4 | Mantenimiento de medidores | ✅ Complete |
| MP-R5 | Admin prerequisitos + RLS | ✅ Complete |
| MP-R6 | Flujos transversales pulidos | ✅ Complete |
| MP-R7 | Convergencia árbol con CMMS | ✅ Complete |

### Refactor SCADA-inspired (2026-06-03)

| Phase | Name | Status |
|-------|------|--------|
| SCADA-0 | Mejoras UX inmediatas | ✅ Complete |
| SCADA-1 | Palette limpia + source_type en Modelo | ✅ Complete |
| SCADA-2 | Diagrama hereda del Modelo (EquipmentNode MPs inline) | ✅ Complete |
| SCADA-3 | Ancla por conexión visual (snap-to-edge, signal edge, rol auto) | ✅ Complete |
| SCADA-4 | Ingreso manual inline desde inspector | ✅ Complete |
| SCADA-5 | MPs calculados (engine puro, measurement_readings) | ✅ Complete |

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
3. Navigation is asset-tree-first with discipline lenses; `src/modules/index.ts` defines module registry.
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
