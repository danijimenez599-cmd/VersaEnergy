# Fase 0 — Fundación del Repo + Supabase

> Nota documental: esta fase queda como referencia de construccion original.
> Para trabajo futuro usa `05_MASTER_IMPROVEMENT_PLAN.md`.

## Objetivo

Crear la base técnica limpia y compilable para VersaEnergy, con el stack completo instalado, estructura modular, cliente Supabase configurado y migración inicial de multi-tenant.

## Rol en la arquitectura

Esta fase establece el esqueleto sobre el cual se construirá el grafo semántico (Fases 2-4). No implementa lógica de dominio, solo infraestructura.

## Estado

✅ **Completada** — 2026-06-01

## Supabase Local

| Servicio | URL |
|----------|-----|
| API (REST) | `http://127.0.0.1:64321` |
| Studio | `http://127.0.0.1:64323` |
| Database | `postgresql://postgres:postgres@127.0.0.1:64322/postgres` |

Puertos: 64321-64327 (configurados en `supabase/config.toml`).

---

## Tareas Realizadas

### 1. Scaffold Vite + React + TypeScript
- `npm create vite@latest` con template `react-ts`
- Nombre de paquete: `versa-energy`
- React 19, TypeScript 6, Vite 8

### 2. Dependencias instaladas

**Producción:**
- `@supabase/supabase-js` — Cliente Supabase
- `zustand` — Estado global
- `recharts` — Gráficos
- `framer-motion` — Animaciones
- `lucide-react` — Iconos
- `@xyflow/react` — Canvas de topología (usado en Fase 3)
- `@react-pdf/renderer` — Reportes PDF
- `react-router-dom` — Router

**Desarrollo:**
- `tailwindcss` + `@tailwindcss/vite` — Estilos

### 3. Configuración
- Tailwind CSS con plugin Vite y design tokens (colores de marca + utility-specific)
- Path alias `@/` → `src/` en Vite y TypeScript
- `.env` + `.gitignore` configurados

### 4. Estructura de carpetas
```
src/
  app/            # AppShell (placeholder, Fase 1)
  shared/         # Componentes reutilizables (Fase 1)
  modules/        # inicio, mapa, modelo, medicion, balances,
                  # desempeno, acciones, iso50001, reportes, admin
  store/          # Zustand (uiStore creado)
  services/       # Lógica pura (supabase client creado)
supabase/
  migrations/     # 00000_initial.sql
```

### 5. Cliente Supabase
- `src/services/supabase.ts` — Singleton, lanza error si faltan env vars

### 6. Migración inicial
- Tablas `companies` + `profiles` con RLS completo
- Trigger `handle_new_user` para auto-registro en auth
- Roles: admin, manager, engineer, operator, viewer
- Migración aplicada y verificada en Supabase local

### 7. Zustand store base
- `uiStore.ts`: sidebar, activeModule, selectedSiteId, selectedUtilityType

### 8. Module registry
- 10 módulos definidos en `src/modules/index.ts`

---

## Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `package.json` | Modificado (name, dependencias) |
| `vite.config.ts` | Modificado (Tailwind plugin, path alias) |
| `tsconfig.app.json` | Modificado (path alias) |
| `index.html` | Modificado (title) |
| `src/index.css` | Reescrito (Tailwind + design tokens) |
| `src/main.tsx` | Simplificado |
| `src/App.tsx` | Reescrito (landing screen con badges de utilities) |
| `src/services/supabase.ts` | Creado |
| `src/services/index.ts` | Creado |
| `src/store/uiStore.ts` | Creado |
| `src/store/index.ts` | Creado |
| `src/shared/index.ts` | Creado |
| `src/modules/index.ts` | Creado |
| `src/app/AppShell.tsx` | Creado (placeholder) |
| `.env.example` | Creado |
| `.env` | Creado (valores reales) |
| `supabase/migrations/00000_initial.sql` | Creado y aplicado |
| `supabase/config.toml` | Creado (ports 64321-64327) |
| `AGENTS.md` | Creado y actualizado con arquitectura de grafo semántico |
| `docs/fase-00.md` | Este archivo |

---

## Criterios de Aceptación

- [x] `npm install` funciona sin errores
- [x] `npm run build` compila exitosamente
- [x] Estructura modular existe
- [x] La app muestra pantalla inicial con nombre y badges de utilities
- [x] Cliente Supabase configurado
- [x] Migración inicial aplicada en Supabase local
- [x] RLS verificado en API REST
- [x] Zustand store de UI inicial creado
- [x] Module registry con 10 módulos
- [x] AGENTS.md completo como documento maestro para AI

---

## Prompt usado para esta fase

```txt
Crea la base inicial de VersaEnergy con Vite, React, TypeScript y Tailwind.
VersaEnergy será una app de Energy & Utilities Management, no solo electricidad.
[Ver AGENTS.md para contexto completo de arquitectura de grafo semántico]

Stack: Vite + React 19 + TypeScript 6 + Tailwind CSS.
Dependencias: @supabase/supabase-js, zustand, recharts, framer-motion,
  lucide-react, @xyflow/react, @react-pdf/renderer, react-router-dom.

Crea estructura modular:
  src/app, src/shared, src/modules, src/store, src/services,
  supabase/migrations, docs.

Crea cliente Supabase, migración multi-tenant con RLS,
Zustand store de UI, module registry y pantalla inicial limpia.

No implementes lógica de dominio todavía.
El proyecto debe compilar con npm run build.
```
