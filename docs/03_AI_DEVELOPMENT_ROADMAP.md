# VersaEnergy — Parte 3: Roadmap de desarrollo con AI

## 1. Propósito

Este documento define el orden recomendado para construir VersaEnergy usando AI de desarrollo.

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
7. El Mapa Energético debe construirse antes que el módulo ISO completo.
8. La AI debe recibir instrucciones concretas, no ambiguas.
9. Cada prompt debe indicar qué archivos tocar y qué no tocar.
10. Si una fase crece demasiado, dividirla.

---

## 3. Orden recomendado de construcción

```txt
0. Base del repo
1. App Shell y diseño visual
2. Modelo energético mock
3. Supabase y multi-tenant
4. Mapa Energético MVP
5. Motor de topología y versionado
6. Medición e importación
7. Balances y overlays
8. EnPI, baseline y objetivos
9. Acciones de ahorro
10. Workspace ISO 50001
11. Reportes
12. Integración VersaMaint
13. Inteligencia energética
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
3. Crear header con sitio y periodo activo.
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
   - Mapa Energético,
   - Modelo Energético,
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
- Existen módulos placeholder.
- El diseño usa Tailwind y tokens visuales.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el App Shell de VersaEnergy.
Necesito sidebar colapsable, header con sitio y periodo activo, moduleRegistry y módulos placeholder.
Crea componentes base Button, Badge, Card, MetricCard, Modal, PageHeader y EmptyState.
Usa estilo visual limpio tipo VersaMaint: azul/teal, cards blancas, bordes suaves, tipografía moderna y microinteracciones discretas.
No implementes Supabase todavía.
Debe compilar con npm run build.
```

---

## Fase 2 — Modelo energético mock

### Objetivo

Definir las entidades principales de energía y operarlas con datos mock/locales.

### Tareas

1. Crear tipos TypeScript:
   - `EnergySite`,
   - `EnergyArea`,
   - `EnergyEquipment`,
   - `EnergySource`,
   - `EnergyMeter`,
   - `EnergyMeterChannel`,
   - `EnergyVariable`.
2. Crear `energyModelSlice`.
3. Crear vistas CRUD mock para:
   - áreas,
   - equipos,
   - fuentes,
   - medidores,
   - canales.
4. Crear filtros por sitio y área.
5. Permitir vincular equipo con área.
6. Permitir vincular medidor con equipo, área o fuente.

### Entregable

Modelo energético funcional en frontend con datos mock.

### Criterios de aceptación

- Se pueden crear áreas, equipos y medidores.
- Cada equipo pertenece a un sitio/área.
- Cada medidor tiene canal y unidad.
- La UI permite filtrar por sitio o área.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el modelo energético mock de VersaEnergy.
Define tipos TypeScript para sitios, áreas, equipos, fuentes, medidores, canales y variables.
Crea un Zustand slice con datos mock y CRUD local.
Crea una vista Modelo Energético con tabs o secciones para áreas, equipos, fuentes y medidores.
Permite vincular equipos a áreas y medidores a equipos/áreas/fuentes.
No conectes Supabase aún.
Debe compilar con npm run build.
```

---

## Fase 3 — Supabase y multi-tenant

### Objetivo

Persistir el modelo energético en Supabase con estructura multi-tenant y RLS inicial.

### Tareas

1. Crear cliente Supabase.
2. Crear migraciones para:
   - `companies`,
   - `profiles`,
   - `sites`,
   - `site_access`,
   - `energy_areas`,
   - `energy_equipment`,
   - `energy_sources`,
   - `energy_meters`,
   - `energy_meter_channels`.
3. Agregar `company_id` y `site_id`.
4. Activar RLS.
5. Crear políticas básicas por empresa.
6. Crear repositorios API.
7. Conectar UI del modelo energético a Supabase.
8. Manejar loading, error y empty states.

### Entregable

Modelo energético persistido en Supabase.

### Criterios de aceptación

- Se puede crear/listar/editar desde Supabase.
- Las tablas tienen RLS.
- Los datos están separados por empresa.
- La app maneja errores de conexión.
- `npm run build` funciona.

### Prompt sugerido

```txt
Conecta el modelo energético de VersaEnergy a Supabase.
Crea migraciones para companies, profiles, sites, site_access, energy_areas, energy_equipment, energy_sources, energy_meters y energy_meter_channels.
Agrega company_id y site_id donde corresponda.
Activa RLS y crea políticas básicas por empresa.
Crea servicios/repositories para leer y escribir datos.
Conecta la vista de Modelo Energético a Supabase con loading, error y empty states.
Debe compilar con npm run build.
```

---

## Fase 4 — Mapa Energético MVP

### Objetivo

Crear el primer canvas funcional con nodos, conexiones, paleta e inspector.

### Tareas

1. Implementar `@xyflow/react`.
2. Crear `EnergyTopologyCanvas`.
3. Crear `NodePalette`.
4. Crear nodos iniciales:
   - fuente,
   - transformador,
   - tablero,
   - medidor,
   - área,
   - equipo,
   - medidor virtual.
5. Crear conexiones iniciales:
   - `feeds`,
   - `measures`,
   - `belongs_to`,
   - `derived_from`.
6. Crear inspector lateral para nodos y conexiones.
7. Permitir drag/drop.
8. Permitir conectar nodos.
9. Permitir guardar y cargar diagrama.
10. Mostrar validaciones básicas.

### Entregable

Canvas básico funcional.

### Criterios de aceptación

- Se pueden crear nodos desde paleta.
- Se pueden conectar nodos.
- El inspector edita propiedades.
- Se puede guardar/cargar el diagrama.
- Hay validaciones básicas visibles.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el Mapa Energético MVP usando @xyflow/react.
Crea EnergyTopologyCanvas, NodePalette, nodos custom para fuente, transformador, tablero, medidor, área, equipo y medidor virtual.
Crea edges para feeds, measures, belongs_to y derived_from.
Agrega inspector lateral para editar propiedades del nodo o conexión seleccionada.
Permite guardar/cargar el diagrama en estado local o Supabase si ya existe capa de datos.
Agrega validaciones básicas visibles.
Debe compilar con npm run build.
```

