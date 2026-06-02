# Fase 9 — Workspace SGEn alineado con ISO 50001

## Objetivo

Crear un workspace para operar, documentar y auditar un Sistema de Gestion de la
Energia (SGEn) alineado con ISO 50001, apoyado por datos reales del grafo,
mediciones, balances, EnPI, objetivos y acciones/proyectos de mejora.

La fase no debe reproducir texto propietario del estandar ni presentarse como
sustituto de la norma oficial. VersaEnergy debe convertir los principios de
gestion energetica en flujos practicos, evidencia trazable y decisiones
ejecutables.

## Resumen ejecutivo

La Fase 9 transforma VersaEnergy en un workspace de gestion energetica listo
para preparar auditorias, revisiones internas y seguimiento de mejora continua.

El usuario no debe sentir que esta llenando un binder digital. Debe ver un
centro operativo donde:

- el alcance energetico esta definido;
- los usos significativos de energia tienen datos, responsables y seguimiento;
- los EnPI, baselines y objetivos explican el desempeno;
- las desviaciones generan acciones rapidas o proyectos;
- la evidencia nace de mapas, mediciones, balances, resultados y decisiones;
- la direccion puede revisar desempeno, riesgos, oportunidades y compromisos.

La interfaz debe ser clara para planta, energia, mantenimiento, finanzas y
gerencia. El lenguaje visible debe ser original de VersaEnergy, no texto del
estandar.

## Principio legal y de propiedad intelectual

Esta fase tiene una restriccion prioritaria:

> VersaEnergy no incluye, reproduce ni reemplaza el texto oficial de ISO 50001.
> El workspace organiza procesos, datos y evidencias de gestion energetica con
> lenguaje propio. Cada organizacion usuaria es responsable de adquirir,
> consultar y usar la norma oficial cuando corresponda.

Reglas obligatorias:

1. No copiar parrafos, definiciones, tablas, notas, anexos ni checklists
   oficiales de ISO.
2. No usar el logo ISO ni insinuar relacion, aprobacion o certificacion por ISO.
3. No prometer "certificacion ISO"; usar "alineado con ISO 50001",
   "preparacion para auditoria" o "cobertura del SGEn".
4. No crear una checklist que replique palabra por palabra la estructura del
   estandar.
5. No enviar texto propietario de ISO a herramientas de IA. Si el usuario pega
   contenido del estandar, pedir confirmacion de derechos y preferir resumir a
   partir de criterios propios del sistema.
6. Todo texto de ayuda, preguntas de auditoria, plantillas y explicaciones debe
   ser original de VersaEnergy.
7. Guardar el origen de cada evidencia o documento: `app_original`,
   `user_original`, `public_source`, `tenant_reference`.
8. Incluir una nota visible en configuracion o ayuda: VersaEnergy no sustituye
   asesoramiento legal, consultoria de certificacion ni la norma oficial.

Fuentes publicas permitidas para referencia general:

- Paginas publicas de ISO sobre ISO 50001 y gestion energetica.
- Paginas publicas de ISO sobre copyright y permisos.
- Documentacion propia del cliente.
- Evidencia generada dentro de VersaEnergy.

## Rol en la arquitectura

El SGEn debe ser consecuencia natural de operar bien energia y utilities:

```txt
mapa -> medicion -> balance -> EnPI -> desviacion -> accion/proyecto -> evidencia -> revision -> mejora
```

Fase 9 conecta y ordena entregables de fases anteriores:

- **Fase 2 Modelo**: sitios, areas, procesos, equipos, utilities y medidores.
- **Fase 3-4 Mapa/Grafo**: topologia, nodos, edges, versiones y snapshots.
- **Fase 5 Medicion**: lecturas, calidad de datos y puntos de medicion.
- **Fase 6 Balances**: consumos, perdidas, retornos y consumo no explicado.
- **Fase 7 Desempeno**: EnPI, baselines, targets y resultados.
- **Fase 8 Acciones**: acciones rapidas, proyectos, M&V y cierre.
- **Fase 10 Reportes**: paquetes PDF/CSV para revision y auditoria.

## UX esperada

