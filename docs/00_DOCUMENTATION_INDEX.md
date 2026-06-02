# VersaEnergy — Indice de documentacion

## Proposito

Este indice organiza la documentacion actual de VersaEnergy para evitar que los
planes historicos compitan con el plan vigente.

VersaEnergy ya tiene una base tecnica solida: Supabase, RLS, modelo de utilities,
grafo, medicion, balances, EnPI, mejoras y base SGEn. El trabajo futuro debe
enfocarse en completar flujos, UI, formularios, validaciones visibles y
experiencia operacional.

## Orden recomendado de lectura

1. `../AGENTS.md`
   - Contrato principal para AI y reglas de arquitectura.
   - Define guardrails, stack, modelo de contexto y decisiones criticas.

2. `04_CURRENT_STATE_REFERENCE.md`
   - Referencia de lo ya construido.
   - Resume que piezas funcionan, que piezas existen solo como base y donde hay
     brechas importantes.

3. `05_MASTER_IMPROVEMENT_PLAN.md`
   - Plan maestro vigente para trabajo futuro.
   - Divide la mejora de la app en fases cortas, verificables y orientadas a
     negocio, ingenieria energetica y UI.
   - Registra el estado implementado de `Equipos`, medidores mantenibles y
     mapa vinculado al arbol.

4. `01_PRODUCT_VISION.md`
   - Vision de producto.
   - Define el norte: Energy & Utilities Management, mapa semantico,
     desempeno, acciones y SGEn.

5. `02_TOPOLOGY_ENGINE.md`
   - Referencia tecnica del grafo semantico.
   - Leer cuando el cambio toque mapa, nodos, edges, MeasurementPoints,
     validacion, versionado o balances.

6. `fase-00.md` a `fase-11.md`
   - Build log y contratos historicos por fase.
   - Usar como referencia de lo construido o planificado originalmente.
   - No usarlos como plan futuro si contradicen el plan maestro.

7. `03_AI_DEVELOPMENT_ROADMAP.md`
   - Roadmap historico.
   - Conservado para contexto, pero no es canonico.

## Fuente de verdad

Si dos documentos se contradicen, usar esta prioridad:

1. `AGENTS.md`
2. `docs/05_MASTER_IMPROVEMENT_PLAN.md`
3. `docs/04_CURRENT_STATE_REFERENCE.md`
4. `docs/01_PRODUCT_VISION.md`
5. `docs/02_TOPOLOGY_ENGINE.md`
6. `docs/fase-NN.md`
7. `docs/03_AI_DEVELOPMENT_ROADMAP.md`

## Como pedir trabajo futuro a AI

Para cualquier mejora nueva:

```txt
Lee AGENTS.md, docs/00_DOCUMENTATION_INDEX.md,
docs/04_CURRENT_STATE_REFERENCE.md y docs/05_MASTER_IMPROVEMENT_PLAN.md.
Trabaja solo la fase MP-XX indicada.
No reescribas backend salvo que la fase lo pida.
Mantén Supabase-first, cero mocks y npm run build verde.
```

## Estado documental

| Documento | Rol actual |
|-----------|------------|
| `AGENTS.md` | Contrato AI y arquitectura |
| `00_DOCUMENTATION_INDEX.md` | Mapa de documentacion |
| `01_PRODUCT_VISION.md` | Vision de producto |
| `02_TOPOLOGY_ENGINE.md` | Referencia del grafo |
| `03_AI_DEVELOPMENT_ROADMAP.md` | Historico, no canonico |
| `04_CURRENT_STATE_REFERENCE.md` | Lo construido y brechas |
| `05_MASTER_IMPROVEMENT_PLAN.md` | Plan vigente futuro |
| `TEMP_PLAN_EQUIPOS_MAPA_VERSAMAINT.md` | Plan temporal ejecutado para Equipos + mapa |
| `fase-00.md` a `fase-09.md` | Referencia de construccion ya avanzada |
| `fase-10.md` y `fase-11.md` | Planes antiguos utiles, subordinados al plan maestro |
