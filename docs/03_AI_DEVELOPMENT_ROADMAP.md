# VersaEnergy — Roadmap historico de desarrollo con AI

> No usar este documento como plan de implementacion futuro. Se conserva para
> contexto historico y prompts antiguos. El plan vigente es
> `05_MASTER_IMPROVEMENT_PLAN.md`.

## Estado actual de este documento

Este documento fue el roadmap inicial para construir VersaEnergy con AI. Sigue
siendo util como contexto de producto y secuencia, pero ya no es la fuente
canonica de estado.

Fuente canonica actual:

1. `../AGENTS.md` para reglas de agentes, estado de fases y guardrails.
2. `00_DOCUMENTATION_INDEX.md` para navegar la documentacion vigente.
3. `05_MASTER_IMPROVEMENT_PLAN.md` para el plan futuro de implementacion.
4. `04_CURRENT_STATE_REFERENCE.md` para entender lo ya construido y las brechas.
5. `fase-00.md` a `fase-11.md` como referencia de construccion original.
6. `01_PRODUCT_VISION.md` y `02_TOPOLOGY_ENGINE.md` para vision y semantica.

Importante: algunas secciones antiguas hablan de datos mock/locales y de separar
Supabase en una fase posterior. Eso quedo superado por la ejecucion real: el
proyecto actual es **Supabase-first, cero mocks**. No uses prompts antiguos de
mock sin reconciliarlos con `AGENTS.md` y el `fase-NN.md` correspondiente.

Siguiente checkpoint recomendado: seguir
`05_MASTER_IMPROVEMENT_PLAN.md`. Este roadmap queda como archivo historico y no
debe usarse para decidir la siguiente fase.

## 1. Propósito

Este documento define el orden recomendado para construir VersaEnergy usando AI de desarrollo.

VersaEnergy debe construirse como una app de **Energy & Utilities Management**, no como una app enfocada únicamente en electricidad. Todas las fases deben considerar desde el inicio que el sistema manejará electricidad, gas, vapor, aire comprimido, agua helada, agua caliente, agua industrial, combustibles, refrigeración y otros utilities críticos.

La regla principal es trabajar por fases pequeñas, verificables y con entregables claros. No se debe pedir a la AI que construya toda la app de una vez.

Cada fase debe tener:

- objetivo claro,
- alcance limitado,
- archivos esperados,
- criterios de aceptación,
- build obligatorio,
- resultado visible.

Regla general:

```txt
Una fase = un entregable funcional o documental verificable.
```

---

## 2. Principios para trabajar con AI

1. No construir todo a la vez.
2. Primero definir estructura, luego lógica, luego UI compleja.
3. Todo cálculo importante debe vivir fuera de componentes React.
4. Cada fase debe compilar con `npm run build`.
5. Cada fase debe dejar el repo en estado usable.
6. No integrar VersaMaint hasta que VersaEnergy tenga modelo propio.
7. El Mapa de Energy & Utilities debe construirse antes que el módulo ISO completo.
8. La AI puede recibir requests en lenguaje natural, pero primero debe convertirlos a un brief técnico.
9. Cada prompt debe indicar archivos si se conocen; si no, la AI debe inferirlos desde `AGENTS.md` y `fase-NN.md`.
10. Si una fase crece demasiado, dividirla.
11. Ningún módulo debe asumir que todo es electricidad.
12. Toda entidad de medición debe tener `utilityType` y unidad compatible.
13. Toda conversión entre utilities debe ser explícita y trazable.

---

## 3. Orden recomendado de construcción

```txt
0. Base del repo
1. App Shell y diseño visual
2. Modelo Energy & Utilities mock
3. Supabase y multi-tenant
4. Mapa Energy & Utilities MVP
5. Motor de topología multi-utility y versionado
6. Medición e importación multi-utility
7. Balances y overlays por utility
8. EnPI, baseline y objetivos
9. Acciones y proyectos de mejora
10. Workspace SGEn alineado con ISO 50001
11. Reportes
12. Integración VersaMaint
13. Inteligencia energética y de utilities
14. QA, demo y beta
```

---

## Fase 0 — Base del repo

### Objetivo

Crear una base técnica limpia y compilable para VersaEnergy.

