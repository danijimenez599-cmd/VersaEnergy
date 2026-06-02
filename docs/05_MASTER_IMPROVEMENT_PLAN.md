# VersaEnergy — Plan maestro de mejora

## Proposito

Este es el plan vigente para llevar VersaEnergy desde una base tecnica funcional
hacia un producto operacional claro, serio desde la ingenieria energetica y
amigable desde UI.

La premisa es que el backend ya tiene buena base. El trabajo futuro debe ser
incremental, por fases cortas, evitando reescrituras grandes.

## Vision del producto maduro

VersaEnergy debe guiar este flujo:

```txt
Modelo -> Mapa -> Medicion -> Calidad -> Balance -> EnPI ->
Oportunidad -> Accion/Proyecto -> Verificacion -> SGEn -> Reporte
```

Cada pantalla debe responder:

- que existe;
- que falta;
- que esta mal;
- que decision sigue;
- que evidencia queda.

## Principios del plan

1. Backend-first, pero UI-operable.
2. No exponer JSON al usuario normal.
3. Cada modulo debe tener flujo, no solo CRUD.
4. Todo calculo relevante vive en `src/services/`.
5. Cada dato energetico debe declarar utility, unidad, periodo y fuente.
6. Distinguir siempre medido, estimado, calculado y faltante.
7. Toda desviacion importante debe poder crear una oportunidad.
8. Toda oportunidad debe poder cerrarse con evidencia.
9. SGEn usa lenguaje original y no copia texto ISO.
10. Cada fase debe compilar con `npm run build`.

## Inspiracion de producto

Usar como inspiracion, no como copia:

- EnergyCAP: utility data, validacion, auditoria, M&V y reporting.
- ENERGY STAR Portfolio Manager: benchmarking, portafolio y baselines.
- IBM Envizi: captura/validacion, forecasting, emisiones y reporting.
- Schneider Resource Advisor: diagnostico, priorizacion y proyectos.
- SkySpark: analitica operacional, KPIs y deteccion de fallas.
- IBM Maximo / VersaMaint: activos, work orders, historial y trazabilidad.
- VersaProject / Microsoft Project: Gantt, baseline, recursos y valor ganado.

## Fases maestras

### MP-00 — Reorden documental y reglas de trabajo

Objetivo:

Dejar la documentacion lista para trabajar sin confusiones.

Logica de negocio:

- separar referencia historica de plan futuro;
- documentar que la base actual funciona como cimiento;
- impedir que AI vuelva a usar planes mock o desactualizados.

UI:

- no aplica UI de producto.

Archivos:

- `docs/00_DOCUMENTATION_INDEX.md`
- `docs/04_CURRENT_STATE_REFERENCE.md`
- `docs/05_MASTER_IMPROVEMENT_PLAN.md`
- `README.md`
- `AGENTS.md`

Criterios de aceptacion:

- [x] existe indice documental;
- [x] existe referencia del estado actual;
- [x] existe plan maestro futuro;
- [x] README apunta al plan maestro;
- [x] AGENTS define el plan maestro como fuente futura.

### MP-01 — Contexto global y shell operacional

Objetivo:

Crear un contexto global consistente para sitio, utility, periodo y estado de
trabajo.

Logica de negocio:

- el usuario siempre debe saber en que sitio trabaja;
- todos los modulos deben usar el mismo periodo energetico;
- los modulos deben heredar filtro de utility cuando aplique;
- el cockpit debe indicar si falta modelo, mapa, medidores o datos.

Ingenieria energetica:

- periodo energetico por defecto: mes actual;
- utility puede ser `all` o una utility especifica;
- las consultas deben respetar sitio + periodo + utility;
- el sistema debe preparar comparacion periodo actual vs anterior.

UI:

- header con sitio, utility, periodo y calidad de datos global;
- selector compacto, persistido en store;
- breadcrumb operacional;
- banner de incompletitud si faltan datos base;
- patron CMMS: lista izquierda / detalle derecho cuando aplique.

Archivos probables:

- `src/store/uiStore.ts`
- `src/app/AppShell.tsx`
- `src/shared/`
- modulos que hoy cargan su propio selector de sitio.

Criterios de aceptacion:

- [x] un selector global reemplaza selectores duplicados;
- [x] los modulos operativos principales leen `siteId`, `utility` y/o `period`
  cuando aplica;
- [x] empty states explican el siguiente paso;
- [x] `npm run build` funciona.

Implementacion inicial:

- `src/store/uiStore.ts` persiste sitio, utility y periodo energetico.
- `src/app/AppShell.tsx` carga sitios desde Supabase y muestra el contexto
  global en el header.
- `src/shared/OperationalContext.tsx` centraliza labels, rango de periodo,
  resumen y banner de incompletitud.
- `Modelo`, `Mapa`, `Medicion`, `Balances`, `Desempeno`, `Acciones`, `SGEn` e
  `Inicio` consumen el contexto global en lugar de cargar sitios localmente.

### MP-02 — Cockpit de Energy & Utilities

Objetivo:

Reemplazar el placeholder de Inicio por una cabina operacional.

Logica de negocio:

- mostrar salud energetica del sitio;
- priorizar problemas vivos;
- mostrar acciones/proyectos pendientes;
- indicar que modulo necesita atencion.

Ingenieria energetica:

- consumo por utility;
- costo estimado;
- emisiones si hay factores;
- calidad de datos;
- cobertura de medicion;
- no explicado de balances;
- EnPI en desviacion;
- ahorros verificados.

UI:

- tabs tipo CMMS: Ahora, Utilities, Riesgo, Acciones, Tendencias;
- cards densas, no hero marketing;
- lista de alertas accionables;
- cada alerta abre el modulo correcto;
- graficos pequenos y legibles.

Archivos probables:

- `src/modules/inicio/index.tsx`
- `src/shared/MetricCard.tsx`
- queries de `energy_balances`, `energy_enpis`, `energy_improvements`.

Criterios:

- [x] Inicio ya no muestra placeholder;
- [x] muestra KPIs reales o estados vacios claros;
- [x] cada alerta tiene accion;
- [x] compila.

Implementacion inicial:

- `src/services/cockpit.ts` calcula KPIs, cobertura, alertas, tendencias,
  estado de modulos y acciones sin poner logica de negocio en React.
- `src/modules/inicio/index.tsx` presenta tabs operacionales: Ahora,
  Utilities, Riesgo, Acciones y Tendencias.
- El cockpit usa Supabase con el contexto global de sitio, utility y periodo.
- `supabase/seed.sql` incluye datos demo hasta junio 2026 para probar la fase
  con el periodo energetico por defecto.

### MP-03A — Arbol de activos Energy + CMMS

Objetivo:

Usar el arbol de activos compatible con CMMS como base de la planta en Energy.
Energy debe servir como puerta de entrada comercial: el usuario captura su
planta para energia y esa estructura queda preparada para activar CMMS despues.

Logica de negocio:

- jerarquia operativa inicial: planta -> area -> sistema -> equipo;
- `component` no forma parte del arbol inicial de Energy;
- componentes quedan como taxonomia tecnica avanzada del CMMS: familia,
  componentes mantenibles, causas, repuestos, inspecciones y tareas;
- cada nodo del arbol Energy debe poder convertirse en base de activo CMMS;
- Energy agrega perfil energetico sobre el arbol: utility, rol energetico,
  medidores, mapa, balances y oportunidades;
- el usuario que entra por Energy debe quedar listo para comprar CMMS sin
  recapturar planta, areas, sistemas y equipos.
- la creacion de activos debe ocurrir desde el arbol, con menu contextual por
  nodo, siguiendo el patron de VersaMaint;
- las tabs separadas de areas, sistemas y equipos no son el camino principal
  de captura; quedan como vistas internas/administrativas si se necesitan.

Ingenieria energetica:

- planta, area, sistema y equipo deben soportar multiples utilities;
- un equipo puede ser consumidor, fuente, distribucion, retorno o punto de
  perdida segun su perfil energetico;
