# Plan temporal — Equipos, ficha VersaMaint y mapa vinculado al arbol

Estado: temporal para revision antes de implementacion.

Fecha: 2026-06-02.

## Objetivo

Convertir el antiguo modulo `Modelo` en `Equipos`, con una experiencia mental y
visual equivalente a VersaMaint: arbol de activos a la izquierda, ficha tecnica
del activo a la derecha y acciones contextuales desde el arbol.

El mapa Energy & Utilities debe ser una representacion grafica de activos que ya
existen en el arbol. No debe convertirse en una fuente paralela de equipos.

## Decision principal

La fuente operativa de verdad para planta, areas, sistemas, equipos y medidores
en Energy sera el arbol de activos.

El mapa representa y contextualiza ese arbol para ingenieria energetica:
flujo, utility, medicion, balance, perdidas, cobertura y segmentos.

VersaMaint no se modifica en esta fase.

## Respuesta directa sobre compatibilidad VersaMaint

Hoy no existe sincronizacion live completa entre VersaMaint y Energy.

Lo que ya podemos hacer en Energy:

- usar la misma jerarquia conceptual: planta -> area -> sistema -> equipo;
- preparar campos de compatibilidad: `cmms_asset_id`, `integration_key`,
  `sync_status`, `last_synced_at`;
- tratar medidores fisicos como equipos mantenibles;
- tratar `MeasurementPoint` como entidad de datos vinculada al medidor/equipo.

Lo que falta para compatibilidad full real:

- un asset registry compartido, idealmente en VersaPlatform; o
- una API/sync bridge entre Energy y VersaMaint;
- resolucion de conflictos cuando ambos lados editan el mismo activo;
- reglas de ownership por campo.

Sin tocar VersaMaint, Energy puede quedar listo para sincronizar, pero no puede
garantizar que un cambio hecho dentro de VersaMaint se refleje en Energy a menos
que exista una API, evento, tabla compartida o importador/exportador acordado.

## Contrato de arbol de activos

Jerarquia visible:

```txt
Planta
  Area
    Sistema
      Equipo
```

Reglas:

- `component` sigue siendo dominio de VersaMaint para taxonomia tecnica:
  componentes mantenibles, familias, causas de falla, tareas, repuestos e
  inspecciones.
- Energy no debe crear componentes como hijos del arbol principal.
- Un equipo puede tener rol energetico: fuente, distribucion, consumidor,
  retorno, perdida, medidor, virtual/calculado.
- Un medidor fisico es un equipo.
- Un MeasurementPoint es la entidad que registra datos.

## Medidores: doble entidad correcta

Un medidor debe existir en dos capas:

1. Equipo fisico mantenible:
   - tabla actual: `energy_equipment`;
   - `equipment_type = 'meter'`;
   - metadata: `asset_role = 'measurement_device'`;
   - pertenece a area y al subsistema `Medicion - <utility>`;
   - puede tener fabricante, modelo, serie, criticidad, adjuntos y calibracion;
   - compatible con VersaMaint como activo/instrumento mantenible.

2. MeasurementPoint:
   - tabla actual: `measurement_points`;
   - `meter_equipment_id` apunta al equipo fisico medidor;
   - `target_type` y `target_id` apuntan a lo que mide:
     equipo, sistema, area, nodo o edge;
   - conserva utility, magnitud, unidad, fuente, rutina manual, import CSV o IoT;
   - alimenta medicion, calidad, balances, EnPI y reportes.

Ejemplo:

```txt
Area: Sala de Calderas
  Sistema: Medicion - Vapor
    Equipo: FQI-101 Medidor Vapor Principal

MeasurementPoint:
  tag: FQI-101
  meter_equipment_id: FQI-101
  target: Caldera B-01 o Header de vapor
  quantity: mass
  unit: kg
  source: manual monthly / CSV / IoT futuro
```

## Cambio de nombre: Modelo -> Equipos

Objetivo UX:

- En sidebar y page header debe llamarse `Equipos`.
- El usuario debe sentir que esta construyendo su planta, no configurando un
  modelo abstracto.
- Para no romper links existentes, se recomienda:
  - ruta canonica nueva: `/equipos`;
  - alias temporal: `/modelo` redirige o carga el mismo modulo.

Textos recomendados:

- Sidebar: `Equipos`
- Header: `Equipos y activos`
- Descripcion: `Arbol de activos, ficha tecnica, medidores y compatibilidad CMMS`