### Tareas

1. Crear proyecto Vite + React + TypeScript.
2. Configurar Tailwind.
3. Instalar dependencias base:
   - `@supabase/supabase-js`,
   - `zustand`,
   - `recharts`,
   - `framer-motion`,
   - `lucide-react`,
   - `@xyflow/react`,
   - `@react-pdf/renderer`.
4. Crear estructura de carpetas:

```txt
src/app
src/shared
src/modules
src/store
src/services
supabase/migrations
docs
```

5. Crear `README.md`.
6. Crear `.env.example`.
7. Crear pantalla inicial simple.

### Entregable

Repo inicial compilable con estructura modular.

### Criterios de aceptación

- `npm install` funciona.
- `npm run build` funciona.
- Existe estructura modular.
- La app muestra pantalla inicial.

### Prompt sugerido

```txt
Crea la base inicial de VersaEnergy con Vite, React, TypeScript y Tailwind.
VersaEnergy será una app de Energy & Utilities Management, no solo electricidad.
Debe incluir estructura modular src/app, src/shared, src/modules, src/store, src/services, supabase/migrations y docs.
Instala Supabase, Zustand, Recharts, Framer Motion, Lucide, @xyflow/react y @react-pdf/renderer.
Crea README, .env.example y una pantalla inicial simple.
No implementes lógica profunda todavía.
El proyecto debe compilar con npm run build.
```

---

## Fase 1 — App Shell y diseño visual

### Objetivo

Crear la carcasa visual de la app, con navegación modular y estilo hermano de VersaMaint.

### Tareas

1. Crear `AppShell`.
2. Crear sidebar colapsable.
3. Crear header con sitio, periodo activo y filtro de utility.
4. Crear `moduleRegistry`.
5. Crear componentes base:
   - `Button`,
   - `Badge`,
   - `Card`,
   - `MetricCard`,
   - `Modal`,
   - `PageHeader`,
   - `EmptyState`.
6. Crear módulos placeholder:
   - Inicio,
   - Mapa Energy & Utilities,
   - Modelo Energy & Utilities,
   - Medición,
   - Balances,
   - Desempeño,
   - Acciones,
   - ISO 50001,
   - Reportes,
   - Administración.
7. Crear store UI con Zustand.

### Entregable

App navegable con estilo visual base.

### Criterios de aceptación

- El sidebar funciona.
- Se puede cambiar de módulo.
- Existe filtro visual por utility.
- Existen módulos placeholder.
- El diseño usa Tailwind y tokens visuales.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el App Shell de VersaEnergy.
Necesito sidebar colapsable, header con sitio, periodo activo y filtro de utility, moduleRegistry y módulos placeholder.
Crea componentes base Button, Badge, Card, MetricCard, Modal, PageHeader y EmptyState.
Usa estilo visual limpio tipo VersaMaint: azul/teal, cards blancas, bordes suaves, tipografía moderna y microinteracciones discretas.
La app debe hablar de Energy & Utilities, no solo electricidad.
No implementes Supabase todavía.
Debe compilar con npm run build.
```

---

## Fase 2 — Modelo Energy & Utilities mock

### Objetivo

Definir las entidades principales de energía y utilities, operándolas con datos mock/locales.

### Tareas

1. Crear tipos TypeScript:
   - `UtilityType`,
   - `UtilityUnit`,
   - `EnergySite`,
   - `EnergyArea`,
   - `UtilitySystem`,
   - `EnergyEquipment`,
   - `EnergySource`,
   - `EnergyMeter`,
   - `EnergyMeterChannel`,
   - `EnergyVariable`.
2. Crear `energyModelSlice`.
3. Crear catálogo de utilities inicial:
   - electricidad,
   - gas,
   - vapor,
   - condensado,
   - aire comprimido,
   - agua helada,
   - agua caliente,
   - agua industrial,
   - combustible,
   - refrigeración.
4. Crear vistas CRUD mock para:
   - áreas,
   - sistemas de utility,
   - equipos,
   - fuentes,
   - medidores,
   - canales.
5. Crear filtros por sitio, área y utility.
6. Permitir vincular equipo con área.
7. Permitir vincular medidor con equipo, área, fuente, sistema de utility o conexión futura.

### Entregable

Modelo Energy & Utilities funcional en frontend con datos mock.

### Criterios de aceptación

- Se pueden crear áreas, sistemas de utility, equipos y medidores.
- Cada equipo pertenece a un sitio/área y puede tener utility principal.
- Cada medidor tiene utility, canal y unidad compatible.
- La UI permite filtrar por sitio, área o utility.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el modelo Energy & Utilities mock de VersaEnergy.
Define tipos TypeScript para UtilityType, UtilityUnit, sitios, áreas, sistemas de utility, equipos, fuentes, medidores, canales y variables.
Incluye utilities iniciales: electricity, natural_gas, lpg, diesel, steam, condensate, compressed_air, chilled_water, hot_water, industrial_water, process_water y refrigeration.
Crea un Zustand slice con datos mock y CRUD local.
Crea una vista Modelo Energy & Utilities con secciones para áreas, sistemas, equipos, fuentes y medidores.
Permite vincular equipos a áreas y medidores a equipos/áreas/fuentes/sistemas.
No conectes Supabase aún.
Debe compilar con npm run build.
```