- los medidores se vinculan a equipo, sistema, area, nodo o edge;
- el medidor fisico tambien puede existir como equipo mantenible bajo el
  subsistema `Medicion` del area;
- el MeasurementPoint conserva la verdad de datos: magnitud, unidad, fuente,
  rutina, import CSV o IoT futuro;
- el arbol debe permitir filtrar balances, EnPI, oportunidades y proyectos por
  descendientes;
- criticidad energetica y criticidad de mantenimiento no son lo mismo, pero
  deben poder convivir.

UI:

- modulo `Equipos` debe iniciar con un arbol de planta;
- ruta legada `/modelo` debe redirigir a `/equipos`;
- layout tipo CMMS: arbol izquierdo / detalle derecho;
- cada nodo muestra estado de preparacion Energy y CMMS;
- detalle del nodo muestra perfil energetico, medidores, mapa y oportunidades;
- desde el detalle del nodo se puede crear area, sistema, equipo o medidor
  segun el tipo de padre;
- CTA suave: "Preparado para CMMS" sin convertir Energy en pantalla de ventas.

Archivos probables:

- `src/modules/modelo/index.tsx`
- `src/modules/modelo/views/PlantAssetTreeView.tsx`
- `src/services/asset-tree.ts`
- `docs/05_MASTER_IMPROVEMENT_PLAN.md`
- `supabase/seed.sql`

Criterios:

- [x] el plan declara que Energy usa planta -> area -> sistema -> equipo;
- [x] `component` queda fuera del arbol inicial de Energy;
- [x] Modelo tiene una primera vista de arbol de planta;
- [x] sidebar y ruta principal usan `Equipos`;
- [x] `/modelo` redirige a `/equipos` para no romper enlaces viejos;
- [x] el arbol permite crear activos desde el nodo seleccionado;
- [x] los medidores se crean como equipo + MeasurementPoint;
- [x] ficha de equipo muestra informacion, adjuntos, taxonomia, medidores,
  mapa Energy y compatibilidad CMMS;
- [x] Modelo deja de exponer areas/sistemas/equipos como tabs principales;
- [x] el seed usa credenciales demo alineadas con CMMS;
- [x] el seed incluye medidores fisicos mantenibles bajo subsistemas
  `Medicion`;
- [x] compila.

Implementacion inicial:

- `src/services/asset-tree.ts` compone el arbol desde `sites`,
  `energy_areas`, `utility_systems`, `energy_equipment` y
  `measurement_points`.
- `src/modules/modelo/views/PlantAssetTreeView.tsx` agrega una primera vista
  arbol/detalle para planta, areas, sistemas y equipos.
- `src/modules/modelo/views/PlantAssetTreeView.tsx` tambien crea activos desde
  el arbol y crea medidores como equipo mantenible + MeasurementPoint.
- `src/modules/modelo/index.tsx` pone el arbol como entrada principal del
  modulo `Equipos` y oculta las tabs redundantes de areas, sistemas y equipos.
- `src/app/router.tsx` mantiene compatibilidad con `/modelo` mediante redirect.
- `supabase/migrations/00012_asset_tree_meter_compat.sql` agrega metadata de
  compatibilidad CMMS, `area_id` en sistemas, medidores fisicos vinculados,
  calibracion y adjuntos de medicion.
- `supabase/seed.sql` siembra el usuario `admin@demo.com` con password
  `AdminDemo123!`, igual que la cuenta demo CMMS, para simular un usuario con
  Energy + CMMS.
- `supabase/seed.sql` incluye 13 medidores como equipos y 13
  MeasurementPoints enlazados con `meter_equipment_id`.

### MP-03C — Sincronizacion VersaMaint / Energy

Objetivo:

Lograr compatibilidad full entre Energy y VersaMaint sin recaptura y sin
duplicar arboles divergentes.

Logica de negocio:

- crear o editar planta, area, sistema o equipo en VersaMaint debe reflejarse
  en Energy;
