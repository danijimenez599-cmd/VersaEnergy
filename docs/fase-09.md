# Fase 9 — Workspace ISO 50001

## Objetivo

Crear el sistema de gestión energética dentro de la app, apoyado por datos reales del grafo, mediciones, balances, EnPI y acciones. No copiar texto del estándar — traducir ISO 50001 a flujos prácticos.

## Rol en la arquitectura

ISO 50001 debe sentirse como consecuencia de operar bien la energía y los utilities. La evidencia nace de diagramas, mediciones, balances, acciones, objetivos y revisiones — no de documentos sueltos.

---

## Tareas

### 1. Secciones del workspace
1. **Alcance energético** — Límites, utilities incluidas, exclusiones
2. **Política energética** — Documento, fecha, revisión
3. **Revisión energética** — Datos de consumo, usos significativos
4. **SEUs** (Significant Energy Uses) — Vinculados a utilities, áreas, equipos
5. **Riesgos y oportunidades** — Incluyendo acción climática
6. **Objetivos y metas** — Vinculados a EnPI (Fase 7)
7. **Planes de acción** — Vinculados a acciones (Fase 8)
8. **Evidencias** — Documentos vinculados a secciones + datos del sistema
9. **Auditorías internas** — Plan, hallazgos, no conformidades
10. **Revisión gerencial** — Acta, decisiones, seguimiento
11. **No conformidades y acciones correctivas**
12. **Mejora continua** — Registro de mejoras

### 2. Modelo
```ts
interface ISOScope {
  id: string
  siteId: string
  description: string
  boundaries: string
  includedUtilities: string[]
  excludedUtilities: string[]
  exclusionsRationale: string
  approvedBy?: string
  approvedAt?: Date
}

interface SEU {
  id: string
  siteId: string
  name: string
  utility: string
  areaId?: string
  equipmentId?: string
  nodeIds?: string[]     // vinculación al grafo
  enpiId?: string        // vinculación a EnPI
  currentConsumption: number
  significanceRationale: string
}
```

### 3. Tablas
```sql
iso_scope, iso_policy, iso_energy_review,
iso_seus, iso_risks_opportunities,
iso_objectives, iso_action_plans,
iso_evidences, iso_audits, iso_audit_findings,
iso_management_reviews, iso_nonconformities,
iso_improvements
```

### 4. Dashboard de cobertura ISO
- % de secciones completadas
- SEUs con medición vs sin medición
- Objetivos con avance vs sin avance
- Acciones abiertas vs cerradas
- Próximas auditorías y revisiones

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/modules/iso50001/index.tsx` | Implementado |
| `src/modules/iso50001/views/ISODashboard.tsx` | Creado |
| `src/modules/iso50001/views/ScopeView.tsx` | Creado |
| `src/modules/iso50001/views/SEUsView.tsx` | Creado |
| `src/modules/iso50001/views/ObjectivesView.tsx` | Creado |
| `src/modules/iso50001/views/AuditsView.tsx` | Creado |
| `src/modules/iso50001/views/ManagementReview.tsx` | Creado |
| `src/modules/iso50001/components/ISOSection.tsx` | Creado |
| `supabase/migrations/00011_iso50001.sql` | Creado |

---

## Criterios de Aceptación

- [ ] 12 secciones navegables con formularios
- [ ] SEUs vinculables a utility, área, equipo, nodo del grafo, EnPI
- [ ] Objetivos vinculados a EnPI de Fase 7
- [ ] Evidencias vinculadas a secciones + referencias a datos del sistema
- [ ] Dashboard de cobertura con métricas
- [ ] NO copia texto del estándar — flujos prácticos y datos operativos
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa Workspace ISO 50001 (Fase 9 de VersaEnergy).
Lee AGENTS.md y docs/fase-09.md.

NO copies texto del estándar ISO. Traduce ISO a flujos prácticos.
La evidencia debe nacer de datos del sistema: diagramas, mediciones, balances, EnPI.

Tareas:
1. Migración 00011_iso50001.sql con 12+ tablas y RLS

2. Implementa src/modules/iso50001/ con 12 secciones:
   - Alcance, Política, Revisión energética, SEUs, Riesgos y oportunidades,
     Objetivos, Planes, Evidencias, Auditorías, Revisión gerencial,
     No conformidades, Mejora continua

3. SEUs vinculables a utility, área, equipo, nodo del grafo, EnPI
4. Objetivos vinculados a EnPI de Fase 7
5. Planes de acción vinculados a acciones de Fase 8
6. Evidencias como documentos + referencias a datos del sistema
7. Dashboard de cobertura ISO con % completado, SEUs, objetivos, acciones

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