---

## Fase 3 — Supabase y multi-tenant

### Objetivo

Persistir el modelo Energy & Utilities en Supabase con estructura multi-tenant y RLS inicial.

### Tareas

1. Crear cliente Supabase.
2. Crear migraciones para:
   - `companies`,
   - `profiles`,
   - `sites`,
   - `site_access`,
   - `utility_types`,
   - `utility_units`,
   - `utility_systems`,
   - `energy_areas`,
   - `energy_equipment`,
   - `energy_sources`,
   - `energy_meters`,
   - `energy_meter_channels`.
3. Agregar `company_id`, `site_id` y `utility_type` donde corresponda.
4. Activar RLS.
5. Crear políticas básicas por empresa.
6. Crear repositorios API.
7. Conectar UI del modelo a Supabase.
8. Manejar loading, error y empty states.

### Entregable

Modelo Energy & Utilities persistido en Supabase.

### Criterios de aceptación

- Se puede crear/listar/editar desde Supabase.
- Las tablas tienen RLS.
- Los datos están separados por empresa.
- Los medidores tienen utility y unidad compatible.
- La app maneja errores de conexión.
- `npm run build` funciona.

### Prompt sugerido

```txt
Conecta el modelo Energy & Utilities de VersaEnergy a Supabase.
Crea migraciones para companies, profiles, sites, site_access, utility_types, utility_units, utility_systems, energy_areas, energy_equipment, energy_sources, energy_meters y energy_meter_channels.
Agrega company_id, site_id y utility_type donde corresponda.
Activa RLS y crea políticas básicas por empresa.
Crea servicios/repositories para leer y escribir datos.
Conecta la vista Modelo Energy & Utilities a Supabase con loading, error y empty states.
Debe compilar con npm run build.
```

---

## Fase 4 — Mapa Energy & Utilities MVP

### Objetivo

Crear el primer canvas funcional con nodos, conexiones, paleta e inspector para múltiples utilities.

### Tareas

1. Implementar `@xyflow/react`.
2. Crear `EnergyUtilitiesTopologyCanvas`.
3. Crear `NodePalette` agrupada por utility.
4. Crear nodos iniciales:
   - fuente eléctrica,
   - transformador,
   - tablero,
   - medidor,
   - área,
   - equipo,
   - medidor virtual,
   - compresor,
   - header de aire,
   - caldera,
   - header de vapor,
   - chiller,
   - bomba,
   - tubería/header genérico.
5. Crear conexiones iniciales:
   - `feeds`,
   - `flows_to`,
   - `returns_to`,
   - `measures`,
   - `belongs_to`,
   - `derived_from`.
6. Crear inspector lateral para nodos y conexiones.
7. Permitir drag/drop.
8. Permitir conectar nodos.
9. Permitir guardar y cargar mapa.
10. Mostrar validaciones básicas de compatibilidad por utility.

### Entregable

Canvas básico multi-utility funcional.

### Criterios de aceptación