- crear o editar esos nodos en Energy debe reflejarse en VersaMaint;
- conflictos deben resolverse con fuente, timestamp y responsable;
- medidores creados en Energy se exportan a VersaMaint como activos tipo
  instrumento/equipo mantenible;
- componentes siguen siendo dominio de VersaMaint, no del arbol Energy.

Arquitectura recomendada:

- opcion preferida: asset registry compartido por VersaPlatform;
- opcion alternativa: sync bidireccional por API/webhooks con `integration_key`,
  `cmms_asset_id`, `sync_status` y `last_synced_at`;
- no asumir sincronizacion real solo por compartir nombres de campos.

UI:

- badge por nodo: local, sincronizado, pendiente o conflicto;
- panel de conflictos simple;
- boton "preparar para CMMS" solo si falta metadata critica.

Criterios:

- [ ] crear activo en Energy produce evento/registro sincronizable;
- [ ] crear activo en VersaMaint actualiza o crea nodo Energy;
- [ ] conflictos no sobrescriben datos sin decision humana;
- [ ] medidores Energy se reconocen como equipos/instrumentos mantenibles.

### MP-03B — Modelo guiado y MeasurementPoint binding

Objetivo:

Convertir los puntos de medicion en un flujo guiado para construir una planta
medible sobre el arbol de activos.

Logica de negocio:

- arbol de activos -> fuentes -> medidores;
- cada entidad debe declarar utility cuando aplique;
- un MeasurementPoint no debe existir con target dummy;
- cada punto debe estar vinculado a area, sistema, equipo, nodo o edge.

Ingenieria energetica:

- validar unidad contra utility y magnitud;
- diferenciar acumulador, instantaneo, estado, calculado y manual;
- configurar acumuladores con campos normales, no JSON;
- permitir medidor virtual/calculado con formula controlada.

UI:

- wizard de alta de medidor;
- panel de vinculacion: "Que mide este punto?";
- chips de compatibilidad;
- selector de unidad filtrado;
- preview de configuracion;
- warning si el punto no puede alimentar balance.

Archivos probables:

- `src/modules/modelo/views/MeasurementPointsView.tsx`
- `src/modules/modelo/views/*`
- `src/services/measurement-engine/`
- migracion de ajuste si falta metadata.

Criterios:

- [x] no se crean MeasurementPoints con target dummy;
- [x] usuario normal no edita JSON;
- [x] unidad/magnitud/utility se validan;
- [x] la UI muestra si el punto esta listo para medicion y balance.

Implementacion:

- `src/services/measurement-engine/unitCatalog.ts` centraliza compatibilidad unidad/utility/magnitud.
- `src/modules/modelo/views/MeasurementPointsView.tsx` reemplazado por wizard de 4 pasos:
  Utility → Tipo/Cantidad → Unidad/Config → Vinculacion al grafo.
- El paso de vinculacion resuelve nodos/edges de la tabla `energy_diagram_nodes`.
- Tag se auto-genera si se deja vacío.

### MP-04 — Workspace tecnico del mapa

Objetivo:

Hacer que el mapa sea una herramienta de ingenieria, no solo un canvas.

Logica de negocio:

- diagrama draft se puede editar;
- diagrama publicado queda congelado;
- editar publicado requiere clonar;
- cada diagrama debe tener utility principal y version;
- validaciones bloquean publicacion si hay errores.

Ingenieria energetica:

- validar fuente, consumidores, direccion de flujo y compatibilidad;
- mostrar medidores vinculados;
- identificar nodos sin medicion;
- diferenciar lineas fisicas, logicas y estimadas;
- soportar plantillas: electrico, vapor, aire comprimido, agua helada.

UI:

- toolbar con estado draft/publicado;
- panel de validacion accionable;
- leyenda viva por utility;
- inspector con secciones;
- boton "vincular medidor";
- overlays: cobertura, consumo, perdida, datos faltantes.

Archivos:

- `src/modules/mapa/`
- `src/services/topology-engine/`
- `energy_diagram_versions`
- `energy_topology_validation_issues`