---

## Fase 5 — Motor de topología y versionado

### Objetivo

Convertir el canvas en un grafo lógico, validable y versionado.

### Tareas

1. Crear `graphTypes.ts`.
2. Crear `validators.ts`.
3. Crear `compiler.ts`.
4. Crear `graphQueries.ts`.
5. Crear `topologyVersioning.ts`.
6. Crear tablas:
   - `energy_diagrams`,
   - `energy_diagram_versions`,
   - `energy_nodes`,
   - `energy_edges`,
   - `energy_topology_validation_issues`.
7. Compilar canvas a grafo.
8. Publicar versión.
9. Congelar versiones publicadas.
10. Clonar versión para editar.

### Entregable

Topología versionada y calculable.

### Criterios de aceptación

- El canvas se compila a grafo.
- Se detectan conexiones inválidas.
- Una versión publicada no se edita.
- Se puede clonar una versión.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el motor de topología de VersaEnergy separado de React.
Crea graphTypes, validators, compiler, graphQueries y topologyVersioning.
El compiler debe convertir nodes/edges/meters/channels en un energyGraph con measurementScopes, balanceTrees, validationIssues y calculationPlan.
Agrega tablas para diagrams, diagram_versions, nodes, edges y validation_issues.
Permite publicar una versión, congelarla y clonar una versión publicada como draft.
Debe compilar con npm run build.
```

---

## Fase 6 — Medición e importación

### Objetivo

Gestionar lecturas reales o importadas.

### Tareas

1. Crear tablas:
   - `energy_readings_raw`,
   - `energy_readings_validated`,
   - `energy_import_batches`,
   - `energy_data_quality_issues`.
2. Crear captura manual.
3. Crear importador CSV.
4. Mapear columnas a canales.
5. Validar datos faltantes.
6. Validar duplicados.
7. Validar negativos o valores sospechosos.
8. Mostrar calidad por medidor.
9. Mostrar última lectura en inspector del canvas.

### Entregable

Medición funcional con CSV y calidad de datos básica.

### Criterios de aceptación

- Se importa CSV.
- Se ven lecturas por medidor.
- Se detectan errores básicos.
- Se muestra calidad de datos.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de medición de VersaEnergy.
Crea tablas para readings_raw, readings_validated, import_batches y data_quality_issues.
Agrega captura manual e importación CSV.
Permite mapear columnas del CSV a canales de medidor.
Valida faltantes, duplicados, negativos y valores sospechosos.
Muestra calidad de datos por medidor y última lectura en el inspector del mapa.
Debe compilar con npm run build.
```

---

## Fase 7 — Balances y overlays

### Objetivo

Calcular balances energéticos desde topología + medición y mostrarlos sobre el mapa.

### Tareas

