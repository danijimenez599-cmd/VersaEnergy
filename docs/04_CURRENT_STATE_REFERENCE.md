# VersaEnergy — Referencia del estado actual

## Proposito

Este documento deja registrada la base que ya existe para que el trabajo futuro
no vuelva a inventar el backend ni destruya decisiones correctas.

La conclusion principal es:

> El backend y la arquitectura de dominio estan razonablemente solidos para una
> app en construccion. La debilidad esta en flujos de usuario, profundidad de
> formularios, validaciones visibles, calculos conectados a UI y claridad
> operacional.

## Principios que ya funcionan

- Supabase-first, cero mocks en runtime.
- RLS como requisito para tablas tenant-scoped.
- Grafo semantico como verdad del mapa.
- MeasurementPoint como entidad independiente del canvas.
- Motores puros en `src/services/`, separados de React.
- Multi-utility desde el modelo, no solo electricidad.
- Contexto operacional global para sitio, utility y periodo energetico.
- Fases documentadas y verificables.
- Guardrails legales para SGEn alineado con ISO 50001.

## Estado por modulo

### 1. App shell y auth

Base existente:

- login/register con Supabase Auth;
- `AuthProvider`;
- rutas protegidas;
- sidebar modular;
- header operacional con sitio, utility y periodo energetico persistidos;
- cockpit de Inicio con KPIs, alertas, utilities, acciones y tendencia desde
  Supabase;
- shared components (`Button`, `Badge`, `Card`, `Modal`, `PageHeader`,
  `EmptyState`, `MetricCard`).

Brechas:

- el contexto global ya gobierna los modulos operativos principales, pero
  futuras pantallas nuevas deben reutilizarlo en lugar de crear selectores
  locales;
- salud/calidad global ya tiene primera version, pero falta enriquecerla con
  tarifas, factores de emision y reglas de severidad configurables;
- `admin` todavia no ofrece configuracion real;
- no existe un onboarding claro para una planta nueva.

### 2. Equipos y activos Energy & Utilities

Base existente:

- arbol de planta compatible con CMMS hasta nivel equipo;
- creacion contextual desde el arbol, siguiendo el patron de VersaMaint;
- catalogo de utilities;
- areas;
- utility systems;
- equipos;
- fuentes;
- MeasurementPoints;
- migraciones y RLS.

Brechas resueltas (MP-03):

- decision de arquitectura: Energy usa `plant -> area -> system -> equipment`;
- `component` queda fuera del arbol inicial de Energy y se reserva para
  taxonomia tecnica del CMMS;
- primera vista arbol/detalle en Modelo para partir de la estructura de activos;
- tabs redundantes de areas/sistemas/equipos ocultas como camino principal;
- alta de medidor desde el arbol crea equipo mantenible bajo subsistema
  `Medicion` y tambien su MeasurementPoint;
- MeasurementPoint puede conservar metadata de calibracion, fuente de datos,
  captura CSV/IoT futura y adjuntos;
- columnas `integration_key`, `cmms_asset_id`, `sync_status` y
  `last_synced_at` preparan sincronizacion futura con VersaMaint;
- modulo visible como `Equipos`, con alias legado `/modelo` redirigido a
  `/equipos`;
- ficha de equipo con secciones de informacion, adjuntos, taxonomia,
  medidores, mapa Energy y compatibilidad CMMS;
- wizard de alta de MeasurementPoint de 4 pasos: utility → tipo → unidad → vinculacion;
- `unitCatalog.ts` valida compatibilidad unidad/utility/magnitud;
- no se permiten target_id dummy;
- el tag se auto-genera si se deja vacio.

Brechas pendientes:

- sincronizacion bidireccional real con VersaMaint: hoy la compatibilidad es de
  estructura y metadata, no actualizacion en vivo entre aplicaciones;
- acumuladores: campos de rollover y multiplier editables desde UI.

### 3. Mapa Energy & Utilities

Base existente:

- React Flow;
- paleta de nodos;
- nodos y edges por familia;
- inspector lateral;
- persistencia en Supabase;
- servicio de grafo, validacion, queries, versionado y serializacion.
- flujo draft/publicado/clonar;
- validacion visible y bloqueo de publicacion con errores;
- nodos de equipo, area y medicion vinculados al arbol de activos;
- nodos de medidor vinculados a equipo medidor + MeasurementPoint;
- aristas fisicas (`cable`, `busbar`, `pipe`, `duct`) separadas de
  anotaciones (`signal`, `logical`) para no contaminar la topologia;
- binding profesional de medidor: el nodo visual usa
  `properties.measurement_binding.measurement_point_id`, se conecta con una
  arista `signal` como referencia informativa, y ahora puede declarar
  `properties.measurement_binding.anchor` para quedar anclado a una linea
  fisica o nodo tecnico;
- el alcance de balance se resuelve desde el anchor: si es linea, desde el
  extremo aguas abajo del tramo; si es nodo, desde ese nodo;
- rol editable de medidor de frontera en el inspector mediante
  `properties.measurement_binding.role = "boundary"`;
- seleccion de medidores con resaltado visual del alcance aguas abajo;
- lineas fisicas muestran taps de medidores anclados para que el diagrama se lea
  mas cerca de un P&ID/unifilar profesional;
- seed con cuatro diagramas reales: electrico, vapor, aire comprimido y agua
  helada.

Brechas:

- faltan plantillas por utility;
- faltan overlays persistentes de consumo, cobertura, perdidas y datos
  faltantes;
