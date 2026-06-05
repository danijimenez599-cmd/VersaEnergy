# VersaEnergy — Indice de documentacion

## Proposito

Este indice organiza la documentacion actual de VersaEnergy para evitar que los
planes historicos compitan con el blueprint vigente.

VersaEnergy tiene una base tecnica solida, arquitectura asset-tree-first y
compatibilidad Core/CMMS. El trabajo futuro se planifica solo desde
`ENERGY_ENGINEERING_BLUEPRINT.md`; los demas documentos describen estado,
contratos tecnicos, modulos, base de datos o verificacion.

## Orden recomendado de lectura

1. `../AGENTS.md`
   - Contrato principal para AI y reglas de arquitectura.
   - Define guardrails, stack, modelo de contexto y decisiones criticas.

2. `04_CURRENT_STATE_REFERENCE.md`
   - Referencia de lo ya construido.
   - Resume que piezas funcionan, que piezas existen solo como base y donde hay
     brechas importantes.

3. `ENERGY_ENGINEERING_BLUEPRINT.md`
   - **Unico documento de plan vivo.**
   - Define el contrato conceptual CMMS/Energy, modulos, entidades satelite,
     roadmap E0-E13, backlog transversal, excepciones e invariantes.
   - Leer antes de cambios grandes en arquitectura, schema, topologia,
     medicion, balances, Energy Studies, SGEn, reportes o convergencia con
     VersaMaint.

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

6a. `modules/CORE_ASSET_REGISTRY.md`
   - Contrato vigente de activos fisicos compartidos con VersaMaint/Core.
   - Leer antes de tocar activos, MeasurementPoints, medidores fisicos,
     solicitudes cross-app, eventos de registry o compatibilidad con CMMS.

7. `DATABASE.md`
   - Referencia de tablas, migraciones y RLS.
   - Leer cuando el cambio toque DB.

8. `VERIFY.md`
   - Verificacion minima por tipo de cambio.

## Fuente de verdad

Si dos documentos se contradicen, usar esta prioridad:

1. `AGENTS.md`
2. `docs/00_DOCUMENTATION_INDEX.md`
3. `docs/ENERGY_ENGINEERING_BLUEPRINT.md`
4. `docs/modules/<MODULO>.md`
5. `docs/04_CURRENT_STATE_REFERENCE.md`
6. `docs/DATABASE.md`
7. `docs/01_PRODUCT_VISION.md`
8. `docs/02_TOPOLOGY_ENGINE.md`

No debe existir otro documento de plan vivo. Los planes temporales completados
se eliminan; los pendientes se integran al blueprint.

## Como pedir trabajo futuro a AI

Para cualquier mejora nueva:

```txt
Lee AGENTS.md, docs/00_DOCUMENTATION_INDEX.md,
docs/ENERGY_ENGINEERING_BLUEPRINT.md y docs/04_CURRENT_STATE_REFERENCE.md.
Lee docs/modules/<MODULO>.md del modulo afectado.
Trabaja solo la fase o backlog indicado en el blueprint.
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
| `ENERGY_ENGINEERING_BLUEPRINT.md` | Unico plan vivo: arquitectura, fases E0-E13, backlog y memoria de decisiones |
| `04_CURRENT_STATE_REFERENCE.md` | Lo construido y brechas |
| `modules/*.md` | Documentacion por modulo (CORE_ASSET_REGISTRY, INICIO, EQUIPOS, MAPA, MEDICION, BALANCES, DESEMPENO, ESTUDIOS, ACCIONES, SGEN, REPORTES, ADMIN) |
| `DATABASE.md` | Referencia de tablas, migraciones y RLS |
| `VERIFY.md` | Verificacion por tipo de cambio |