1. Crear `balanceEngine.ts`.
2. Crear tablas:
   - `energy_balance_rules`,
   - `energy_balance_runs`,
   - `energy_balance_results`.
3. Calcular:
   - entrada total,
   - consumo medido,
   - consumo calculado,
   - consumo estimado,
   - pérdidas,
   - no explicado,
   - cobertura de medición.
4. Crear vista de balances.
5. Crear overlays sobre el canvas:
   - kWh,
   - kW,
   - costo,
   - calidad,
   - desviación.
6. Permitir crear acción desde desviación.

### Entregable

Balance energético visual.

### Criterios de aceptación

- Se selecciona periodo.
- Se calcula balance padre-hijos.
- El mapa colorea nodos por consumo/desviación.
- Una desviación puede crear acción.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa balances energéticos para VersaEnergy.
Crea balanceEngine separado de React y tablas para balance_rules, balance_runs y balance_results.
Calcula entrada total, consumo medido, calculado, estimado, pérdidas, no explicado y cobertura de medición.
Crea vista de balances y overlays sobre el mapa para kWh, kW, costo, calidad y desviación.
Permite crear una acción desde una desviación.
Debe compilar con npm run build.
```

---

## Fase 8 — EnPI, baseline y objetivos

### Objetivo

Medir desempeño energético.

### Tareas

1. Crear tablas:
   - `energy_enpis`,
   - `energy_baselines`,
   - `energy_baseline_versions`,
   - `energy_targets`,
   - `energy_performance_results`.
2. Crear builder de EnPI.
3. Crear baseline por periodo fijo.
4. Comparar real vs baseline.
5. Crear metas de reducción.
6. Mostrar tendencias con Recharts.
7. Vincular EnPI a sitio, área, equipo o proceso.

### Entregable

Módulo de desempeño energético.

### Criterios de aceptación

- Se crea EnPI.
- Se define baseline.
- Se ve real vs baseline.
- Se ve avance contra objetivo.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de desempeño energético.
Crea tablas para EnPI, baselines, baseline_versions, targets y performance_results.
Crea un builder de EnPI con numerador, denominador, unidad, alcance y frecuencia.
Implementa baseline por periodo fijo y comparación real vs baseline.
Muestra tendencias con Recharts y permite vincular EnPI a sitio, área, equipo o proceso.
Debe compilar con npm run build.
```

---

## Fase 9 — Acciones de ahorro

### Objetivo

Convertir hallazgos energéticos en trabajo gestionable.

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
6. Vincular acción a medidor, área, equipo, balance, EnPI e ISO.
7. Capturar ahorro esperado, inversión, retorno y ahorro real.
8. Adjuntar evidencia.

### Entregable

Sistema de acciones energéticas.

### Criterios de aceptación

- Se crea acción desde desviación.
- Se asigna responsable.
- Se cambia estado.
- Se adjunta evidencia.
- Se compara ahorro esperado vs real.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el módulo de acciones de ahorro de VersaEnergy.
Crea tablas para action_plans, savings_projects, action_evidence y action_comments.
Crea estados idea, analysis, approved, in_progress, verified, closed y cancelled.
Agrega vista Kanban, vista tabla y formulario de acción.
Permite vincular acciones a medidor, área, equipo, balance, EnPI e ISO.
Captura ahorro esperado, inversión, retorno y ahorro real.
Debe compilar con npm run build.
```

---

## Fase 10 — Workspace ISO 50001

### Objetivo

Crear el sistema de gestión energética dentro de la app.

### Tareas

1. Crear secciones:
   - alcance,
   - política,
   - revisión energética,
   - SEUs,
   - riesgos y oportunidades,
   - objetivos,
   - planes,
   - evidencias,
   - auditorías,
   - revisión gerencial,
   - no conformidades.
2. Crear tablas correspondientes.
3. Relacionar evidencias con datos, diagramas, EnPI y acciones.
4. Incluir campos de acción climática.
5. Crear tablero de cobertura ISO.

### Entregable

Workspace ISO 50001 operativo.

### Criterios de aceptación

- Se define alcance.
- Se registran SEUs.
- Se crean objetivos.
- Se adjuntan evidencias.
- Se registra auditoría o revisión.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa el Workspace ISO 50001 de VersaEnergy.
No copies texto del estándar; traduce ISO a flujos prácticos.
Crea secciones para alcance, política, revisión energética, SEUs, riesgos, objetivos, planes, evidencias, auditorías, revisión gerencial y no conformidades.
Relaciona evidencias con diagramas, datos, EnPI y acciones.
Incluye campos para riesgos y oportunidades de acción climática.
Debe compilar con npm run build.
```

