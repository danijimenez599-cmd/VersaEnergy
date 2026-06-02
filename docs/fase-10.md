# Fase 10 — Reportes PDF/CSV + SVG/JSON Export

> Nota documental: este plan queda como referencia inicial. Para implementacion
> futura usa `05_MASTER_IMPROVEMENT_PLAN.md`, especialmente MP-11.

## Objetivo

Generar salidas profesionales para gestión, auditoría y respaldo técnico. PDFs con `@react-pdf/renderer`, CSV exportables, y exportación del diagrama como SVG + JSON (snapshot del grafo).

---

## Tareas

### 1. Servicio de reportes (`src/services/reports-engine/`)
```ts
// reportBuilder.ts
function generateMonthlyReport(siteId, period): PDFDocument
function generateBalanceReport(balanceId): PDFDocument
function generateEnPIReport(enpiId, from, to): PDFDocument
function generateSgenReport(siteId): PDFDocument
```

### 2. Plantillas PDF
Cada reporte debe incluir en header/footer:
- Periodo, alcance (site/utility), utility, fuente de datos
- Diagram version ID (si aplica)
- Usuario que generó, timestamp
- Marca "ESTIMADO" en datos no medidos directamente
- Logo de VersaEnergy

**Reporte mensual:**
- Consumo total por utility
- Comparación vs mes anterior, vs mismo mes año anterior
- Top consumidores
- Calidad de datos
- Alertas del periodo

**Reporte de balance:**
- Entrada total, medido, calculado, estimado, pérdidas, no explicado
- Gráfico de composición
- Detalle por nodo
- Diagram version ID usado

**Reporte de EnPI:**
- Tendencia real vs baseline vs target
- Tabla de valores por periodo
- % cumplimiento de objetivo

**Reporte SGEn:**
- Resumen de cobertura del sistema de gestión energética
- SEUs con estado de medición
- Objetivos con avance
- Acciones abiertas

### 3. Export CSV
- Lecturas de MeasurementPoints (filtrable por punto, fecha, utility)
- Resultados de balances
- Listado de acciones

### 4. Export SVG/JSON del diagrama
- SVG: imagen del canvas actual para documentación
- JSON: snapshot completo del diagrama (`DiagramSnapshot` de serialization.ts en Fase 4)
- Incluye: nodes, edges, measurementPoints, standardsProfile, validationSummary

### 5. Tabla de historial
```sql
energy_generated_reports (
  id, site_id, report_type, format, parameters jsonb,
  file_url, generated_by FK→profiles, generated_at
)
```

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `src/services/reports-engine/reportBuilder.ts` | Creado |
| `src/services/reports-engine/templates/MonthlyReport.tsx` | Creado |
| `src/services/reports-engine/templates/BalanceReport.tsx` | Creado |
| `src/services/reports-engine/templates/EnPIReport.tsx` | Creado |
| `src/services/reports-engine/templates/SgenReport.tsx` | Creado |
| `src/services/reports-engine/index.ts` | Creado |
| `src/modules/reportes/index.tsx` | Implementado |
| `src/modules/reportes/views/ReportBuilder.tsx` | Creado |
| `src/modules/reportes/views/ExportTools.tsx` | Creado |
| `src/modules/reportes/views/ReportHistory.tsx` | Creado |
| `supabase/migrations/00012_reports.sql` | Creado |

---

## Criterios de Aceptación

- [ ] PDF mensual con consumos, comparativas y calidad de datos
- [ ] PDF de balance con todos los componentes
- [ ] PDF de EnPI con tendencia y cumplimiento
- [ ] PDF SGEn con resumen de cobertura, sin texto propietario ISO
- [ ] Todos los PDFs muestran: periodo, utility, diagram version, fuente, usuario
- [ ] Datos estimados identificados visualmente en PDF
- [ ] CSV exportable de lecturas y balances
- [ ] SVG export del diagrama
- [ ] JSON export del snapshot completo del grafo
- [ ] Historial de reportes generados
- [ ] `npm run build` funciona

---

## Prompt sugerido para AI

```txt
Implementa Reportes PDF/CSV + SVG/JSON Export (Fase 10 de VersaEnergy).
Lee AGENTS.md y docs/fase-10.md.

Usa @react-pdf/renderer para PDFs.

Tareas:
1. Crea src/services/reports-engine/ con plantillas PDF:
   - MonthlyReport: consumo por utility, comparativas, calidad datos
   - BalanceReport: todos los componentes del balance + diagram version
   - EnPIReport: tendencia real vs baseline vs target
   - SgenReport: cobertura del sistema de gestión energética
   - Cada PDF: header/footer con periodo, utility, fuente, usuario, "ESTIMADO" tags

2. CSV export: lecturas por MeasurementPoint, resultados de balances

3. SVG export del canvas del diagrama
4. JSON export del DiagramSnapshot completo (schema 1.0.0)

5. Migración 00012_reports.sql para historial de reportes

6. Módulo src/modules/reportes/ con:
   - Selector de tipo de reporte + parámetros (periodo, utility, site)
   - Preview/generación
   - Historial de reportes generados

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
