# Fase 8 — Acciones de Ahorro

## Objetivo

Convertir hallazgos energéticos y de utilities en acciones gestionables con trazabilidad completa. Vista Kanban + tabla, vinculación a medidores, áreas, equipos, balances, EnPI y utility.

## Rol en la arquitectura

Las acciones son el output accionable del sistema: desviación en balance → insight → acción de ahorro. Deben vincularse al grafo semántico (utility, nodo, edge) y al sistema de gestión (EnPI, ISO 50001).

---

## Tareas

### 1. Estados de acción
```
idea → analysis → approved → in_progress → verified → closed
                                                  → cancelled
```

### 2. Modelo
```ts
interface SavingsAction {
  id: string
  siteId: string
  title: string
  description: string
  status: ActionStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  utility: string
  category: string // leakage, efficiency, behavioral, maintenance, investment

  // Vinculación al grafo
  sourceNodeIds?: string[]
  sourceEdgeIds?: string[]
  sourceBalanceId?: string
  sourceEnPIId?: string

  // Financiero
  estimatedSavings: number
  savingsUnit: string
  estimatedInvestment: number
  investmentCurrency: string
  paybackMonths?: number
  actualSavings?: number

  // Responsables
  assignedTo: string // profile ID
  department?: string

  // Fechas
  identifiedAt: Date
  startedAt?: Date
  completedAt?: Date
  verifiedAt?: Date
  targetDate?: Date
}
```

### 3. Tablas
```sql
energy_actions (id, site_id, title, description, status, priority, utility, category,
  source_node_ids jsonb, source_edge_ids jsonb, source_balance_id, source_enpi_id,
  estimated_savings, savings_unit, estimated_investment, investment_currency,
  payback_months, actual_savings,
  assigned_to FK→profiles, department,
  identified_at, started_at, completed_at, verified_at, target_date,
  created_by FK→profiles, created_at, updated_at)

energy_action_evidence (id, action_id, file_name, file_url, file_type, uploaded_by, uploaded_at)
energy_action_comments (id, action_id, author_id FK→profiles, content, created_at)
```

### 4. Vistas
- **Kanban**: columnas por estado, cards con título + utility badge + prioridad + asignado
- **Tabla**: filtrable, ordenable, exportable
- **Formulario**: creación/edición con todos los campos
- **Detalle**: historial de cambios, comentarios, evidencia

### 5. Integración con otras fases
- Desde balance (Fase 6): botón "Crear Acción" pre-llena utility, nodo, valor de desviación
- Desde overlay del mapa: botón "Crear Acción" sobre nodo/edge con desviación
- Desde EnPI (Fase 7): acción vinculada a EnPI con desviación significativa

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/modules/acciones/index.tsx` | Implementado |
| `src/modules/acciones/views/ActionKanban.tsx` | Creado |
| `src/modules/acciones/views/ActionTable.tsx` | Creado |
| `src/modules/acciones/views/ActionForm.tsx` | Creado |
| `src/modules/acciones/views/ActionDetail.tsx` | Creado |
| `src/modules/acciones/components/ActionCard.tsx` | Creado |
| `src/modules/acciones/components/EvidenceUpload.tsx` | Creado |
| `supabase/migrations/00010_actions.sql` | Creado |

---

## Criterios de Aceptación

- [ ] Kanban con drag & drop entre estados
- [ ] Estados: idea → analysis → approved → in_progress → verified → closed/cancelled
- [ ] Formulario con vinculación a: nodos, edges, balance, EnPI, utility
- [ ] Campos financieros: ahorro estimado, inversión, payback, ahorro real
- [ ] Evidencia adjuntable
- [ ] Comentarios con autor y timestamp
- [ ] Crear acción desde balance (pre-llenado)
- [ ] Crear acción desde overlay del mapa
- [ ] Filtros por utility, estado, prioridad, asignado
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa Acciones de Ahorro (Fase 8 de VersaEnergy).
Lee AGENTS.md y docs/fase-08.md.

Tareas:
1. Migración 00010_actions.sql: energy_actions, energy_action_evidence,
   energy_action_comments con RLS

2. Implementa src/modules/acciones/:
   - Vista Kanban con columnas por estado y drag & drop
   - Vista tabla con filtros (utility, estado, prioridad, asignado)
   - Formulario con: título, descripción, utility, categoría, prioridad,
     vinculación a nodos/edges/balance/EnPI, datos financieros, responsable
   - Detalle con timeline de cambios, comentarios, evidencia

3. Estados: idea, analysis, approved, in_progress, verified, closed, cancelled

4. Botón "Crear Acción" desde:
   - Vista de balances (Fase 6) — pre-llena utility + desviación
   - Overlay del mapa (Fase 6) — pre-llena nodo/edge

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