## Ficha de equipo estilo VersaMaint

La ficha debe copiar el patron funcional de VersaMaint, no solo parecerse.

Layout:

```txt
┌───────────────────────────────────────────────────────────┐
│ Header activo: tag, nombre, tipo, criticidad, estado       │
├──────────────┬────────────────────────────────────────────┤
│ Arbol        │ Tabs de ficha                              │
│ izquierda    │ - Informacion                              │
│              │ - Adjuntos                                 │
│              │ - Taxonomia / compatibilidad CMMS           │
│              │ - Medidores                                │
│              │ - Mapa Energy                              │
│              │ - Mantenimiento / readiness CMMS            │
└──────────────┴────────────────────────────────────────────┘
```

Tabs propuestas:

1. Informacion
   - nombre;
   - codigo/TAG;
   - tipo de activo;
   - padre;
   - area/sistema;
   - categoria;
   - criticidad energetica;
   - estado;
   - fabricante;
   - modelo;
   - serie;
   - fecha de instalacion;
   - descripcion;
   - ficha tecnica editable por pares clave/valor.

2. Adjuntos
   - manual;
   - foto;
   - certificado;
   - ficha tecnica;
   - certificado de calibracion;
   - otros.

3. Taxonomia / compatibilidad CMMS
   - familia de equipo compatible;
   - componentes mantenibles esperados en VersaMaint;
   - causas/fallas sugeridas solo como metadata de compatibilidad;
   - no crear componentes Energy como hijos.

4. Medidores
   - lista de MeasurementPoints del equipo;
   - medidores fisicos hijos o vinculados;
   - ultima lectura;
   - fuente: manual, CSV, IoT futuro, calculado;
   - ultima calibracion;
   - proxima calibracion;
   - estado: listo, sin target, sin rutina, calibracion vencida.

5. Mapa Energy
   - nodos del mapa vinculados a este equipo;
   - edges donde participa;
   - diagrama y version;
   - boton para abrir en mapa;
   - warning si el equipo existe en arbol pero no esta representado.

6. Mantenimiento / readiness CMMS
   - `sync_status`;
   - `cmms_asset_id` si existe;
   - fecha de ultima sincronizacion;
   - checklist de datos minimos para CMMS;
   - CTA futuro: preparar/enviar a VersaMaint.

## Mapa Energy & Utilities como representacion del arbol

Regla de producto:

El mapa no crea equipos sueltos. El mapa posiciona y conecta activos del arbol.

### Reglas por familia de nodo

| Familia de nodo | Enlace a arbol | Regla |
|---|---:|---|
| Equipo | Obligatorio | Al colocar una caldera, chiller, motor, tablero, etc., debe seleccionarse un equipo existente del arbol o crearlo desde un flujo guiado. |
| Medicion | Obligatorio | Debe seleccionarse un medidor fisico del arbol y su MeasurementPoint. |
| Organizacional | Obligatorio si representa area/proceso real | Debe enlazar area, proceso, linea o planta. |
| Conector | Opcional | Cable, tuberia, ducto o header puede no tener plan de mantenimiento. Si existe como activo mantenible, se enlaza. |
| Control | Opcional | Valvula, breaker, damper o regulador puede enlazarse si sera mantenible o criticidad alta. |
| IoT / Datos | Opcional, recomendado | Puede vincularse a gateway, PLC o fuente de datos cuando exista en el arbol o admin tecnico. |
| Especial | Segun caso | Fuente utility, perdida, anotacion o grupo puede tener enlace logico, no siempre activo mantenible. |

### Comportamiento al arrastrar una plantilla

Para equipos:

1. Usuario arrastra plantilla `Caldera`.
2. Se abre modal `Vincular equipo del arbol`.
3. La lista se filtra por:
   - sitio;
   - area/proceso visible si aplica;
   - tipo compatible;
   - utility compatible;
   - no vinculado ya en el mismo diagrama, salvo que se permita duplicado visual.
4. Usuario selecciona `B-01 Caldera 200 BHP`.
5. El nodo hereda:
   - tag;
   - nombre;
   - utility;
   - tipo;
   - metadata del equipo.
6. El nodo guarda `asset_binding`.

Para medidores:

1. Usuario arrastra `Medidor vapor` o `Power Meter`.
2. Se abre modal `Vincular medidor fisico`.
3. Debe seleccionar un equipo medidor del arbol.
4. Debe seleccionar o crear el MeasurementPoint que registra datos.
5. El nodo visual queda vinculado al MeasurementPoint.
6. El MeasurementPoint conserva `meter_equipment_id` para no perder su equipo
   fisico.