- Se pueden crear nodos desde paleta.
- Se pueden conectar nodos.
- Cada nodo/conexión tiene utility.
- El inspector edita propiedades.
- Se puede guardar/cargar el mapa.
- Hay validaciones básicas visibles.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el Mapa Energy & Utilities MVP usando @xyflow/react.
Crea EnergyUtilitiesTopologyCanvas, NodePalette, nodos custom para fuente eléctrica, transformador, tablero, medidor, área, equipo, medidor virtual, compresor, header de aire, caldera, header de vapor, chiller, bomba y tubería/header genérico.
Crea edges para feeds, flows_to, returns_to, measures, belongs_to y derived_from.
Cada nodo y edge debe tener utilityType.
Agrega inspector lateral para editar propiedades del nodo o conexión seleccionada.
Permite guardar/cargar el mapa en estado local o Supabase si ya existe capa de datos.
Agrega validaciones básicas de compatibilidad por utility.
Debe compilar con npm run build.
```

---

## Fase 5 — Motor de topología multi-utility y versionado

### Objetivo

Convertir el canvas en un grafo lógico, validable y versionado para múltiples utilities.

### Tareas

1. Crear `graphTypes.ts`.
2. Crear `utilityRules.ts`.
3. Crear `unitConversion.ts`.
4. Crear `validators.ts`.
5. Crear `compiler.ts`.
6. Crear `graphQueries.ts`.
7. Crear `topologyVersioning.ts`.
8. Crear tablas:
   - `energy_diagrams`,
   - `energy_diagram_versions`,
   - `energy_nodes`,
   - `energy_edges`,
   - `energy_topology_validation_issues`.
9. Compilar canvas a grafo multi-utility.
10. Publicar versión.
11. Congelar versiones publicadas.
12. Clonar versión para editar.

### Entregable

Topología multi-utility versionada y calculable.

### Criterios de aceptación

- El canvas se compila a grafo.
- Se detectan conexiones inválidas entre utilities incompatibles.
- Una versión publicada no se edita.
- Se puede clonar una versión.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el motor de topología multi-utility de VersaEnergy separado de React.
Crea graphTypes, utilityRules, unitConversion, validators, compiler, graphQueries y topologyVersioning.
El compiler debe convertir nodes/edges/meters/channels/utilities en un utilityGraph con measurementScopes, balanceTrees, validationIssues, calculationPlan y utilityCompatibilityMap.
Agrega tablas para diagrams, diagram_versions, nodes, edges y validation_issues.
Permite publicar una versión, congelarla y clonar una versión publicada como draft.
Debe compilar con npm run build.
```

---

## Fase 6 — Medición e importación multi-utility

### Objetivo

Gestionar lecturas reales o importadas para electricidad y utilities.

### Tareas

1. Crear tablas:
   - `energy_readings_raw`,
   - `energy_readings_validated`,
   - `energy_import_batches`,
   - `energy_data_quality_issues`.
2. Crear captura manual.
3. Crear importador CSV.
4. Mapear columnas a canales.
5. Validar unidad contra utility.
6. Validar datos faltantes.
7. Validar duplicados.
8. Validar negativos o valores sospechosos.
9. Mostrar calidad por medidor.
10. Mostrar última lectura en inspector del canvas.

### Entregable

Medición multi-utility funcional con CSV y calidad de datos básica.

### Criterios de aceptación