---

## Fase 11 — Reportes

### Objetivo

Generar salidas profesionales para gestión y auditoría.

### Tareas

1. Crear servicio de reportes.
2. Crear PDF mensual.
3. Crear PDF de balance.
4. Crear PDF de EnPI.
5. Crear PDF ISO.
6. Exportar CSV de lecturas.
7. Exportar CSV de balances.
8. Guardar historial de reportes.

### Entregable

Reportes PDF/CSV.

### Criterios de aceptación

- Se genera PDF con periodo, alcance, fuente y usuario.
- Se exporta CSV.
- Los datos estimados se identifican.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa reportes para VersaEnergy.
Crea servicio de reportes y plantillas PDF para reporte mensual, balance, EnPI e ISO.
Agrega exportación CSV para lecturas y balances.
Cada reporte debe mostrar periodo, alcance, fuente de datos, usuario y marcar datos estimados.
Debe compilar con npm run build.
```

---

## Fase 12 — Integración VersaMaint

### Objetivo

Conectar energía con mantenimiento sin acoplar productos.

### Tareas

1. Crear tablas:
   - `energy_cmms_links`,
   - `energy_external_systems`,
   - `energy_webhook_events`.
2. Crear configuración de sistema externo.
3. Mapear equipo energético con activo CMMS.
4. Mapear acción con solicitud u OT externa.
5. Registrar eventos de integración.
6. Mostrar historial de vínculos.

### Entregable

Capa inicial de integración con VersaMaint.

### Criterios de aceptación

- Un equipo energético puede vincularse a un activo externo.
- Una acción puede guardar referencia a solicitud u OT externa.
- La app funciona aunque la integración no esté configurada.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa una capa inicial de integración VersaMaint para VersaEnergy.
No acoples directamente las bases. Usa IDs externos.
Crea tablas para cmms_links, external_systems y webhook_events.
Permite vincular equipo energético con activo externo y acción energética con solicitud u OT externa.
La app debe funcionar aunque la integración no esté configurada.
Debe compilar con npm run build.
```

---

## Fase 13 — Inteligencia energética

### Objetivo

Agregar insights y asistente energético explicable.

### Tareas

1. Crear reglas de anomalía:
   - consumo fuera de horario,
   - demanda anormal,
   - factor de potencia bajo,
   - datos faltantes,
   - pérdida no explicada,
   - desviación contra baseline.
2. Crear panel de insights.
3. Explicar cada insight con datos fuente.
4. Convertir insight en acción.
5. Crear asistente que responda solo con datos disponibles.

### Entregable

Insights energéticos accionables.

### Criterios de aceptación

- El sistema detecta anomalías básicas.
- Cada insight tiene explicación.
- Un insight puede convertirse en acción.
- El asistente no inventa datos.
- `npm run build` funciona.

### Prompt sugerido

```txt
Implementa inteligencia energética inicial para VersaEnergy.
Crea reglas determinísticas para consumo fuera de horario, demanda anormal, factor de potencia bajo, datos faltantes, pérdida no explicada y desviación contra baseline.
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

1. Crear dataset demo completo.
2. Probar flujo:

```txt
sitio -> mapa -> medidor -> lectura -> balance -> EnPI -> acción -> evidencia -> reporte
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
- No hay errores críticos.
- Los motores tienen pruebas básicas.
- Existe guía de demo.
- `npm run build` funciona.

### Prompt sugerido

```txt
Prepara VersaEnergy para una beta demo.
Crea dataset demo completo y prueba el flujo sitio -> mapa -> medidor -> lectura -> balance -> EnPI -> acción -> evidencia -> reporte.
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
2. Modelo energético
3. Mapa Energético MVP
4. Medición CSV/manual
5. Balance visual
6. EnPI simple
7. Acción de ahorro
8. Reporte básico
```

Demo ideal del MVP:

1. Crear una planta.
2. Crear área y equipo.
3. Crear medidor.
4. Dibujar fuente -> transformador -> tablero -> medidor -> equipo.
5. Importar lecturas.
6. Ver consumo sobre el mapa.
7. Detectar consumo no explicado.
8. Crear acción de ahorro.
9. Ver EnPI.
10. Generar reporte.

Frase guía:

```txt
VersaEnergy no solo reporta energía; entiende cómo fluye, cómo se mide y cómo se mejora.
```
