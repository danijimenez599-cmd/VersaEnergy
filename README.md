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

VersaEnergy is a work in progress.

- Phase 0: foundation + Supabase complete.
- Phase 1: app shell + auth + multi-tenant complete.
- Phase 2: utility model + standards + measurement points complete.
- Phase 3: React Flow map MVP complete.
- Phase 4 is the next architectural checkpoint: topology engine, validation,
  versioning and serialization.

See [AGENTS.md](AGENTS.md) for the canonical AI/project handoff and
[docs/fase-04.md](docs/fase-04.md) for the next planned phase.

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
- [docs/01_PRODUCT_VISION.md](docs/01_PRODUCT_VISION.md): product vision.
- [docs/02_TOPOLOGY_ENGINE.md](docs/02_TOPOLOGY_ENGINE.md): topology and graph model.
- [docs/03_AI_DEVELOPMENT_ROADMAP.md](docs/03_AI_DEVELOPMENT_ROADMAP.md): historical roadmap and AI planning notes.
- [docs/fase-00.md](docs/fase-00.md) to [docs/fase-11.md](docs/fase-11.md): current phase contracts.

If docs conflict, use this priority:

1. `AGENTS.md`
2. `docs/fase-NN.md`
3. product/topology docs
4. historical roadmap

## Hard Rules

- Zero mocks in runtime. Persist operational data in Supabase.
- Graph-first, not drawing-first.
- Every utility-aware entity must carry a utility type where applicable.
- Calculations must live in `src/services/`, not React components.
- Every phase must pass `npm run build`.
- RLS is required for all tenant-scoped tables.
- Frontend must not talk directly to MQTT, OPC UA, Modbus or other industrial protocols.