- Se importa CSV.
- Se ven lecturas por medidor y utility.
- Se detectan errores básicos.
- Se muestra calidad de datos.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de medición multi-utility de VersaEnergy.
Crea tablas para readings_raw, readings_validated, import_batches y data_quality_issues.
Agrega captura manual e importación CSV.
Permite mapear columnas del CSV a canales de medidor.
Valida unidad contra utilityType, faltantes, duplicados, negativos y valores sospechosos.
Muestra calidad de datos por medidor y última lectura en el inspector del mapa.
Debe compilar con npm run build.
```

---

## Fase 7 — Balances y overlays por utility

### Objetivo

Calcular balances de electricidad y utilities desde topología + medición, mostrándolos sobre el mapa.

### Tareas

1. Crear `balanceEngine.ts`.
2. Crear tablas:
   - `energy_balance_rules`,
   - `energy_balance_runs`,
   - `energy_balance_results`.
3. Calcular por utility:
   - entrada total,
   - consumo medido,
   - consumo calculado,
   - consumo estimado,
   - pérdidas,
   - fugas,
   - retornos,
   - no explicado,
   - cobertura de medición.
4. Crear vista de balances.
5. Crear overlays sobre el canvas:
   - consumo,
   - demanda,
   - caudal,
   - presión,
   - temperatura,
   - costo,
   - calidad,
   - desviación.
6. Permitir crear acción desde desviación.

### Entregable

Balance visual multi-utility.

### Criterios de aceptación

- Se selecciona periodo y utility.
- Se calcula balance padre-hijos.
- El mapa colorea nodos por consumo/desviación/fuga/pérdida.
- Una desviación puede crear acción.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa balances multi-utility para VersaEnergy.
Crea balanceEngine separado de React y tablas para balance_rules, balance_runs y balance_results.
Calcula por utility: entrada total, consumo medido, calculado, estimado, pérdidas, fugas, retornos, no explicado y cobertura de medición.
Crea vista de balances y overlays sobre el mapa para consumo, demanda, caudal, presión, temperatura, costo, calidad y desviación.
Permite crear una acción desde una desviación.
Debe compilar con npm run build.
```

---

## Fase 8 — EnPI, baseline y objetivos

### Objetivo

Medir desempeño energético y de utilities.

### Tareas

1. Crear tablas:
   - `energy_enpis`,
   - `energy_baselines`,
   - `energy_baseline_versions`,
   - `energy_targets`,
   - `energy_performance_results`.
2. Crear builder de EnPI.
3. Soportar EnPI por utility:
   - kWh/ton,
   - Nm3 aire/unidad,
   - kg vapor/ton,
   - m3 agua/lote,
   - TR-h/m2,
   - GJ/unidad.
4. Crear baseline por periodo fijo.
5. Comparar real vs baseline.
6. Crear metas de reducción.
7. Mostrar tendencias con Recharts.
8. Vincular EnPI a sitio, área, equipo, proceso o utility system.

### Entregable

Módulo de desempeño energético y utilities.

### Criterios de aceptación

- Se crea EnPI.
- Se define baseline.
- Se ve real vs baseline.
- Se ve avance contra objetivo.
- Los EnPI soportan múltiples utilities.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de desempeño Energy & Utilities.
Crea tablas para EnPI, baselines, baseline_versions, targets y performance_results.
Crea un builder de EnPI con numerador, denominador, unidad, utilityType, alcance y frecuencia.
Debe soportar ejemplos como kWh/ton, Nm3 aire/unidad, kg vapor/ton, m3 agua/lote, TR-h/m2 y GJ/unidad.
Implementa baseline por periodo fijo y comparación real vs baseline.
Muestra tendencias con Recharts y permite vincular EnPI a sitio, área, equipo, proceso o sistema de utility.
Debe compilar con npm run build.
```

---

## Fase 9 — Acciones y proyectos de mejora

> Nota de consistencia: en el plan vigente esta capacidad vive en
> `fase-08.md`. Este roadmap es historico y conserva numeracion antigua.

### Objetivo

Convertir hallazgos energéticos y de utilities en trabajo gestionable. Las
iniciativas simples se tratan como acciones rápidas; las iniciativas complejas
se tratan como proyectos de mejora con fases, tareas, recursos, presupuesto,
baseline, Gantt ligero, evidencia y cierre.

### Tareas

1. Crear tablas:
   - `energy_action_plans`,
   - `energy_savings_projects`,
   - `energy_action_evidence`,
   - `energy_action_comments`.
2. Crear estados:
   - idea,
   - analysis,
   - approved,
   - in_progress,
   - verified,
   - closed,
   - cancelled.
3. Crear vista Kanban.
4. Crear vista tabla.
5. Crear formulario de acción.
6. Vincular acción a medidor, área, equipo, balance, EnPI, utility e ISO.
7. Capturar ahorro esperado, inversión, retorno y ahorro real.
8. Adjuntar evidencia.

### Entregable

Sistema de acciones rápidas y proyectos de mejora para energía y utilities.

### Criterios de aceptación

- Se crea acción desde desviación.
- Se asigna responsable.
- Se cambia estado.
- Se adjunta evidencia.
- Se compara ahorro esperado vs real.
- La acción identifica utility afectada.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de acciones y proyectos de mejora de VersaEnergy.
Crea tablas para action_plans, savings_projects, action_evidence y action_comments.
Crea estados idea, analysis, approved, in_progress, verified, closed y cancelled.
Agrega vista Kanban, vista tabla y formulario de acción.
Permite vincular acciones a medidor, área, equipo, balance, EnPI, utility e ISO.
Captura ahorro esperado, inversión, retorno y ahorro real.
Debe compilar con npm run build.
```