Para conectores/control:

- Puede colocarse sin activo.
- Si no tiene activo, debe guardar `binding_status = optional_unbound`.
- Si se publica un diagrama critico, el validador puede recomendar vincular
  controles importantes, pero no bloquear.

## Segmentacion intuitiva en mapa

El mapa debe poder segmentarse usando el arbol:

- vista por planta;
- vista por area;
- vista por sistema;
- vista por proceso/linea;
- filtro por utility;
- capas:
  - activos;
  - medidores;
  - conexiones;
  - cobertura de medicion;
  - datos faltantes;
  - perdidas/desviaciones.

UI sugerida:

- panel izquierdo: paleta + arbol compacto o selector de area/sistema;
- canvas central;
- inspector derecho;
- barra superior: sitio, utility, area, sistema, version, estado;
- mini mapa o breadcrumbs del arbol.

## Modelo de datos recomendado

Cambios minimos en Energy:

### `energy_diagram_nodes`

Agregar o guardar en `properties` inicialmente:

```json
{
  "asset_binding": {
    "required": true,
    "entity_type": "equipment",
    "entity_id": "uuid",
    "source": "asset_tree",
    "status": "linked"
  }
}
```

Mejor migracion posterior:

- `asset_entity_type text`;
- `asset_entity_id uuid`;
- `measurement_point_id uuid`;
- `binding_required boolean`;
- `binding_status text check in ('linked','missing','optional_unbound','conflict')`.

### `measurement_points`

Ya preparado/recomendado:

- `meter_equipment_id`;
- `last_calibration_date`;
- `calibration_due_date`;
- `properties`;
- `cmms_asset_id`;
- `integration_key`;
- `sync_status`;
- `last_synced_at`.

### `energy_equipment`

Para medidores:

```json
{
  "asset_role": "measurement_device",
  "calibration": {
    "lastDate": "2026-01-15",
    "dueDate": "2027-01-15"
  },
  "data_capture": {
    "mode": "manual|csv|iot",
    "frequency": "daily|weekly|monthly|on_demand"
  }
}
```

## Fases temporales de implementacion

### TEMP-01 — Renombrar Modelo a Equipos

Alcance:

- cambiar sidebar `Modelo` -> `Equipos`;
- cambiar header del modulo;
- crear ruta `/equipos` si se decide;
- mantener `/modelo` como alias para no romper enlaces internos;
- actualizar cockpit y textos que digan modelo cuando se refieren al arbol.

Criterios:

- [ ] sidebar muestra `Equipos`;
- [ ] page header muestra `Equipos y activos`;
- [ ] links existentes siguen funcionando;
- [ ] `npm run build` pasa.

Archivos probables:

- `src/modules/index.ts`;
- `src/app/router.tsx`;
- `src/modules/modelo/index.tsx`;
- `src/services/cockpit.ts`;
- docs.

### TEMP-02 — Ficha de equipo estilo VersaMaint

Alcance:

- crear `EquipmentDetailPanel` inspirado funcionalmente en
  `AssetDetailPanel` de VersaMaint;
- tabs: Informacion, Adjuntos, Taxonomia/CMMS, Medidores, Mapa Energy,
  Mantenimiento/readiness;
- mover la vista actual de detalle simple a ficha completa;
- preservar arbol izquierdo.

Criterios:

- [ ] seleccionar equipo abre ficha completa;
- [ ] seleccionar area/sistema/planta muestra ficha resumida apropiada;
- [ ] equipo medidor muestra calibracion y MeasurementPoint;
- [ ] adjuntos aparecen como flujo real o placeholder claro si storage queda
  para fase siguiente;
- [ ] no se muestran JSON crudos al usuario.

Archivos probables:

- `src/modules/modelo/views/PlantAssetTreeView.tsx`;
- `src/modules/modelo/components/EquipmentDetailPanel.tsx`;
- `src/modules/modelo/components/EquipmentFormModal.tsx`;
- `src/services/asset-tree.ts`;
- `supabase/migrations/*` si falta metadata.

### TEMP-03 — Medidor como equipo + MeasurementPoint

Alcance:

- formalizar `equipment_type = 'meter'`;
- crear medidor desde arbol;
- crear/editar MeasurementPoint asociado;
- registrar rutina manual, CSV o IoT futuro;
- capturar ultima/proxima calibracion;
- adjuntar certificado de calibracion.