El workspace debe sentirse como una cabina de mando del SGEn, no como un
repositorio de archivos.

### Pantalla principal

Dashboard "Centro SGEn" con:

- sitio seleccionado;
- periodo de trabajo;
- estado del alcance;
- usos significativos con/sin medicion;
- EnPI con baseline y resultado reciente;
- objetivos activos y avance;
- acciones/proyectos vinculados;
- evidencias pendientes;
- auditorias y revisiones proximas;
- riesgos y oportunidades abiertos;
- decisiones gerenciales pendientes.

Usar "cobertura del SGEn" o "preparacion operativa", no "cumplimiento ISO".

### Navegacion

Tabs o sidebar secundaria:

1. Centro SGEn
2. Alcance
3. Revision energetica
4. Usos significativos
5. Objetivos y EnPI
6. Acciones y proyectos
7. Evidencia
8. Auditorias internas
9. Revision gerencial
10. No conformidades
11. Mejora continua
12. Configuracion legal

### Diseno UI

- Layout sobrio y operativo, consistente con VersaEnergy.
- Cards solo para items repetidos, no para envolver secciones enteras.
- Badges de estado: `borrador`, `en revision`, `aprobado`, `requiere accion`,
  `cerrado`, `vencido`.
- Matrices densas para SEUs, objetivos, evidencia y hallazgos.
- Panel lateral de detalle para editar sin perder contexto.
- Timeline para revision energetica, auditorias, decisiones y cierre.
- Indicadores claros, no decorativos.
- Cada recomendacion automatica debe mostrar fuente y razon.

## Dominios funcionales

### 1. Gobierno y alcance energetico

Registrar el alcance energetico del sitio u organizacion:

- sitios incluidos;
- utilities incluidas;
- limites fisicos y organizacionales;
- exclusiones y justificacion;
- responsable del SGEn;
- aprobador;
- fecha de aprobacion;
- version vigente;
- cambios historicos.

La UI debe ayudar al usuario a responder "que cubre el sistema" sin copiar
texto normativo.

### 2. Politica energetica propia

Gestionar documentos o declaraciones internas de la organizacion:

- titulo;
- version;
- propietario;
- fecha efectiva;
- revision pendiente;
- archivo o texto original del cliente;
- evidencia de comunicacion interna.

No generar una politica "ISO" por defecto. La app puede ofrecer una estructura
original de ayuda, pero el contenido final debe ser del usuario.

### 3. Revision energetica

Esta es la seccion tecnica central.

Debe consolidar:

- consumo por utility;
- costo por utility;
- intensidad energetica;
- principales areas, procesos y equipos consumidores;
- perdidas, retornos deficientes y consumo no explicado;
- calidad de datos;
- cambios operativos relevantes;
- riesgos y oportunidades;
- oportunidades que pueden pasar a Fase 8.

Debe conectarse directamente a mapas, mediciones, balances y EnPI.

### 4. Usos significativos de energia

Matriz para identificar y gestionar usos significativos:

- nombre;
- utility;
- area, proceso o equipo;
- nodos del grafo;
- puntos de medicion;
- consumo actual;
- costo estimado;
- criticidad operativa;
- capacidad de control;
- variabilidad;
- EnPI asociado;
- responsable;
- oportunidades vinculadas;
- estado de revision.

La significancia debe calcularse o sugerirse con criterios configurables, por
ejemplo: consumo, costo, variabilidad, riesgo operativo, impacto climatico y
capacidad de mejora.

### 5. Riesgos y oportunidades

Registro propio para gestion energetica:

- tipo: riesgo u oportunidad;
- fuente: revision, auditoria, desviacion, gerencia, usuario;
- utility;
- area/equipo/proceso;
- probabilidad;
- impacto;
- prioridad;
- posible relacion con accion climatica;
- accion rapida o proyecto relacionado;
- responsable;
- estado.

### 6. Objetivos, metas y EnPI

Cada objetivo debe estar conectado a datos reales:

- EnPI;
- baseline;
- target;
- periodo;
- responsable;
- ahorro esperado;
- inversion estimada;
- accion/proyecto relacionado;
- avance actual;
- metodo de medicion y verificacion;
- evidencia de cierre.