---

## Fase 10 — Workspace SGEn alineado con ISO 50001

### Objetivo

Crear un workspace para operar, documentar y auditar un Sistema de Gestion de la
Energia (SGEn) alineado con ISO 50001, apoyado por datos de energia y utilities.
No debe copiar texto propietario del estandar ni presentarse como sustituto de
la norma oficial.

### Tareas

1. Crear secciones:
   - alcance,
   - política,
   - revisión energética,
   - usos significativos de energía,
   - riesgos y oportunidades,
   - objetivos,
   - planes vinculados a acciones/proyectos,
   - evidencias,
   - auditorías,
   - revisión gerencial,
   - no conformidades.
2. Crear tablas correspondientes.
3. Relacionar evidencias con datos, mapas, utilities, EnPI y acciones.
4. Incluir campos de acción climática.
5. Crear tablero de cobertura del SGEn.
6. Incluir guardrails legales: sin texto ISO copiado, sin logo ISO, sin promesa
   de certificación, con origen de contenido en evidencias y documentos.

### Entregable

Workspace SGEn operativo y alineado con ISO 50001.

### Criterios de aceptación

- Se define alcance.
- Se registran usos significativos por utility, área, equipo o proceso.
- Se crean objetivos.
- Se adjuntan evidencias.
- Se registra auditoría o revisión.
- No hay texto, tablas, definiciones ni checklists copiados del estándar.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el Workspace SGEn alineado con ISO 50001 de VersaEnergy.
No copies texto del estándar; usa lenguaje original de VersaEnergy.
Crea secciones para alcance, política propia, revisión energética, usos significativos, riesgos, objetivos, planes vinculados a acciones/proyectos, evidencias, auditorías, revisión gerencial y no conformidades.
Relaciona evidencias con mapas, utilities, datos, EnPI y acciones.
Incluye campos para riesgos y oportunidades de acción climática.
No prometas certificación ISO ni uses checklists oficiales copiadas.
Debe compilar con npm run build.
```

---

## Fase 11 — Reportes

### Objetivo

Generar salidas profesionales para gestión y auditoría.

### Tareas

1. Crear servicio de reportes.
2. Crear PDF mensual.
3. Crear PDF de balance por utility.
4. Crear PDF de EnPI.
5. Crear PDF de cobertura SGEn.
6. Exportar CSV de lecturas.
7. Exportar CSV de balances.
8. Guardar historial de reportes.

### Entregable

Reportes PDF/CSV.

### Criterios de aceptación

- Se genera PDF con periodo, alcance, utility, fuente y usuario.
- Se exporta CSV.
- Los datos estimados se identifican.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa reportes para VersaEnergy.
Crea servicio de reportes y plantillas PDF para reporte mensual, balance por utility, EnPI e ISO.
Agrega exportación CSV para lecturas y balances.
Cada reporte debe mostrar periodo, alcance, utility, fuente de datos, usuario y marcar datos estimados.
Debe compilar con npm run build.
```

---

## Fase 12 — Integración VersaMaint

### Objetivo

Conectar energía y utilities con mantenimiento sin acoplar productos.

### Tareas

1. Crear tablas:
   - `energy_cmms_links`,
   - `energy_external_systems`,
   - `energy_webhook_events`.
2. Crear configuración de sistema externo.
3. Mapear equipo energético o utility asset con activo CMMS.
4. Mapear acción con solicitud u OT externa.
5. Registrar eventos de integración.
6. Mostrar historial de vínculos.

### Entregable

Capa inicial de integración con VersaMaint.

### Criterios de aceptación