Criterios:

- [x] validar diagrama desde UI;
- [x] publicar bloquea errores criticos;
- [x] publicar crea version congelada;
- [x] overlay minimo de cobertura funciona.
- [x] al arrastrar equipo, area o medidor, el mapa exige vincularlo al arbol;
- [x] medidor visual queda enlazado a equipo medidor y MeasurementPoint;
- [x] validacion R13 bloquea publicacion de equipos, areas o medidores sin enlace;
- [x] seed incluye diagramas reales vinculados al arbol.

Implementacion:

- `src/modules/mapa/canvas/hooks/useDiagramStore.ts` agrega `diagramStatus` y `setStatus`.
- `src/modules/mapa/canvas/hooks/useDiagramPersistence.ts` agrega `publishDiagram` (congela),
  `cloneDiagram` (crea borrador nuevo) y `loadDiagrams`.
- `src/modules/mapa/inspector/ValidationPanel.tsx` panel lateral con issues agrupados.
- `src/modules/mapa/canvas/MapLegend.tsx` leyenda viva por utility + toggle de cobertura.
- `src/modules/mapa/inspector/InspectorPanel.tsx` actualizado con vinculacion a MeasurementPoints.
- `src/modules/mapa/index.tsx` toolbar completo: estado, Validar, Publicar, Clonar, Guardar,
  banner de congelado, toasts.
- `src/modules/mapa/canvas/EnergyUtilitiesCanvas.tsx` agrega modal de
  vinculacion obligatorio para equipos, areas y medidores.
- `src/modules/mapa/canvas/hooks/useDiagramPersistence.ts` recarga cada nodo
  con su familia visual correcta.
- `src/services/topology-engine/validators.ts` agrega R13 para exigir
  `asset_binding` y `measurement_binding` antes de publicar.
- `supabase/seed.sql` incluye cuatro diagramas demo vinculados:
  `Unifilar electrico principal`, `Red de vapor y condensado`, `Sistema de
  aire comprimido` y `Circuito de agua helada`.

### MP-05 — Pipeline de medicion y calidad de datos

Objetivo:

Transformar Medicion en un flujo profesional de datos.

Logica de negocio:

- lectura raw no debe alimentar balances hasta validarse;
- importaciones se gestionan por lote;
- errores se corrigen o se descartan con motivo;
- datos validados quedan listos para balance/EnPI.

Ingenieria energetica:

- validar negativos, nulos, duplicados, gaps, outliers y unidades;
- calcular deltas de acumuladores;
- detectar resets y rollover;
- mantener trazabilidad de fuente;
- marcar dato estimado vs medido.

UI:

- tabs: Captura, Importaciones, Calidad, Lecturas validadas;
- import wizard con preview y mapeo;
- tabla de issues por lote;
- acciones: aceptar, corregir, rechazar;
- indicador de calidad por MeasurementPoint.

Archivos:

- `src/modules/medicion/index.tsx`
- `src/services/measurement-engine/`
- `energy_import_batches`
- `energy_readings_raw`
- `energy_readings_validated`

Criterios:

- [x] importacion crea batch;
- [x] issues son visibles y accionables;
- [x] lecturas validadas alimentan calculos;
- [x] no se pierde raw data.

Implementacion:

- `src/modules/medicion/index.tsx` reemplazado con 4 tabs:
  Captura, Importaciones, Calidad, Lecturas validadas.
- Captura: preview de delta para acumuladores antes de guardar.
- Importaciones: wizard CSV con auto-deteccion de delimitador, mapeo de columnas,
  preview de datos, tracking de batch en `energy_import_batches`.
- Calidad: tabla por MP con score (Buena / Revisar / Sin datos) y deteccion de gaps.
- Validadas: tabla con columna delta para acumuladores y estado (valid/suspicious).

### MP-06 — Balance Run Wizard y overlays

Objetivo:

Ejecutar balances reales usando grafo, version publicada y lecturas validadas.

