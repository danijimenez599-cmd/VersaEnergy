# VersaEnergy

VersaEnergy is an Energy & Utilities Management app for modeling, measuring and
optimizing electricity, gas, steam, compressed air, water, thermal systems,
fuels, refrigeration and other critical utilities.

The core idea:

```txt
Equipos -> Mapa -> Medicion -> Calidad -> Balance -> EnPI ->
Oportunidad -> Accion/Proyecto -> Verificacion -> SGEn -> Reporte
```

The canvas is only the view. The source of truth is the semantic graph stored in
Supabase.

## Current Status

VersaEnergy has a strong domain foundation and an **asset-tree-first**
navigation architecture. The shell presents a persistent asset tree on the left
and discipline lenses (Medicion, Balance, Desempeno, Acciones, Mapa,
Mantenimiento) on the selected asset.

All core modules are implemented: Cockpit, Equipos (asset tree), Mapa (canvas
+ topology engine), Medicion (readings + CSV + quality), Balances (wizard +
simulation), Desempeno (EnPI + baselines + targets), Acciones (Kanban +
projects + Gantt + M&V), SGEn (ISO 50001 workspace) and Admin (4-tab layout).

Pending work:

- Reportes: UI ready, PDF/CSV render via `@react-pdf/renderer` pending.
- Admin: UI ready, Supabase JS connection pending.
- Demo dataset and QA.

## Acceso demo

```
email:    admin@demo.com
password: AdminDemo123!
```

### Datasets de demostración

El proyecto incluye dos scripts de seed acumulativos:

| Archivo | Contenido |
|---------|-----------|
| `supabase/seed.sql` | Base: empresa, sitio, áreas, equipos, medidores, 13 puntos de medición, 4 diagramas de utilities con nodos/edges, 18 meses de lecturas (ene-2025 a jun-2026), EnPIs, balances, baselines, targets, acciones de mejora y datos básicos de SGEn |
| `supabase/seed_phase2.sql` | Extensión: política energética activa, 5 riesgos/oportunidades, revisión energética completa, SEUs con control operacional, auditoría ejecutada (OK/GAP/NA), 3 NCs en diferentes estados, revisión directiva con paquete completo, 18 meses de variables significativas para análisis de regresión multivariable, diagrama de gas natural |

Para aplicar ambos sobre un proyecto Supabase local:

```bash
supabase db reset                          # aplica migraciones + seed.sql
psql "$DB_URL" -f supabase/seed_phase2.sql # extensión de datos
```

O directamente desde el dashboard de Supabase > SQL Editor > pegar el contenido de cada archivo.

### Módulos destacados para la demo

- **Mapa** — 5 diagramas publicados (eléctrico, vapor, aire, agua helada, gas natural)
- **Desempeño → Variables** — Botón "Variables" en cada EnPI abre análisis de regresión con 18 meses de datos correlacionados. Probar con `kWh/ton` y las variables temperatura + producción para ver R² ≈ 0.92
- **SGEn** — Ciclo completo vivo: política activa, riesgos con tratamiento, auditoría ejecutada con preguntas marcadas, NCs en progreso y cerrada, revisión directiva con paquete automático pre-generado

See [AGENTS.md](AGENTS.md) for the canonical AI/project handoff.

## Stack

- Vite + React 19 + TypeScript 6
- Tailwind CSS (vite plugin)
- Supabase (PostgreSQL, Auth, RLS)
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

| Document | Purpose |
|----------|---------|
| [AGENTS.md](AGENTS.md) | Canonical AI agent instructions and architecture |
| [docs/00_DOCUMENTATION_INDEX.md](docs/00_DOCUMENTATION_INDEX.md) | Documentation map and priority |
| [docs/modules/](docs/modules/) | Per-module documentation (CMMS-quality) |
| [docs/04_CURRENT_STATE_REFERENCE.md](docs/04_CURRENT_STATE_REFERENCE.md) | What exists, what works, known gaps |
| [docs/05_MASTER_IMPROVEMENT_PLAN.md](docs/05_MASTER_IMPROVEMENT_PLAN.md) | Improvement plan for future work |
| [docs/DATABASE.md](docs/DATABASE.md) | Tables, migrations and RLS reference |
| [docs/VERIFY.md](docs/VERIFY.md) | Verification guide by change type |
| [docs/01_PRODUCT_VISION.md](docs/01_PRODUCT_VISION.md) | Product vision |
| [docs/02_TOPOLOGY_ENGINE.md](docs/02_TOPOLOGY_ENGINE.md) | Topology and graph model |

If docs conflict, use this priority:

1. `AGENTS.md`
2. `docs/modules/<MODULE>.md`
3. `docs/05_MASTER_IMPROVEMENT_PLAN.md`
4. `docs/04_CURRENT_STATE_REFERENCE.md`
5. `docs/DATABASE.md`
6. product/topology docs

## Hard Rules

- Zero mocks in runtime. Persist operational data in Supabase.
- Graph-first, not drawing-first.
- Every utility-aware entity must carry a utility type where applicable.
- Calculations must live in `src/services/`, not React components.
- Every phase must pass `npm run build`.
- RLS is required for all tenant-scoped tables.
- Frontend must not talk directly to MQTT, OPC UA, Modbus or other industrial protocols.
- SGEn must not copy ISO 50001 text, tables, definitions or checklists.
