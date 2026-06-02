# VersaEnergy

VersaEnergy is an Energy & Utilities Management app for modeling, measuring and
optimizing electricity, gas, steam, compressed air, water, thermal systems,
fuels, refrigeration and other critical utilities.

The core idea:

```txt
Canvas visual -> semantic utility graph -> measurement -> balance -> deviation -> action
```

The canvas is only the view. The source of truth is the semantic graph stored in
Supabase.

## Current Status

VersaEnergy is a work in progress. The backend/domain foundation is already
strong for an early product: Supabase, RLS, utility catalog, semantic graph,
measurement, balances, EnPI, improvements and the SGEn base exist.

The next work is not another broad backend pass. It is product hardening:
business workflows, energy-engineering logic exposed correctly in UI, richer
forms, data quality flows, map validation, balance execution, EnPI baseline
workflows, project execution, SGEn evidence and reports.

Current demo seed includes:

- login: `admin@demo.com` / `AdminDemo123!`;
- `Equipos` as the asset-tree entry point, with `/modelo` kept as legacy redirect;
- physical/virtual meter assets linked to MeasurementPoints;
- four real utility diagrams linked to the asset tree: electricity, steam,
  compressed air and chilled water.

See [AGENTS.md](AGENTS.md) for the canonical AI/project handoff and
[docs/05_MASTER_IMPROVEMENT_PLAN.md](docs/05_MASTER_IMPROVEMENT_PLAN.md) for
the current future implementation plan.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase/PostgreSQL/Auth/RLS
- Zustand
- React Router
- Recharts
- Framer Motion
- Lucide React
- @xyflow/react
- @react-pdf/renderer

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Documentation Map

- [AGENTS.md](AGENTS.md): canonical instructions for AI agents.
- [docs/00_DOCUMENTATION_INDEX.md](docs/00_DOCUMENTATION_INDEX.md): documentation map and priority.
- [docs/01_PRODUCT_VISION.md](docs/01_PRODUCT_VISION.md): product vision.
- [docs/02_TOPOLOGY_ENGINE.md](docs/02_TOPOLOGY_ENGINE.md): topology and graph model.
- [docs/03_AI_DEVELOPMENT_ROADMAP.md](docs/03_AI_DEVELOPMENT_ROADMAP.md): historical roadmap and AI planning notes.
- [docs/04_CURRENT_STATE_REFERENCE.md](docs/04_CURRENT_STATE_REFERENCE.md): what exists, what works and known gaps.
- [docs/05_MASTER_IMPROVEMENT_PLAN.md](docs/05_MASTER_IMPROVEMENT_PLAN.md): current improvement plan for future work.
- [docs/fase-00.md](docs/fase-00.md) to [docs/fase-11.md](docs/fase-11.md): build-phase reference and historical contracts.

If docs conflict, use this priority:

1. `AGENTS.md`
2. `docs/05_MASTER_IMPROVEMENT_PLAN.md`
3. `docs/04_CURRENT_STATE_REFERENCE.md`
4. product/topology docs
5. `docs/fase-NN.md`
6. historical roadmap

## Hard Rules

- Zero mocks in runtime. Persist operational data in Supabase.
- Graph-first, not drawing-first.
- Every utility-aware entity must carry a utility type where applicable.
- Calculations must live in `src/services/`, not React components.
- Every phase must pass `npm run build`.
- RLS is required for all tenant-scoped tables.
- Frontend must not talk directly to MQTT, OPC UA, Modbus or other industrial protocols.
