# Core Asset Registry

## Proposito

El Core Asset Registry es el contrato compartido de activos fisicos entre
VersaMaint, VersaEnergy y VersaPlatform. En esta etapa el primer schema real
vive en VersaMaint/Core; VersaEnergy mantiene un mock local compatible para
desarrollo y pruebas, pero no debe inventar una identidad paralela de activos.

## Principio Maestro

Cuando una empresa/sede tiene VersaMaint y VersaEnergy activos al mismo tiempo,
VersaMaint/Core gobierna los activos fisicos. Energy no crea duplicados: crea
una solicitud en `asset_registry_requests` y Maint/Core decide si aprueba,
rechaza, adopta, fusiona o actualiza.

La deduplicacion no es un flujo cotidiano en modo `maint_and_energy`; es un
mecanismo de saneamiento para:

- clientes que arrancaron con `energy_only` y luego compran Maint;
- imports masivos desde hojas, BMS, SCADA, ERP o historicos;
- solicitudes Energy que apuntan a un activo ya existente;
- fusiones administrativas hechas por Platform/Maint.

## Entidades

| Entidad | Rol |
|---------|-----|
| `assets` | Registro maestro de activos fisicos, agrupadores y medidores fisicos. |
| `energy_asset_profiles` | Perfil satelite Energy por activo Core. No reemplaza al activo fisico. |
| `energy_groups` | Agrupadores energeticos propios de Energy. |
| `energy_group_members` | Miembros de grupos Energy: activos, MPs, medidores, nodos/edges o subgrupos. |
| `energy_measurement_point_profiles` | Perfil energetico por MeasurementPoint. |
| `energy_measurement_bindings` | Binding formal de MPs a assets, grupos, topologia, formulas o fuentes externas. |
| `energy_scope_exceptions` | Excepciones de alcance energetico sin tocar el arbol CMMS. |
| `measurement_points` | Entidad de dato medido. Puede apuntar a equipo, agrupador o medidor fisico. |
| `asset_registry_requests` | Cola de solicitudes cross-app cuando Maint gobierna. |
| `asset_registry_events` | Historial comun de cambios, decisiones, adopciones, merges y eventos de medicion. |

## Modos Por Sede

| Modo | Regla |
|------|-------|
| `energy_only` | Energy puede crear activos Core con plantilla compatible CMMS. |
| `maint_only` | Energy no debe crear ni mutar activos fisicos. |
| `maint_and_energy` | Energy crea solicitudes; Maint/Core decide. |
| `none` | No hay producto operativo para la sede. |

La resolucion se hace con `fn_site_product_mode(site_id)`.

## Seed Compartido

El seed global de `assets` debe estar gobernado por CMMS/Core. En ambientes de
desarrollo donde ambas apps conviven, VersaMaint siembra primero empresa, sede,
agrupadores, mantenibles y medidores fisicos. VersaEnergy no re-crea ese arbol:
agrega por encima sus capas satelite:

- `energy_asset_profiles`;
- `energy_groups` y `energy_group_members`;
- `energy_measurement_point_profiles`;
- `energy_measurement_bindings`;
- topologias, diagramas y excepciones de alcance.

Si solo existe Energy para una sede (`energy_only`), Energy puede crear activos
en `assets` usando una plantilla compatible CMMS. Si despues se activa Maint,
esos activos ya tienen identidad Core y Maint puede adoptarlos sin migracion de
identidad.

## Permisos Y Scope

Energy debe leer el Core Asset Registry respetando sede. El mock local usa:

| Objeto | Rol |
|--------|-----|
| `site_access` | Alcance operativo por usuario y sede. |
| `fn_current_profile_id()` | Perfil autenticado actual. |
| `fn_user_can_access_site(user_id, site_id)` | Validador de acceso por sede. |

Las tablas `assets`, `energy_asset_profiles`, `measurement_points`,
`measurement_readings`, `asset_registry_requests` y `asset_registry_events`
deben aplicar RLS por `site_id` directo o derivado.

Mientras una empresa de desarrollo no tenga filas de `site_access`, el helper
permite acceso por empresa para no bloquear la maqueta. En produccion, Platform
debe crear los alcances y desde ese momento el scope formal manda.

## Ciclo De Vida

### Activo Fisico

`assets.status` representa el ciclo fisico operativo:

| Estado | Uso |
|--------|-----|
| `active` | Activo operativo o disponible para operacion. |
| `standby` | Activo preservado o disponible, pero fuera de operacion normal. |
| `decommissioned` | Baja tecnica/soft delete; no debe aparecer como activo operativo. |

Los cambios relevantes se auditan en `asset_registry_events` con eventos como
`created`, `standby`, `reactivated` y `decommissioned`.

### Solicitud

`asset_registry_requests.status` representa el flujo de decision:

| Estado | Uso |
|--------|-----|
| `pending` | Solicitud abierta, sin decision. |
| `approved` | Maint/Core aprobo y aplico la decision. |
| `rejected` | Maint/Core rechazo con nota. |
| `merged` | La solicitud fue resuelta fusionando/adoptando hacia un activo existente. |
| `cancelled` | La solicitud fue retirada sin decision tecnica. |