- la leyenda todavia puede evolucionar hacia una herramienta operacional;
- falta crear equipo medidor + MeasurementPoint directamente desde un drop de
  mapa cuando el activo todavia no existe.

### 4. Medicion

Base existente:

- lecturas raw;
- lecturas validadas;
- import batches;
- engine de acumuladores;
- validacion de calidad;
- import CSV basico;
- captura manual.

Brechas:

- la UI no opera el pipeline raw -> validado -> publicado;
- falta resolver gaps, duplicados, outliers y unidades incompatibles desde UI;
- falta trazabilidad por lote de importacion;
- falta vista de calidad por sitio/utility/punto;
- falta manejo mas claro de acumuladores, rollover y resets.

### 5. Balances

Base existente:

- tabla `energy_balances`;
- `balance-engine`;
- estructura para total input, medido, calculado, estimado, perdidas,
  fugas, retornos y no explicado.
- wizard que ejecuta por utility usando diagramas publicados;
- compilacion de `energy_diagram_nodes` + `energy_diagram_edges` +
  `measurement_points` hacia el grafo semantico antes de calcular;
- lectura de medidores de frontera para `totalInput`;
- soporte de acumuladores por delta entre lectura anterior y lectura del
  periodo;
- conversion explicita de unidades compatibles antes de sumar;
- proteccion contra doble conteo en medidores anidados: el medidor hijo se
  muestra como detalle, pero no se suma dos veces contra la entrada total;
- resultado guardado con `diagram_version_id` cuando existe una version
  publicada;
- no explicado protegido contra valores negativos.

Brechas:

- falta vista de supuestos y trazabilidad de cada medicion usada;
- falta mejorar la asignacion por nodo cuando un submedidor cubre multiples
  consumidores aguas abajo;
- falta separar fuente, distribucion, consumidores y retornos con mas detalle
  operativo;
- no genera oportunidades desde desviaciones;
- no muestra overlays sobre el mapa;
- el wizard todavia no muestra supuestos visibles antes de confirmar.

### 6. Desempeno energetico

Base existente:

- EnPI;
- baselines;
- targets;
- resultados;
- RLS;
- UI basica de cards.

Brechas:

- formula de EnPI no se construye visualmente;
- baseline se captura con `prompt`;
- falta congelar baseline con version y periodo;
- falta normalizacion por produccion, clima u otra variable relevante;
- falta comparacion real vs baseline vs target con accion desde desviacion;
- falta workflow de revision/aprobacion.

### 7. Acciones y proyectos

Base existente:

- `energy_improvements`;
- accion rapida vs proyecto;
- portfolio;
- Kanban;
- fases y tareas;
- metricas de proyecto basicas;
- base para valor ganado.

Brechas:

- triage aun no calcula confianza/impacto/esfuerzo;
- falta M&V operativo;
- falta evidencia de cierre robusta;
- el workspace de proyecto necesita el lenguaje de VersaProject;
- faltan recursos, costos reales, cambios, riesgos y documentos;
- falta integracion mas visible con EnPI, balances, mapa y SGEn.

### 8. SGEn alineado con ISO 50001

Base existente:

- migracion `sgen_*`;
- alcance;
- aviso legal;
- guardrails de lenguaje;
- dashboard inicial.

Brechas:

- faltan revision energetica, usos significativos, objetivos, evidencia,
  auditorias, revision gerencial, no conformidades y mejora continua como UI;
- falta Evidence Inbox;
- falta scoring de usos significativos;
- falta paquete de auditoria;
- falta conectar todo a datos reales del sistema.

### 9. Reportes

Base existente:

- dependencia `@react-pdf/renderer`;
- plan de reportes;
- modulo placeholder.

Brechas:

- no hay `reports-engine`;
- no hay historial de reportes;
- no hay PDFs/CSV;
- falta reporte SGEn legalmente seguro;
- falta export SVG/JSON de diagramas.

### 10. Admin

Base existente:

- ruta y placeholder.

Brechas:

- faltan sitios;
- usuarios;
- roles;
- tarifas;
- monedas;
- unidades;
- factores de conversion;
- factores de emision;
- periodos;
- configuracion legal;
- parametros de scoring.

## Antipatrones detectados

- `prompt()` para capturar datos importantes.
- JSON visible para usuarios operativos.
- `target_id` dummy en MeasurementPoints.
- pantallas con EmptyState aunque el backend exista;
- modulos sin workflow;
- acciones destructivas sin confirmacion contextual;
- calculos de UI que no usan el engine correspondiente;
- falta de estado "dato estimado" vs "dato medido" en pantallas clave.

## Lo que no se debe rehacer

- No reescribir el stack.
- No abandonar Supabase/RLS.
- No convertir el mapa en un dibujo plano.
- No fusionar MeasurementPoint con nodos visuales.
- No mover calculos complejos a React.
- No copiar textos de ISO.
- No crear un Microsoft Project completo dentro de Energy.
- No crear dashboards decorativos sin accion operacional.

## Criterio de madurez futura

Un modulo se considera maduro cuando:

- guia al usuario sobre el siguiente paso;
- muestra datos faltantes o inconsistentes;
- tiene empty/loading/error states;
- evita JSON/prompts en flujos normales;
- persiste todo en Supabase;
- conecta con entidades aguas arriba y aguas abajo;
- ofrece evidencia o historial;
- compila con `npm run build`.
