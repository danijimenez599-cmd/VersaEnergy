# Modulo: Estudios y auditoria Energetica

## Responsabilidad

Gestiona expedientes tecnicos de estudio energetico, revision de desempeno,
auditoria interna, investigacion de desviaciones, brechas de medicion y
decisiones de mejora. Su responsabilidad no es mostrar todos los analisis al
mismo tiempo, sino guiar al ingeniero desde una pregunta hasta una conclusion
defendible.

Desempeno gobierna EnPIs maduros. Balances cierra energia por frontera.
Acciones ejecuta mejoras. SGEn evidencia gestion. Estudios conecta esas piezas
como flujo tecnico trazable.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/estudios/index.tsx` |
| Workbench inicial | `src/modules/desempeno/views/StudyLauncher.tsx` |
| Motor de estudios | `src/services/energy-study-engine/` |
| Estadistica base | `src/lib/statistics.ts` |
| Plan vivo | `docs/ENERGY_ENGINEERING_BLUEPRINT.md` (Fase E13) |
| Migracion E13 | `supabase/migrations/00037_e13_study_case_management.sql` |

## Modelo/Tablas actuales

- `energy_studies` — estudio persistente y pregunta tecnica.
- `energy_study_sources` — fuentes usadas por el estudio.
- `energy_study_models` — modelos o metricas evaluadas.
- `energy_study_findings` — hallazgos, brechas y advertencias.
- `energy_study_decisions` — decision tomada desde el estudio.
- `energy_study_variable_candidates` — memoria tecnica de drivers evaluados.
- `energy_study_activities` — actividades tipo OT energetica del expediente.
- `energy_study_evidence` — adjuntos, referencias y evidencias del expediente.
- `energy_study_events` — bitacora append-only del expediente.
- `measurement_points` — fuentes de datos energeticos compartidas.
- `measurement_readings` — lecturas reales.
- `energy_balance_sheets` / `energy_balance_results` — balances oficiales.
- `relevant_variables` / `relevant_variable_readings` — variables relevantes.
- `energy_enpis` / `energy_enpi_variable_links` — indicadores maduros y drivers.
- `energy_improvements` — acciones/proyectos creados desde decisiones.
- `sgen_evidence_snapshots` — evidencia generada desde estudios.

## Doctrina E13: expediente antes que carriles

El modulo no debe organizarse como tres carriles horizontales gigantes. Ese
layout muestra capacidad tecnica, pero no comunica proceso. El objeto central
debe ser un expediente con estado, alcance, fuentes, suficiencia, analisis,
hallazgos, decisiones e historico.

Flujo canonico:

```txt
Intake
  -> Alcance y frontera
  -> Recoleccion de datos
  -> Suficiencia de datos
  -> Plan de analisis
  -> Hallazgos
  -> Decision
  -> Cierre e historico
```

## Estado implementado

E13 esta implementada como primera capa de case management:

- `/estudios` muestra inbox de expedientes, flujo vertical, panel central y
  expediente vivo lateral.
- El estudio existente de Nave A se siembra como expediente real, no mock.
- El usuario puede crear expedientes nuevos por sitio.
- El usuario puede elegir alcance por sitio, agrupador o equipo desde `assets`.
- El usuario puede agregar actividades tecnicas.
- El usuario puede iniciar/completar actividades.
- El usuario puede agregar evidencia como nota, referencia, archivo externo,
  captura, reporte, balance snapshot o referencia CMMS.
- El usuario puede agregar hallazgos.
- El usuario puede cambiar suficiencia de datos.
- El usuario puede registrar decision final.
- La decision final puede crear EnPI, accion rapida o proyecto real.
- Las decisiones de medicion, Maint/CMMS, evidencia SGEn, seguimiento y cierre
  quedan registradas como decision/historial para su flujo posterior.
- El laboratorio `StudyLauncher` permanece disponible solo dentro del paso
  `Analisis`, no como estructura principal del modulo.

Verificacion de cierre:

```txt
npm run build: verde
supabase db reset: verde
Consulta seed E13:
  energy_studies = 1
  energy_study_activities = 4
  energy_study_evidence = 3
  energy_study_events = 4