Logica de negocio:

- usuario elige sitio, utility, periodo y version de diagrama;
- balance declara supuestos;
- balance genera resultado revisable antes de guardar final;
- desviaciones crean oportunidades.

Ingenieria energetica:

- separar entrada total, consumo medido, consumo calculado, estimado,
  perdidas, fugas, retornos y no explicado;
- calcular cobertura de medicion;
- almacenar version de diagrama;
- marcar calculos estimados;
- permitir balance por utility y por sistema.

UI:

- wizard de 4 pasos: alcance, datos, resultados, acciones;
- Sankey o arbol de balance;
- tabla por nodo/sistema;
- overlay en mapa;
- boton "crear oportunidad desde no explicado".

Archivos:

- `src/modules/balances/index.tsx`
- `src/services/balance-engine/`
- `src/modules/mapa/`
- `energy_balances`

Criterios:

- [x] balance usa `balance-engine`;
- [x] usa lecturas validadas;
- [x] guarda version de diagrama;
- [ ] crea oportunidad desde desviacion (pendiente MP-08).

Implementacion:

- `src/modules/balances/index.tsx` reemplazado: wizard de 3 pasos
  (Configurar → Revisar datos → Resultado).
- Balance bar visual (entrada / medido / no-explicado) en lista y detalle.
- Notas de balance para trazabilidad.
- Vista de detalle expandible por card con tabla de nodos y cobertura coloreada.
- Se guarda `diagram_version_id` para trazabilidad.

### MP-07 — EnPI, baseline y objetivos operables

Objetivo:

Completar Desempeno Energetico para gestion real.

Logica de negocio:

- todo EnPI debe tener formula, alcance, frecuencia y owner;
- baseline se versiona y se aprueba;
- target se vincula a periodo;
- desviacion puede crear oportunidad.

Ingenieria energetica:

- constructor visual de formula;
- soporte para numerador/denominador;
- variables relevantes: produccion, clima, horas, ocupacion u otra;
- baseline por promedio, regresion simple o carga manual;
- calculo real vs baseline vs target.

UI:

- EnPI builder tipo wizard;
- curva real/baseline/target;
- tarjeta de salud del indicador;
- historial de baselines;
- boton "crear accion/proyecto".

Archivos:

- `src/modules/desempeno/index.tsx`
- `energy_enpis`
- `energy_baselines`
- `energy_targets`
- `energy_performance_results`

Criterios:

- [x] no se usa `prompt()` para baseline/target;
- [x] formula visible y validada;
- [x] baseline versionado;
- [x] desviaciones accionables.

Implementacion:

- `src/modules/desempeno/index.tsx` reemplazado:
  cards expandibles con grafico de tendencia (Recharts AreaChart).
- Modal `EnPIForm`: wizard completo de nuevo indicador.
- Modal `BaselineForm`: versionado automatico, metodo, rango de periodo.
- Modal `TargetForm`: tipos absolute/percent_reduction/benchmark;
  preview de valor calculado en tiempo real.
- Historial de baselines visible en el card expandido.

### MP-08 — Oportunidades, triage y M&V

Objetivo:

Hacer que Acciones sea el puente entre analitica y ejecucion.

Logica de negocio:

- toda oportunidad tiene origen;
- triage recomienda accion rapida o proyecto;
- se calcula impacto, esfuerzo, inversion, confianza y prioridad;
- cierre requiere evidencia y metodo M&V.

Ingenieria energetica:

- ahorro estimado con unidad;
- ahorro costo;
- ahorro CO2e si hay factores;
- metodo M&V: before/after, baseline model, metered, engineering estimate;
- ahorro real verificado.

UI:

- inbox de oportunidades con scoring;
- form de oportunidad en secciones;
- Kanban de acciones rapidas;
- detalle con origen, supuestos, evidencia y cierre;
- badges de confianza.

Archivos:

- `src/modules/acciones/`
- `src/services/improvement-engine/`
- `energy_improvements`
- `energy_improvement_evidence`

Criterios:

- [x] oportunidad muestra origen y evidencia;
- [x] triage recomienda tipo de trabajo;
- [ ] cierre exige M&V (UI base presente, formulario de cierre en workspace);
- [x] ahorro verificado visible.

Implementacion:

- `ImprovementProjectWorkspace.tsx` integrado con workspace completo de 4 tabs.
- `ImprovementInbox.tsx` actualizado para clasificacion rapida accion/proyecto.
- Tab Cierre en workspace permite registrar ahorro real vs estimado.

### MP-09 — Workspace de proyectos energeticos

Objetivo:

Llevar proyectos de mejora a un workspace inspirado en VersaProject.

Logica de negocio:

- proyecto tiene business case, alcance, fases, tareas, recursos, costos,
  riesgos, documentos y cierre;
- baseline congela plan aprobado;
- cambios ajustan presupuesto o fechas;
- valor ganado se usa cuando hay presupuesto/fases.

Ingenieria energetica:

- cada proyecto conserva ahorro esperado y metodo de verificacion;
- tareas pueden vincular medidores, equipos, sistemas o mapa;
- cierre compara ahorro estimado vs real;
- evidencia alimenta SGEn.

UI:

- navbar de proyecto: Resumen, Plan/Gantt, Recursos, Costos, Valor Ganado,
  Evidencia, Cierre;
- Gantt con plan vs real;
- panel de salud: schedule, budget, savings, risk;
- RFI/punch/documentos simplificados desde VersaProject;
- no convertirlo en MS Project completo.

Archivos:

- `src/modules/acciones/views/ImprovementProjectWorkspace.tsx`
- `src/services/improvement-engine/`
- tablas `energy_project_*`

Criterios:

- [x] no se usa `prompt()` para fases/tareas;
- [x] Gantt muestra plan vs real;
- [ ] baseline de proyecto se fija y se visualiza (pendiente);
- [ ] cierre genera evidencia SGEn (pendiente MP-10).

Implementacion:

- `src/modules/acciones/components/GanttChart.tsx` (NUEVO): Gantt puro en React/CSS.
  - columna izquierda: arbol de fases colapsables con subtareas indentadas.
  - columna derecha: barras planeadas (con relleno de progreso) y reales.
  - cabecera de meses, grid semanal, linea Hoy.
  - sin dependencias externas de Gantt.
- `src/modules/acciones/components/TaskForm.tsx` (NUEVO): modal unico para fases y tareas.
  - fechas, responsable, slider de avance, prioridad, selector de dependencias.
- `src/modules/acciones/views/ImprovementProjectWorkspace.tsx` actualizado:
  - tab Gantt como pestaña principal.
  - tab Tareas con toggle de estado.
  - tab Cierre con comparacion estimado vs real.
  - barra de progreso general calculada desde fases.

### MP-10 — SGEn operativo alineado con ISO 50001

Objetivo:

Completar el workspace SGEn sin copiar texto ISO.

Logica de negocio:

- alcance, politica interna, revision energetica, usos significativos,
  objetivos, evidencia, auditorias, revision gerencial, no conformidades y
  mejora continua deben existir como flujos;
- la evidencia nace del sistema;
- el usuario entiende preparacion operativa, no "certificacion ISO".

Ingenieria energetica:

- scoring de usos significativos por consumo, costo, control, variabilidad,
  riesgo e impacto;
- revision energetica alimentada por balances, EnPI y acciones;
- objetivos vinculados a EnPI y proyectos;
- auditoria interna con preguntas originales.

UI:

- Centro SGEn;
- matriz de usos significativos;
- Evidence Inbox;
- agenda de revision gerencial;
- panel de no conformidades;
- nota legal visible.

Archivos:

- `src/modules/iso50001/`
- `src/services/sgen-engine/`
- tablas `sgen_*`

Criterios:

- [ ] no hay texto ISO copiado;
- [ ] Evidence Inbox funciona;
- [ ] SEUs tienen scoring;
- [ ] revision gerencial genera decisiones y seguimiento.