## Eventos

`asset_registry_events` es append-only. No se actualiza ni se borra desde la
app. Debe usarse para reconstruir decisiones y explicar por que Energy ve un
activo, medidor o MeasurementPoint de cierta forma.

Eventos principales:

| Evento | Significado |
|--------|-------------|
| `request_created` | Energy/Platform origino una solicitud. |
| `request_approved` | Maint/Core aprobo la solicitud. |
| `request_rejected` | Maint/Core rechazo la solicitud. |
| `adoption_requested` | Se pide adoptar un activo existente en otro producto/import. |
| `merged` | Se resolvio por fusion contra un activo maestro. |
| `meter_changed` | Se cambio medidor fisico o lectura base. |
| `meter_reset` | El acumulador reinicio desde un valor menor. |
| `meter_rollover` | El acumulador dio vuelta al maximo. |
| `manual_correction` | Un ingeniero autorizo correccion historica/manual. |
| `sync_published` / `sync_applied` / `sync_conflict` | Eventos futuros de sincronizacion Core. |

## MeasurementPoints Y Medidores

Un medidor fisico es un activo Core mantenible con `maintainable_kind='meter'`.
Un MeasurementPoint es el dato medido. Puede tener medidor fisico o no.

Regla base:

- el medidor fisico es opcional;
- el scope medido es obligatorio;
- el dominio de uso debe quedar declarado.

La relacion recomendada es:

- `physical_meter_asset_id` apunta al medidor fisico si existe;
- `scope_asset_id` apunta al equipo o agrupador que representa el alcance
  medido;
- `domains` declara usos como `energy`, `maintenance_condition`, `production`
  o `quality`.

Un MeasurementPoint sin `physical_meter_asset_id` es valido cuando la data viene
de captura manual operacional, formula, lectura estimada/derivada, integracion
externa o fuente futura. En E5 la fuente productiva vigente es captura manual;
file import, API, IoT/gateway y calculados quedan como capacidades **EN
DESARROLLO** hasta que se defina su contrato operativo.

Si una medicion se coloca sobre un agrupador, Energy interpreta que mide el
subarbol aguas abajo de forma operacional. Excepciones como "Modulo 1 excepto
tres maquinas" no deben deformar el arbol CMMS; deben resolverse en diagramas,
balances o topologias Energy validadas por ingenieria.

## Grupos Energy

Los grupos Energy pueden coincidir con agrupadores CMMS, pero no estan
obligados a hacerlo. Sirven para representar fronteras electricas, zonas de
medicion, lineas de produccion, balances por tarifa, proyectos o scopes de
analisis.

Reglas:

- Un grupo Energy no es un activo mantenible.
- Puede contener MeasurementPoints, activos Core, medidores fisicos, nodos/edges
  de topologia u otros grupos.
- Los agrupadores Core/CMMS importados a Energy son scopes de referencia. No se
  mueven desde Energy para cambiar la jerarquia fisica.
- La movilidad libre del ingeniero energetico vive en `energy_groups`,
  topologias y diagramas.
- Las excepciones se registran en `energy_scope_exceptions`; no se corrige el
  arbol fisico para complacer un caso energetico desordenado.
- Un grupo Energy debe tener `site_id` y respetar `fn_user_can_access_site`.

## Salvaguarda De Acumuladores

Una lectura de `measurement_type in ('accumulator', 'counter')` no puede ser
menor que la lectura anterior salvo que se declare:

| Evento | Cuando usar |
|--------|-------------|
| `meter_reset` | El medidor reinicio a cero u otro valor bajo. |
| `meter_changed` | Se reemplazo el medidor fisico. |
| `meter_rollover` | El contador supero su maximo y volvio al inicio. |
| `manual_correction` | Correccion humana justificada. |

El ingreso recomendado es `fn_record_measurement_reading_tx`, que aplica la
validacion y registra evento auditado. Los inserts directos a
`measurement_readings` tambien quedan protegidos por trigger.

## Invariantes

- Energy no crea activos fisicos maestros si la sede esta en `maint_and_energy`.
- Energy puede enriquecer activos con `energy_asset_profiles`.
- Energy filtra activos, MeasurementPoints, lecturas, solicitudes y eventos por
  sede mediante `fn_user_can_access_site`.
- Las solicitudes cross-app son trazables y no se borran.
- La deduplicacion normal no aplica cuando Maint gobierna desde el inicio.
- Los eventos son append-only y sirven como memoria comun entre productos.
- La baja fisica de un activo no debe borrar historico energetico.
- Los MeasurementPoints son datos; los medidores fisicos son activos.

## Verificacion

Para cambios en este contrato:

1. Ejecutar migraciones/reset local de Energy.
2. Ejecutar build de Energy.
3. Si se toca Core/CMMS, regenerar schema canonico y resetear CMMS.
4. Probar al menos:
   - creacion `energy_only`;
   - solicitud `maint_and_energy`;
   - lectura acumuladora creciente;
   - lectura acumuladora menor rechazada;
   - lectura acumuladora menor aceptada con evento.