Evitar objetivos sin indicador o sin periodo.

### 7. Acciones y proyectos

La Fase 9 no reemplaza Fase 8. Debe consumirla.

Vistas esperadas:

- acciones/proyectos por objetivo;
- acciones/proyectos por SEU;
- acciones/proyectos por riesgo u oportunidad;
- acciones vencidas o sin evidencia;
- proyectos con ahorro pendiente de verificar;
- iniciativas listas para revision gerencial.

### 8. Evidencia inteligente

Crear un "Evidence Inbox" que sugiera evidencia desde datos del sistema:

- snapshot de mapa publicado;
- balance mensual;
- resultado de EnPI;
- baseline aprobado;
- objetivo actualizado;
- accion rapida cerrada;
- proyecto cerrado;
- auditoria interna;
- no conformidad;
- decision de revision gerencial;
- reporte generado.

Cada evidencia debe tener:

- titulo;
- descripcion original;
- fuente;
- objeto vinculado;
- periodo;
- owner;
- estado;
- archivo opcional;
- hash/checksum opcional;
- fecha de captura;
- origen de contenido.

### 9. Auditorias internas

Crear auditorias operativas con preguntas propias de VersaEnergy, no texto del
estandar.

Ejemplos de preguntas originales permitidas:

- ¿El alcance energetico vigente refleja los sitios y utilities operados?
- ¿Los usos significativos tienen datos recientes y responsables asignados?
- ¿Los EnPI principales cuentan con baseline y resultado del periodo?
- ¿Las desviaciones relevantes generaron accion o decision documentada?
- ¿Las acciones cerradas tienen evidencia de resultado?
- ¿La direccion reviso desempeno, riesgos, oportunidades y recursos?

Las auditorias deben generar hallazgos, no conformidades internas, acciones
correctivas y evidencia.

### 10. Revision gerencial

Vista tipo agenda ejecutiva:

- resumen de desempeno energetico;
- estado de objetivos;
- estado de SEUs;
- avance de acciones/proyectos;
- resultados de auditoria;
- riesgos y oportunidades;
- necesidades de recursos;
- decisiones tomadas;
- responsables y fechas;
- seguimiento de decisiones previas.

Debe poder generar un acta propia del cliente sin lenguaje copiado de ISO.

### 11. No conformidades y acciones correctivas

Gestionar hallazgos internos:

- fuente;
- descripcion;
- severidad;
- causa probable;
- accion correctiva;
- responsable;
- fecha compromiso;
- verificacion de eficacia;
- evidencia;
- estado.

### 12. Mejora continua

Registro de mejoras del SGEn:

- mejora detectada;
- origen;
- impacto esperado;
- resultado verificado;
- leccion aprendida;
- posibilidad de replicar en otros sitios;
- enlace a accion/proyecto.

## Modelo de datos propuesto

Usar nombres internos `sgen_*` para dejar claro que el producto opera un sistema
de gestion energetica propio, aunque este alineado con ISO 50001.

```ts
type SgenContentOrigin =
  | 'app_original'
  | 'user_original'
  | 'public_source'
  | 'tenant_reference'

interface SgenScope {
  id: string
  siteId: string
  name: string
  description: string
  boundaries: string
  includedUtilities: string[]
  excludedUtilities: string[]
  exclusionsRationale?: string
  ownerId?: string
  approvedBy?: string
  approvedAt?: Date
  version: number
  status: 'draft' | 'in_review' | 'approved' | 'archived'
}

interface SgenEnergyReview {
  id: string
  siteId: string
  periodStart: Date
  periodEnd: Date
  summary: string
  dataQualityScore?: number
  totalCost?: number
  totalConsumptionByUtility: Record<string, number>
  keyFindings: string[]
  status: 'draft' | 'reviewed' | 'approved'
}

interface SgenSignificantUse {
  id: string
  siteId: string
  reviewId?: string
  name: string
  utility: string
  areaId?: string
  processId?: string
  equipmentId?: string
  nodeIds: string[]
  measurementPointIds: string[]
  enpiId?: string
  consumptionValue?: number
  costValue?: number
  significanceScore?: number
  significanceRationale: string
  ownerId?: string
  status: 'candidate' | 'active' | 'monitoring' | 'retired'
}

interface SgenEvidence {
  id: string
  siteId: string
  title: string
  description?: string
  domain: string
  linkedEntityType: string
  linkedEntityId: string
  sourceType: 'system_snapshot' | 'uploaded_file' | 'manual_note' | 'generated_report'
  contentOrigin: SgenContentOrigin
  fileUrl?: string
  capturedAt: Date
  capturedBy?: string
  status: 'suggested' | 'accepted' | 'rejected' | 'superseded'
}
```