### MP-11 — Reportes y exportaciones

Objetivo:

Crear salidas profesionales para energia, operaciones, gerencia y SGEn.

Logica de negocio:

- reporte mensual;
- reporte de balance;
- reporte de EnPI;
- reporte de acciones/proyectos;
- paquete SGEn;
- historial de reportes.

Ingenieria energetica:

- cada reporte indica periodo, utility, sitio, fuente y calidad;
- datos estimados se marcan;
- balances indican version de diagrama;
- reportes SGEn no contienen texto ISO propietario.

UI:

- builder de reportes;
- preview de parametros;
- historial;
- descarga PDF/CSV/JSON;
- export SVG/JSON del mapa.

Archivos:

- `src/services/reports-engine/`
- `src/modules/reportes/`
- `energy_generated_reports`

Criterios:

- [ ] generar PDF mensual;
- [ ] generar PDF balance;
- [ ] generar PDF EnPI;
- [ ] generar paquete SGEn seguro;
- [ ] historial visible.

### MP-12 — Administracion y configuracion energetica

Objetivo:

Hacer que Admin controle parametros reales del sistema.

Logica de negocio:

- sitios;
- usuarios;
- roles;
- acceso por sitio;
- monedas;
- tarifas;
- factores de emision;
- unidades;
- parametros de scoring;
- configuracion legal.

Ingenieria energetica:

- tarifa por utility y periodo;
- factor de conversion;
- factor de emision;
- unidades permitidas;
- parametros de calidad de datos;
- parametros de significancia SEU.

UI:

- tabs de configuracion;
- tablas editables densas;
- audit trail minimo;
- confirmaciones para cambios sensibles;
- estado de configuracion incompleta.

Archivos:

- `src/modules/admin/index.tsx`
- migraciones si faltan tablas de tarifas/factores;
- `src/services/*`.

Criterios:

- [ ] Admin ya no es placeholder;
- [ ] sitios y usuarios gestionables;
- [ ] factores/tarifas configurables;
- [ ] RLS verificado.

### MP-13 — Demo dataset, QA y beta

Objetivo:

Preparar una demo realista de punta a punta.

Logica de negocio:

- planta demo con utilities reales;
- flujo completo navegable;
- datos suficientes para mostrar desviaciones y mejoras;
- guia de demo.

Ingenieria energetica:

- electricidad, vapor, aire comprimido y agua helada;
- 12 meses de lecturas;
- gaps y outliers;
- balances con no explicado;
- EnPI con baseline y target;
- al menos una accion rapida y un proyecto.

UI:

- validar responsive;
- empty states;
- loading states;
- error states;
- demo script.

Archivos:

- `supabase/seed.sql`
- `docs/guia-demo.md`
- tests de motores.

Criterios:

- [ ] demo corre con seed;
- [ ] flujo end-to-end documentado;
- [ ] `npm run build` funciona;
- [ ] QA basica aprobada.

## Criterios de avance

No iniciar una fase si la anterior deja:

- build roto;
- migracion inconsistente;
- UI con acciones criticas sin guardar;
- datos importantes sin RLS;
- calculos duplicados en React;
- texto ISO copiado;
- comportamiento mock en runtime.

## Prompt base por fase

```txt
Implementa MP-XX de VersaEnergy.
Lee AGENTS.md, docs/00_DOCUMENTATION_INDEX.md,
docs/04_CURRENT_STATE_REFERENCE.md y docs/05_MASTER_IMPROVEMENT_PLAN.md.

Alcance:
- Trabaja solo MP-XX.
- Mantén Supabase-first y cero mocks.
- No reescribas backend salvo que la fase lo requiera.
- Toda logica de calculo va en src/services/.
- UI sobria tipo CMMS, con flujos claros y estados visibles.
- Si toca proyectos, usa patrones de VersaProject sin copiarlo entero.
- Si toca SGEn, no copies texto ISO ni prometas certificacion.

Verificacion:
- npm run build
- git diff --check
- explicar cambios y riesgos pendientes.
```
