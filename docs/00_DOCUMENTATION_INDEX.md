# VersaEnergy — Indice de documentacion

## Proposito

Este indice organiza la documentacion actual de VersaEnergy para evitar que los
planes historicos compitan con el plan vigente.

VersaEnergy tiene una base tecnica solida y una arquitectura asset-tree-first
con lentes de disciplina sobre el activo seleccionado. El trabajo futuro debe
enfocarse en completar flujos, conectar UI a backend real, reportes, SGEn
operativo y demo dataset.

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

4. `01_PRODUCT_VISION.md`
   - Vision de producto.
   - Define el norte: Energy & Utilities Management, mapa semantico,
     desempeno, acciones y SGEn.

5. `02_TOPOLOGY_ENGINE.md`
   - Referencia tecnica del grafo semantico.
   - Leer cuando el cambio toque mapa, nodos, edges, MeasurementPoints,
     validacion, versionado o balances.

6. `modules/*.md`
   - Documentacion por modulo (estilo CMMS).
   - Leer antes de abrir codigo fuente del modulo afectado.

6b. `MAPA_SCADA_PLAN.md` ← **Plan activo si trabajas en Mapa o Modelo**
   - Arquitectura SCADA-inspired decidida y bloqueada.
   - Estado de cada fase (0-5) con tareas checklist.
   - Leer antes de cualquier cambio al modulo Mapa, Inspector,
     palette, nodes o useEquipmentMPs.

7. `DATABASE.md`
   - Referencia de tablas, migraciones y RLS.
   - Leer cuando el cambio toque DB.

8. `VERIFY.md`
   - Verificacion minima por tipo de cambio.

## Fuente de verdad

Si dos documentos se contradicen, usar esta prioridad:

1. `AGENTS.md`
2. `docs/modules/<MODULO>.md`
3. `docs/05_MASTER_IMPROVEMENT_PLAN.md`
4. `docs/04_CURRENT_STATE_REFERENCE.md`
5. `docs/DATABASE.md`
6. `docs/01_PRODUCT_VISION.md`
7. `docs/02_TOPOLOGY_ENGINE.md`

## Como pedir trabajo futuro a AI

Para cualquier mejora nueva:

```txt
Lee AGENTS.md, docs/00_DOCUMENTATION_INDEX.md,
docs/04_CURRENT_STATE_REFERENCE.md y docs/05_MASTER_IMPROVEMENT_PLAN.md.
Lee docs/modules/<MODULO>.md del modulo afectado.
Trabaja solo la fase indicada.
No reescribas backend salvo que la fase lo pida.
Manten Supabase-first, cero mocks y npm run build verde.
```

## Estado documental

| Documento | Rol actual |
|-----------|------------|
| `AGENTS.md` | Contrato AI y arquitectura |
| `00_DOCUMENTATION_INDEX.md` | Mapa de documentacion |
| `01_PRODUCT_VISION.md` | Vision de producto |
| `02_TOPOLOGY_ENGINE.md` | Referencia del grafo |
| `04_CURRENT_STATE_REFERENCE.md` | Lo construido y brechas |
| `05_MASTER_IMPROVEMENT_PLAN.md` | Plan vigente futuro |
| `MAPA_SCADA_PLAN.md` | **Plan activo** de refactor SCADA del modulo Mapa (Fases 0-5) — leer antes de tocar Mapa o Modelo |
| `modules/*.md` | Documentacion por modulo (INICIO, EQUIPOS, MAPA, MEDICION, BALANCES, DESEMPENO, ACCIONES, SGEN, REPORTES, ADMIN) |
| `DATABASE.md` | Referencia de tablas, migraciones y RLS |
| `VERIFY.md` | Verificacion por tipo de cambio |