## Tablas esperadas

```sql
sgen_scopes
sgen_policy_documents
sgen_energy_reviews
sgen_significant_uses
sgen_risks_opportunities
sgen_objectives
sgen_objective_links
sgen_evidence
sgen_audits
sgen_audit_questions
sgen_audit_findings
sgen_management_reviews
sgen_management_review_decisions
sgen_nonconformities
sgen_corrective_actions
sgen_improvements
sgen_legal_notices
```

Todas las tablas deben tener:

- `tenant_id` o relacion equivalente multi-tenant;
- `site_id` cuando aplique;
- RLS;
- `created_by`, `created_at`, `updated_at`;
- estado operativo;
- referencias a entidades de fases anteriores cuando aplique.

## Servicios esperados

```txt
src/services/sgen-engine/
  coverage.ts
  evidenceSuggestions.ts
  significanceScoring.ts
  auditReadiness.ts
  legalGuards.ts
  index.ts
```

Responsabilidades:

- calcular cobertura del SGEn;
- sugerir usos significativos;
- sugerir evidencia;
- detectar objetivos sin EnPI o sin baseline;
- detectar acciones/proyectos sin evidencia de cierre;
- bloquear o advertir sobre contenido con riesgo de copyright;
- preparar datos para reportes de Fase 10.

## Archivos esperados

| Archivo | Accion |
|---------|--------|
| `src/modules/iso50001/index.tsx` | Implementar como workspace SGEn |
| `src/modules/iso50001/views/SgenDashboard.tsx` | Crear |
| `src/modules/iso50001/views/ScopeView.tsx` | Crear |
| `src/modules/iso50001/views/EnergyReviewView.tsx` | Crear |
| `src/modules/iso50001/views/SignificantUsesView.tsx` | Crear |
| `src/modules/iso50001/views/ObjectivesView.tsx` | Crear |
| `src/modules/iso50001/views/ActionLinksView.tsx` | Crear |
| `src/modules/iso50001/views/EvidenceInbox.tsx` | Crear |
| `src/modules/iso50001/views/InternalAuditsView.tsx` | Crear |
| `src/modules/iso50001/views/ManagementReviewView.tsx` | Crear |
| `src/modules/iso50001/views/NonconformitiesView.tsx` | Crear |
| `src/modules/iso50001/views/LegalSettingsView.tsx` | Crear |
| `src/modules/iso50001/components/SgenStatusBadge.tsx` | Crear |
| `src/modules/iso50001/components/EvidenceLinker.tsx` | Crear |
| `src/modules/iso50001/components/LinkedDataPanel.tsx` | Crear |
| `src/services/sgen-engine/index.ts` | Crear |
| `src/services/sgen-engine/coverage.ts` | Crear |
| `src/services/sgen-engine/evidenceSuggestions.ts` | Crear |
| `src/services/sgen-engine/significanceScoring.ts` | Crear |
| `src/services/sgen-engine/legalGuards.ts` | Crear |
| `supabase/migrations/00011_sgen_iso50001.sql` | Crear |

## Criterios de aceptacion

