# VERIFY.md — Verificacion por tipo de cambio

Este documento define la verificacion minima antes de entregar cambios. Si una
tarea cruza categorias, ejecuta la union de verificaciones.

| Tipo de cambio | Verificacion minima | Notas |
|----------------|---------------------|-------|
| Solo documentacion | `git diff --check` | No requiere build si no toca codigo. |
| Frontend/TypeScript | `npm run build` | Incluye typecheck + Vite build. |
| UI visual | `npm run build` | Screenshot/browser solo si el usuario permite. |
| Migracion SQL | Revisar coherencia con tablas existentes; `npm run build` | VersaEnergy usa migraciones incrementales en `supabase/migrations/`. |
| Servicio/engine | `npm run build` | Topology, balance, measurement, cockpit, improvement, sgen engines. |
| Cambio de RLS | Revisar policies en migracion; `npm run build` | Verificar que RLS usa `company_id` scope. |
| Seed | `npm run build` | Seed provee datos demo; verificar coherencia. |

## Regla de documentacion

Todo cambio funcional debe actualizar la documentacion viva afectada:

- Modulo afectado: `docs/modules/<MODULO>.md`.
- `AGENTS.md` si cambia arquitectura, guardrails o estado de fases.
- `docs/04_CURRENT_STATE_REFERENCE.md` si cambia que existe, que funciona o
  que falta.
- `docs/ENERGY_ENGINEERING_BLUEPRINT.md` si cambia roadmap, fase viva,
  decisiones de arquitectura o memoria de fase.
- `docs/DATABASE.md` si cambia tabla, RLS o migracion.

Si no aplica actualizar docs, indicalo explicitamente en el cierre.

## Regla de cierre

Al finalizar, el agente debe indicar:

- Archivos modificados.
- Documentacion actualizada, o razon si no aplico.
- Verificacion ejecutada.
- Si toco o no schema, seed, `.env*` o codigo fuente.