```

## Tipos de expediente

| Tipo | Uso |
|------|-----|
| `energy_study` | Pregunta tecnica, analisis exploratorio o comparacion de modelos |
| `performance_review` | Revision periodica de EnPIs, desviaciones y drivers |
| `measurement_gap` | Investigacion de medicion faltante o cobertura insuficiente |
| `balance_investigation` | Explicar residual/no explicado de un balance oficial |
| `mv_review` | Verificar ahorro o estabilidad posterior a una accion |
| `internal_audit` | Revision estructurada de gestion, evidencia y seguimiento |
| `seu_review` | Evaluar alcance energetico significativo y prioridad operativa |

## Estados del flujo

| Estado | Significado |
|--------|-------------|
| `draft` | Expediente creado sin alcance completo |
| `scoping` | El ingeniero define frontera, utilidad, periodo y pregunta |
| `data_collection` | Se recolectan fuentes y variables |
| `data_gap` | Hay datos faltantes o calidad insuficiente |
| `ready_for_analysis` | Datos suficientes para analisis preliminar |
| `analyzing` | Modelos y comparaciones en progreso |
| `findings_review` | Hallazgos listos para revision tecnica |
| `decision_pending` | Falta decidir salida operativa |
| `decided` | Decision tomada, con enlace a EnPI, accion, medicion o evidencia |
| `closed` | Expediente cerrado y congelado para historico |
| `archived` | Expediente retirado de operacion activa |

## Paso 1: Intake

El ingeniero debe poder iniciar por:

- desviacion de EnPI;
- residual/no explicado de balance;
- baja cobertura de medicion;
- oportunidad detectada;
- solicitud de gerencia;
- revision periodica;
- auditoria interna;
- verificacion M&V;
- cambio operacional relevante;
- comparacion de linea, equipo, turno, utilidad o sede.

Campos minimos:

- titulo;
- tipo de expediente;
- sitio;
- prioridad;
- owner;
- fecha objetivo;
- periodo de analisis;
- pregunta tecnica;
- origen opcional (`balance`, `enpi`, `action`, `sgen`, `diagram`, `manual`);
- entidad origen opcional.

## Paso 2: Alcance y frontera

El alcance debe poder anclarse a:

- sitio completo;
- agrupador Core;
- Energy group;
- diagrama publicado;
- frontera de balance;
- asset/equipo;
- MeasurementPoint;
- utility o conjunto de utilities;
- alcance custom documentado.

Reglas:

- si viene desde balance oficial, heredar diagrama, utility, periodo y
  cobertura;
- si viene desde EnPI, heredar numerador, variable relevante, baseline y target;
- si viene desde Acciones/M&V, heredar proyecto, baseline M&V y periodo de
  verificacion;
- si el alcance es custom, debe quedar escrito el supuesto.

## Paso 3: Recoleccion de datos

La recoleccion debe ser una matriz de requisitos, no una lista informal.

Tipos de fuente:

- MeasurementPoints y lecturas;
- medidores embebidos en frontera;
- balance sheets y resultados oficiales;
- diagramas publicados;
- variables relevantes y lecturas;
- EnPIs, baselines y targets;
- acciones/proyectos y M&V;
- handoff Maint/CMMS cuando aplique;
- evidencia SGEn;
- notas tecnicas y adjuntos.

Cada requisito debe tener:

- `required`, `recommended` u `optional`;
- fuente esperada;
- periodo esperado;
- cobertura real;
- calidad;
- estado (`missing`, `partial`, `available`, `rejected`);
- observacion del ingeniero.

## Paso 4: Suficiencia de datos

Antes de analizar, el sistema debe evaluar:

- cobertura temporal;
- alineacion de periodos entre energia y variable;
- puntos faltantes;
- calidad de lectura;
- acumuladores con reset;
- frontera publicada disponible;
- balance oficial disponible;
- variables relevantes suficientes;
- supuestos declarados;
- riesgo de conclusion debil.

Estados de suficiencia:

| Estado | Uso |
|--------|-----|
| `preliminary` | Se puede explorar, no defender conclusion fuerte |
| `usable` | Datos suficientes para recomendacion tecnica |
| `defensible` | Datos, frontera y supuestos son auditables |
| `blocked` | Falta medicion, variable o frontera critica |

## Paso 5: Plan de analisis

El analisis se elige segun la pregunta, no por saturar la pantalla.

Opciones iniciales:

- ratio energia / variable relevante;
- tendencia contra baseline;
- comparacion contra mejor periodo;
- desviacion contra target;
- residual de balance;
- ranking de variables relevantes;
- regresion simple;
- comparacion de modelos candidatos;
- CUSUM inicial;
- before/after para M&V;
- comparacion por scope/equipo/linea;
- recomendacion de medicion faltante.

El sistema puede sugerir analisis, pero el ingeniero confirma.

## Paso 6: Hallazgos

Cada hallazgo debe registrar:

- titulo;
- severidad;
- confianza;
- scope afectado;
- utility;
- impacto estimado;
- evidencia vinculada;
- supuesto principal;
- incertidumbre;
- recomendacion.

Categorias:

- desviacion;
- consumo base;
- perdida/no explicado;
- brecha de medicion;
- variable relevante faltante;
- oportunidad operativa;
- oportunidad de mantenimiento;
- oportunidad de proyecto;
- evidencia insuficiente.

## Paso 7: Decision

Salidas permitidas:

- crear o promover EnPI;
- crear baseline/target;
- crear accion rapida;
- crear proyecto;
- abrir solicitud Maint/CMMS;
- solicitar MeasurementPoint o medidor;
- crear evidencia SGEn;
- abrir balance o diagrama requerido;
- cerrar como no concluyente;
- dejar seguimiento programado.

La decision debe guardar razon, responsable, fecha y enlace a la entidad creada.

## Paso 8: Historico

El historico debe ser append-only. Un expediente cerrado no se reescribe; se
abre nueva version o expediente relacionado.

Eventos minimos:

- creado;
- alcance cambiado;
- fuente agregada/removida;
- suficiencia evaluada;
- modelo ejecutado;
- hallazgo agregado;
- decision tomada;
- entidad derivada creada;
- evidencia generada;
- cerrado;
- reabierto.

La vista historica debe filtrar por:

- sitio;
- periodo;
- tipo;
- estado;
- owner;
- utility;
- alcance;
- origen;
- decision.

## UX objetivo

Estructura recomendada:

```txt
Sidebar app
  Estudios y auditoria Energetica