- Un equipo o componente de utility puede vincularse a un activo externo.
- Una acción puede guardar referencia a solicitud u OT externa.
- La app funciona aunque la integración no esté configurada.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa una capa inicial de integración VersaMaint para VersaEnergy.
No acoples directamente las bases. Usa IDs externos.
Crea tablas para cmms_links, external_systems y webhook_events.
Permite vincular equipo energético o componente de utility con activo externo y acción energética con solicitud u OT externa.
La app debe funcionar aunque la integración no esté configurada.
Debe compilar con npm run build.
```

---

## Fase 13 — Inteligencia energética y de utilities

### Objetivo

Agregar insights y asistente explicable para energía y utilities.

### Tareas

1. Crear reglas de anomalía:
   - consumo fuera de horario,
   - demanda anormal,
   - factor de potencia bajo,
   - datos faltantes,
   - pérdida no explicada,
   - fuga de aire comprimido,
   - pérdida de vapor,
   - retorno deficiente de condensado,
   - bajo delta T en agua helada,
   - desviación contra baseline.
2. Crear panel de insights.
3. Explicar cada insight con datos fuente.
4. Convertir insight en acción.
5. Crear asistente que responda solo con datos disponibles.

### Entregable

Insights accionables para energía y utilities.

### Criterios de aceptación

- El sistema detecta anomalías básicas.
- Cada insight tiene explicación.
- Un insight puede convertirse en acción.
- El asistente no inventa datos.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa inteligencia energética y de utilities inicial para VersaEnergy.
Crea reglas determinísticas para consumo fuera de horario, demanda anormal, factor de potencia bajo, datos faltantes, pérdida no explicada, fuga de aire comprimido, pérdida de vapor, retorno deficiente de condensado, bajo delta T en agua helada y desviación contra baseline.
Crea panel de insights con explicación y datos fuente.
Permite convertir un insight en acción.
Si agregas asistente, debe responder solo con datos disponibles y no inventar.
Debe compilar con npm run build.
```

---

## Fase 14 — QA, demo y beta

### Objetivo

Preparar una beta demostrable de punta a punta.

### Tareas

1. Crear dataset demo completo con varias utilities.
2. Probar flujo:

```txt
sitio -> utility -> mapa -> medidor -> lectura -> balance -> EnPI -> acción -> evidencia -> reporte
```

3. Revisar responsive.
4. Revisar estados vacíos.
5. Revisar errores.
6. Probar RLS.
7. Agregar pruebas del motor de topología.
8. Agregar pruebas del motor de balances.
9. Crear guía de demo.

### Entregable

Beta estable con demo end-to-end.

### Criterios de aceptación

- La demo se ejecuta completa.
- La demo incluye electricidad, aire comprimido, vapor o agua helada.
- No hay errores críticos.
- Los motores tienen pruebas básicas.
- Existe guía de demo.
- `npm run build` funciona.

### Prompt sugerido

```txt
Prepara VersaEnergy para una beta demo.
Crea dataset demo completo con electricidad, aire comprimido, vapor y agua helada.
Prueba el flujo sitio -> utility -> mapa -> medidor -> lectura -> balance -> EnPI -> acción -> evidencia -> reporte.
Revisa responsive, estados vacíos, errores y RLS.
Agrega pruebas básicas para topology-engine y balanceEngine.
Crea una guía de demo.
Debe compilar con npm run build.
```

---

## 4. MVP recomendado

El primer MVP debe enfocarse en lo diferencial.

Orden mínimo:

```txt
1. App Shell
2. Modelo Energy & Utilities
3. Mapa Energy & Utilities MVP
4. Medición CSV/manual
5. Balance visual por utility
6. EnPI simple
7. Acción de ahorro
8. Reporte básico
```

Demo ideal del MVP:

1. Crear una planta.
2. Crear área y equipo.
3. Crear utilities: electricidad, aire comprimido y vapor.
4. Crear medidores.
5. Dibujar fuente -> distribución -> medidor -> equipo/proceso.
6. Importar lecturas.
7. Ver consumo sobre el mapa.
8. Detectar consumo no explicado, fuga o pérdida.
9. Crear acción de ahorro.
10. Ver EnPI.
11. Generar reporte.

Frase guía:

```txt
VersaEnergy no solo reporta electricidad; entiende cómo fluyen, se miden y se optimizan todos los utilities críticos de la operación.
```
