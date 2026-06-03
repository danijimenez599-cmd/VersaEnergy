# Modulo: SGEn (Sistema de Gestion de la Energia)

## Responsabilidad

Workspace para operar un Sistema de Gestion de la Energia alineado con buenas practicas
operativas de gestion energetica. No copia texto de estandares. No promete certificacion.
Consume evidencia del resto de modulos y la organiza para auditoria y mejora continua.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/iso50001/index.tsx` |
| Politica energetica | `src/modules/iso50001/views/PolicyView.tsx` |
| Revision por la direccion | `src/modules/iso50001/views/DirectionView.tsx` |
| Riesgos y oportunidades | `src/modules/iso50001/views/RisksView.tsx` |
| Alcance del SGEn | `src/modules/iso50001/views/ScopeView.tsx` |
| Aviso legal | `src/modules/iso50001/views/LegalSettingsView.tsx` |
| Status badge compartido | `src/modules/iso50001/components/SgenStatusBadge.tsx` |

## Modelo/Tablas

- `sgen_scopes` — alcance del SGEn (limites fisicos, utilities, exclusiones).
- `sgen_policy_documents` — politica energetica con ciclo de vida draft/active/superseded.
- `sgen_energy_reviews` — revisiones energeticas periodicas.
- `sgen_significant_uses` — usos significativos (SEUs) con control operacional.
- `sgen_objectives` — objetivos energeticos vinculados a EnPIs.
- `sgen_evidence` — evidencia trazable por dominio.
- `sgen_audits` — auditorias internas con checklist personalizable.
- `sgen_audit_findings` — hallazgos de auditoria.
- `sgen_management_reviews` — revisiones por la direccion con paquete auto-generado.
- `sgen_nonconformities` — no conformidades con flujo open/in_progress/resolved/closed.
- `sgen_risks_opportunities` — registro de riesgos y oportunidades con matriz prob x impacto.
- `sgen_improvements` — mejoras verificadas (tabla de registro; acciones reales en `energy_improvements`).
- `sgen_legal_notices` — aviso legal reconocido por usuario.

Migraciones: `00011_sgen_iso50001.sql`, `00017_sgen_enhancements.sql`.

## Tabs del modulo

| Tab | Contenido |
|-----|-----------|
| Cockpit | Madurez del SGEn (11 checks), ciclo PHVA, proxima mejor accion |
| Planificacion | Revision energetica, SEUs, objetivos, acciones — con navegacion a modulos externos |
| Politica | CRUD de politica energetica con ciclo de vida |
| Riesgos | Registro con matriz 3x3 prob x impacto, tratamiento, vinculo a acciones |
| Auditoria | Checklist interactivo (ok/gap/na por pregunta), catalogo de 32 preguntas originales, plantillas personalizadas |
| No conformidades | Ciclo open→in_progress→resolved→closed, cierre requiere evidencia de eficacia |
| Evidencia | Informacion documentada por dominio |
| Direccion | Revision por la direccion con paquete auto-generado desde el sistema |
| Alcance | Definicion de limites fisicos y organizacionales |
| Legal | Aviso legal visible |

## Flujo principal

1. Definir alcance y politica energetica.
2. Registrar riesgos y oportunidades con plan de tratamiento.
3. Documentar revision energetica con periodo, hallazgos y calidad de datos.
4. Definir SEUs con criterios operacionales, medidores y variables relevantes.
5. Crear objetivos vinculados a EnPIs; acciones van al modulo Acciones (sin duplicar).
6. Ejecutar auditoria interna con checklist personalizable; GAPs generan NCs.
7. Gestionar NCs con ciclo de vida completo y verificacion de eficacia.
8. Preparar paquete automatico de revision directiva (datos del sistema).
9. Tomar decisiones en revision directiva y registrarlas con responsable y fecha.

## Paquete automatico de revision directiva

El boton "Preparar paquete automatico" en la tab Direccion consulta en paralelo:
- Ultima revision energetica (periodo, calidad de datos, hallazgos)
- Estado de objetivos activos vs alcanzados
- Acciones/proyectos con ahorros verificados y pendientes de alta prioridad
- Ultimas auditorias con conteo de gaps
- No conformidades abiertas/cerradas y vencidas
- Riesgos activos de nivel alto y oportunidades pendientes
- Evidencia reciente documentada

Pre-rellena las 6 secciones de entradas del formulario. El usuario revisa, ajusta y agrega las decisiones.

## Auditoria interna

- Catalogo original de 32 preguntas agrupadas en 10 temas (no reproduce texto de estandar).
- El auditor selecciona preguntas por tema (checkbox individual o por tema completo).
- Puede agregar preguntas personalizadas con su propia evidencia esperada.
- El checklist es ejecutable: cada pregunta se marca OK / GAP / N/A.
- Las preguntas con GAP tienen boton directo para crear una NC pre-llenada.
- Barra de progreso por auditoria; estado cambia a "in_progress" / "completed" automaticamente.

## No conformidades — ciclo de vida

```
open → in_progress → resolved → closed
```
- Cierre requiere evidencia de verificacion de eficacia (campo obligatorio antes de cerrar).
- NCs vencidas se destacan en rojo.
- Cada NC puede generar una accion correctiva en el modulo Acciones (sin duplicar el registro).

## Invariantes

- **No copiar texto de ningun estandar** ni prometer certificacion.
- Aviso legal visible y reconocido por usuario.
- La evidencia nace del sistema, no de formularios manuales.
- Los objetivos SGEn se vinculan a EnPIs, no se duplican.
- Las acciones correctivas van al modulo Acciones; SGEN guarda solo el vinculo.
- Preguntas de auditoria son originales — redactadas operativamente, no copiadas.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

| Modulo origen | Dato consumido | Donde en SGEn |
|---------------|---------------|---------------|
| Acciones | `energy_improvements` | Objetivos (linked_improvement_id), NCs |
| Desempeno | `energy_enpis` | SEUs (enpi_id), Objetivos (enpi_id) |
| Desempeno | `energy_performance_results` | Revision energetica, paquete directivo |
| Medicion | `measurement_points` | SEUs (measurement_point_ids) |
| Balances | `energy_balances` | Revision energetica (linked_balances — pendiente UI) |
| Riesgos | `sgen_risks_opportunities` | Paquete directivo |

## No hacer

- No copiar articulos, clausulas, tablas o checklists de estandares.
- No usar logos de organismos de certificacion.
- No prometer certificacion.
- No crear formularios manuales cuando el dato existe en el sistema.
- No duplicar objetivos vs targets de EnPI.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Revisar que no se introduzca texto de estandar.
- Al agregar preguntas al catalogo: redactar en lenguaje operativo propio.
