# Modulo: SGEn (Sistema de Gestion de la Energia)

## Responsabilidad

Workspace para operar un Sistema de Gestion de la Energia con criterio
profesional: alcance, responsabilidades, revision energetica, usos
significativos, objetivos, controles, auditoria, evidencia, acciones y mejora
continua. No copia texto de estandares, no menciona codigos normativos en UX y
no promete certificacion. Consume evidencia del resto de modulos y la organiza
para auditoria y gestion ejecutiva.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/sgen/index.tsx` |
| Politica energetica | `src/modules/sgen/views/PolicyView.tsx` |
| Revision por la direccion | `src/modules/sgen/views/DirectionView.tsx` |
| Riesgos y oportunidades | `src/modules/sgen/views/RisksView.tsx` |
| Alcance del SGEn | `src/modules/sgen/views/ScopeView.tsx` |
| Aviso de alcance | `src/modules/sgen/views/LegalSettingsView.tsx` |
| Status badge compartido | `src/modules/sgen/components/SgenStatusBadge.tsx` |

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
- `sgen_legal_notices` — aviso de alcance reconocido por usuario.

Migraciones base SGEn, mejoras de SGEn y trazabilidad desde Estudios hacia
evidencia.

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
| Alcance del producto | Aviso de alcance visible |

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

## Regla de lenguaje

El modulo debe ser compatible con auditorias y gestion energetica madura, pero
sin apoyarse en referencias normativas visibles. La redaccion debe sonar a un
profesional de gestion energetica:

- "alcance energetico", no codigos normativos;
- "revision energetica", no clausulas;
- "evidencia objetiva", no articulos;
- "brecha de gestion", no incumplimiento normativo copiado;
- "revision ejecutiva", no lenguaje de certificadora;
- "acciones y verificacion de eficacia", no frases propietarias.

Los checklists, reportes y paquetes documentales deben ser originales,
operativos y defendibles por evidencia del sistema.

## Paquete automatico de revision directiva

El boton "Preparar paquete automatico" en la tab Direccion consulta en paralelo:
- Ultima revision energetica (periodo, calidad de datos, hallazgos)
- Estado de objetivos activos vs alcanzados
- Acciones/proyectos con ahorros verificados y pendientes de alta prioridad
- Ultimas auditorias con conteo de gaps
- No conformidades abiertas/cerradas y vencidas
- Riesgos activos de nivel alto y oportunidades pendientes
- Evidencia reciente documentada
- Estudios energeticos recientes cuando existen como evidencia `energy_study`

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
- No mencionar codigos normativos, organismos ni certificacion en textos
  visibles al cliente.
- Aviso de alcance visible y reconocido por usuario.
- La evidencia nace del sistema, no de formularios manuales.
- Estudios Energeticos pueden generar evidencia `linked_entity_type =
  'energy_study'` como snapshot tecnico propio.
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
| Estudios Energeticos | `energy_studies`, `energy_study_findings` | Evidencia de revision energetica |
| Medicion | `measurement_points` | SEUs (measurement_point_ids) |
| Balances | `energy_balances` | Revision energetica (linked_balances — pendiente UI) |
| Riesgos | `sgen_risks_opportunities` | Paquete directivo |

## No hacer

- No copiar articulos, clausulas, tablas o checklists de estandares.
- No usar logos de organismos externos.
- No prometer certificacion.
- No crear formularios manuales cuando el dato existe en el sistema.
- No duplicar objetivos vs targets de EnPI.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Revisar que no se introduzca texto de estandar.
- Al agregar preguntas al catalogo: redactar en lenguaje operativo propio.