- [ ] El modulo se presenta como SGEn alineado con ISO 50001, no como copia del estandar.
- [ ] Existe nota legal visible indicando que VersaEnergy no reproduce ni sustituye la norma oficial.
- [ ] No hay textos, definiciones, tablas, checklists ni clausulas copiadas de ISO.
- [ ] Dashboard de cobertura del SGEn con estado por dominio.
- [ ] Alcance energetico versionado y aprobable.
- [ ] Revision energetica conectada a consumos, balances, EnPI y mapa.
- [ ] Usos significativos vinculables a utility, area, equipo, nodo, medidor y EnPI.
- [ ] Objetivos vinculados a EnPI, baseline, target, periodo y accion/proyecto.
- [ ] Acciones/proyectos de Fase 8 visibles desde objetivos, SEUs y riesgos.
- [ ] Evidence Inbox sugiere evidencia desde datos reales del sistema.
- [ ] Auditorias internas usan preguntas originales de VersaEnergy.
- [ ] Revision gerencial produce decisiones, responsables y seguimiento.
- [ ] No conformidades y acciones correctivas tienen verificacion de eficacia.
- [ ] `content_origin` se guarda para evidencia y documentos.
- [ ] RLS activa en todas las tablas nuevas.
- [ ] `npm run build` funciona.

## Plan de implementacion recomendado

### 9a. Base legal, datos y navegacion

- Crear migracion `00011_sgen_iso50001.sql`.
- Crear `sgen-engine`.
- Implementar pantalla principal y selector de sitio/periodo.
- Agregar nota legal y `LegalSettingsView`.
- Crear cobertura inicial del SGEn.

### 9b. Alcance, politica y revision energetica

- Implementar alcance versionado.
- Implementar documentos de politica interna.
- Implementar revision energetica con datos de fases 5, 6 y 7.
- Sugerir hallazgos con fuentes trazables.

### 9c. Usos significativos, riesgos y objetivos

- Implementar matriz de usos significativos.
- Crear scoring configurable.
- Vincular SEUs a EnPI, medidores, nodos y areas.
- Implementar riesgos/oportunidades.
- Vincular objetivos a EnPI, baseline y acciones/proyectos.

### 9d. Evidencia, auditoria y revision gerencial

- Implementar Evidence Inbox.
- Implementar auditorias internas con preguntas propias.
- Implementar hallazgos y no conformidades.
- Implementar revision gerencial y decisiones.

### 9e. Pulido y preparacion para reportes

- Preparar datos para Fase 10.
- Validar que no existan textos ISO copiados.
- Revisar UX en desktop y mobile.
- Ejecutar `npm run build`.

## Prompt sugerido para AI

```txt
Implementa Fase 9 de VersaEnergy: Workspace SGEn alineado con ISO 50001.
Lee AGENTS.md y docs/fase-09.md antes de tocar codigo.

Restriccion prioritaria:
NO copies texto del estandar ISO, ni clausulas, definiciones, notas, tablas o
checklists oficiales. Usa lenguaje original de VersaEnergy. No prometas
certificacion ISO. El producto debe decir "SGEn alineado con ISO 50001",
"preparacion para auditoria" o "cobertura del SGEn".

Objetivo:
Crear un workspace operativo para gestionar alcance energetico, revision
energetica, usos significativos, objetivos, acciones/proyectos, evidencia,
auditorias internas, revision gerencial, no conformidades y mejora continua.

Tareas:
1. Crear migracion 00011_sgen_iso50001.sql con tablas sgen_* y RLS.
2. Crear src/services/sgen-engine/ con:
   - coverage.ts
   - evidenceSuggestions.ts
   - significanceScoring.ts
   - auditReadiness.ts
   - legalGuards.ts
3. Implementar src/modules/iso50001/ como workspace SGEn:
   - Centro SGEn
   - Alcance
   - Revision energetica
   - Usos significativos
   - Objetivos y EnPI
   - Acciones y proyectos
   - Evidencia
   - Auditorias internas
   - Revision gerencial
   - No conformidades
   - Mejora continua
   - Configuracion legal
4. Conectar evidencia a datos reales: mapa, mediciones, balances, EnPI,
   acciones/proyectos y reportes.
5. Usar preguntas de auditoria originales, no checklists copiadas.
6. Guardar content_origin en evidencia y documentos.
7. Mantener UI sobria, operativa y consistente con VersaEnergy.

TODO en Supabase, cero mocks. Debe compilar con npm run build.
```