Header del modulo
  Expedientes | Nuevo | Historico | Plantillas

Layout de expediente
  Izquierda: pasos del flujo y estado
  Centro: trabajo del paso activo
  Derecha: expediente vivo
    - scope
    - fuentes
    - suficiencia
    - hallazgos
    - decisiones
    - enlaces
  Abajo/modal: historico y bitacora
```

No usar carriles horizontales como estructura principal. Se pueden usar tarjetas
compactas dentro de un paso, pero el proceso debe ser vertical, guiado y
persistente.

## Fases de implementacion cerradas

- E13-A: schema de expediente, actividades, evidencia y eventos. ✅
- E13-B: shell visual con lista de expedientes y flujo vertical. ✅
- E13-C: intake, alcance, actividades y suficiencia. ✅
- E13-D: laboratorio de analisis integrado como paso interno. ✅
- E13-E: hallazgos, evidencia y decisiones finales. ✅
- E13-F: historico/versionado inicial por eventos. ✅
- E13-G: seed real, documentacion, build y reset. ✅

## Pendientes E13.x

- Matriz formal de requisitos de datos (`required/recommended/optional`) por
  expediente, separada de la lista de fuentes.
- Upload binario a Storage; E13 actual registra referencias/evidencias, no
  almacena archivos.
- Handoff Maint/CMMS completo desde decision final; E13 registra la decision,
  pero la solicitud formal debe conectarse con el flujo E9/CMMS.
- Crear evidencia SGEn real desde decision final; E13 registra la decision, pero
  el snapshot formal debe reutilizar el motor SGEn.
- Historico con filtros globales por tipo, owner, utility, alcance y decision.

## Invariantes

- Supabase-first: no mocks en runtime.
- No duplicar calculos del motor en React.
- No crear EnPIs automaticamente sin decision explicita.
- No crear activos Core desde Estudios cuando Maint gobierna la sede.
- Los estudios deben usar datos reales o declarar brecha.
- Las fuentes deben quedar vinculadas al expediente.
- Las decisiones deben ser trazables y reversibles operacionalmente.
- El lenguaje visible debe ser profesional y propio de gestion energetica, sin
  referencias a normas externas.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Cambio de schema: `supabase db reset`.
- Cambio del motor: prueba real con seed y salida pegada.
- Cambio de navegacion: verificar scroll, layout y acceso desde sidebar.