Criterios:

- [ ] crear medidor crea `energy_equipment`;
- [ ] crear medidor crea o vincula `measurement_points`;
- [ ] el medidor aparece en arbol bajo `Medicion - <utility>`;
- [ ] MeasurementPoint alimenta Medicion/Balance;
- [ ] ficha muestra estado de calibracion.

### TEMP-04 — Binding obligatorio del mapa

Alcance:

- al arrastrar equipos de plantilla, abrir modal de enlace obligatorio;
- al arrastrar medidores, abrir modal de enlace obligatorio a equipo medidor +
  MeasurementPoint;
- conectores/control permiten enlace opcional;
- inspector muestra y permite cambiar enlace;
- validador bloquea publicar si equipo/medidor obligatorio no esta enlazado.

Criterios:

- [ ] nodo equipo no puede publicarse sin `asset_binding`;
- [ ] nodo medicion no puede publicarse sin equipo medidor y MeasurementPoint;
- [ ] conector/control puede quedar sin enlace sin bloquear;
- [ ] inspector muestra el activo vinculado y boton para abrir ficha;
- [ ] mapa sigue guardando versiones draft/published.

Archivos probables:

- `src/modules/mapa/canvas/EnergyUtilitiesCanvas.tsx`;
- `src/modules/mapa/palette/NodePalette.tsx`;
- `src/modules/mapa/inspector/InspectorPanel.tsx`;
- `src/modules/mapa/canvas/hooks/useDiagramPersistence.ts`;
- `src/services/topology-engine/validators.ts`;
- `src/services/topology-engine/graphTypes.ts`.

### TEMP-05 — Segmentacion por arbol en mapa

Alcance:

- filtros por area/sistema/proceso;
- grupos visuales o swimlanes por area;
- breadcrumbs de ubicacion;
- capa de cobertura de medicion;
- highlight de equipos sin representacion en mapa.

Criterios:

- [ ] usuario puede ver solo un area/sistema;
- [ ] equipos del area son sugeridos al vincular nodos;
- [ ] mapa distingue equipos representados vs pendientes;
- [ ] cobertura de medicion se entiende sin leer tablas.

### TEMP-06 — Integracion VersaMaint sin modificar VersaMaint

Alcance Energy-only:

- mantener campos de sync;
- exportar payload compatible con VersaMaint;
- importar CSV/API payload de VersaMaint si existe;
- mostrar estado `local`, `pending_sync`, `synced`, `conflict`;
- no sobrescribir sin confirmacion.

Criterios:

- [ ] Energy puede exportar arbol listo para CMMS;
- [ ] Energy puede recibir un arbol externo si se proporciona fuente;
- [ ] conflictos quedan visibles;
- [ ] no se promete sincronizacion live si no hay API/registry.

## Orden recomendado

1. TEMP-01 Renombre.
2. TEMP-02 Ficha de equipo.
3. TEMP-03 Medidor dual.
4. TEMP-04 Binding obligatorio del mapa.
5. TEMP-05 Segmentacion del mapa.
6. TEMP-06 Sync VersaMaint.

## Riesgos y decisiones pendientes

1. Ficha identica a VersaMaint:
   - copiar funcionalidad es correcto;
   - importar componentes directamente desde `CMMSFSC` puede acoplar apps.
   - recomendacion: recrear componente Energy con la misma estructura UX ahora;
     extraer paquete compartido mas adelante si conviene.

2. Ruta `/modelo`:
   - cambiarla de golpe puede romper links internos;
   - recomendacion: `/equipos` canonica y `/modelo` alias temporal.

3. Full sync:
   - no existe sin una superficie comun;
   - recomendacion: preparar Energy-side y documentar limitacion.

4. Medidores en mapa:
   - el icono visual no debe ser la fuente de verdad;
   - recomendacion: nodo visual enlaza a MeasurementPoint, y MeasurementPoint
     enlaza al equipo medidor fisico.

5. Publicacion de diagramas:
   - se puede permitir draft incompleto;
   - publicar debe bloquear equipos/medidores sin enlace obligatorio.

## Criterio final de exito

Un usuario entra por Energy, crea su planta, areas, sistemas, equipos y
medidores desde `Equipos`, dibuja el mapa como representacion de esos activos,
vincula cada equipo/medidor visual al arbol, captura o importa datos, y queda
preparado para activar VersaMaint sin recapturar la base de activos.
