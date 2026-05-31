# VersaEnergy — Parte 2: Mapa Energético y Motor de Topología

## 1. Propósito

El **Mapa Energético** será el diferenciador central de VersaEnergy.

Su objetivo no es permitir que el usuario dibuje cajas y líneas decorativas. El objetivo es crear un modelo energético visual, lógico y calculable de una planta, edificio o proceso.

La idea clave es:

```txt
Canvas visual -> Grafo lógico -> Medición -> Balance -> Desviación -> Acción
```

Cada nodo y cada conexión debe tener significado operativo. El sistema debe poder entender qué alimenta a qué, qué mide cada medidor, qué consumo pertenece a cada área, qué se calcula, qué se estima y qué queda sin explicar.

---

## 2. Experiencia esperada

El usuario debe poder construir un modelo como este:

```txt
Red eléctrica
  -> Transformador T1
    -> Tablero principal
      -> Medidor M-001
        -> Área Producción
          -> Equipo Compresor C-01
```

Y luego ver sobre ese mapa:

- consumo kWh,
- demanda kW,
- costo,
- desviación contra línea base,
- calidad de datos,
- pérdidas,
- áreas sin medición,
- consumo no explicado,
- oportunidades de ahorro.

El usuario debe poder seleccionar cualquier nodo y abrir un panel lateral con sus datos, mediciones, relaciones, alertas y acciones.

---

## 3. Capas del mapa

El mapa debe manejar varias capas conceptuales, aunque visualmente se integren en una sola experiencia.

### 3.1. Capa física

Representa la distribución real de energía.

Ejemplos:

- acometida,
- transformador,
- tablero,
- subtablero,
- breaker,
- alimentador,
- motor,
- bomba,
- compresor,
- chiller,
- caldera,
- banco de capacitores,
- generador,
- sistema solar.

### 3.2. Capa organizacional

Representa cómo la empresa entiende su operación.

Ejemplos:

- sitio,
- edificio,
- área,
- proceso,
- línea,
- centro de costo,
- departamento.

### 3.3. Capa de medición

Representa cómo se mide la energía.

Ejemplos:

- medidor físico,
- medidor virtual,
- canal de medición,
- lectura manual,
- lectura importada,
- variable externa,
- fórmula.

### 3.4. Capa analítica

Representa cómo se convierte el dato en gestión.

Ejemplos:

- EnPI,
- línea base,
- objetivo,
- desviación,
- uso significativo de energía,
- acción de ahorro,
- evidencia ISO.

---

## 4. Tipos de nodos iniciales

Los nodos deben tener un tipo claro. Esto permite validar conexiones y calcular balances.

```txt
utility_source        Red eléctrica o fuente externa
renewable_source      Solar, eólica u otra fuente renovable
generator             Generador local
transformer           Transformador
main_switchgear       Tablero o switchgear principal
panel                 Tablero
sub_panel             Subtablero
breaker               Breaker o alimentador
meter                 Medidor físico
virtual_meter         Medidor virtual
area                  Área
process               Proceso
production_line       Línea de producción
equipment             Equipo genérico
motor                 Motor
pump                  Bomba
compressor            Compresor
chiller               Chiller
boiler                Caldera
hvac                  HVAC
battery               Batería
loss_node             Nodo de pérdidas
group                 Agrupador visual/lógico
```

---

## 5. Tipos de conexiones

Las conexiones también deben tener significado. Una línea no es solo una línea.

```txt
feeds           Alimenta energéticamente
measures        Mide un nodo o conexión
belongs_to      Pertenece a un área, proceso o grupo
allocated_to    Asigna consumo a un área/proceso/equipo
derived_from    Se calcula a partir de otros medidores o variables
normalizes_by   Se normaliza con una variable externa
backup_supply   Fuente de respaldo
exports_to      Exporta energía hacia otro punto
losses_to       Representa pérdidas hacia un nodo de pérdidas
```

Ejemplos:

```txt
Transformador T1 --feeds--> Tablero P1
Medidor M-001 --measures--> Tablero P1
Compresor C-01 --belongs_to--> Área Utilities
VM-HVAC --derived_from--> M-MAIN, M-PROD, M-COMP
```

---

## 6. Datos mínimos de un nodo

```ts
interface EnergyNodeData {
  id: string;
  type: EnergyNodeType;
  label: string;
  siteId: string;
  areaId?: string;
  equipmentId?: string;
  meterId?: string;
  energySourceId?: string;
  nominalCapacity?: number;
  nominalCapacityUnit?: string;
  voltageLevel?: string;
  phase?: 'single' | 'three' | 'dc' | 'na';
  status: 'active' | 'inactive' | 'planned' | 'retired';
  measurementCoverage?: 'measured' | 'estimated' | 'calculated' | 'unmetered';
  tags?: string[];
}
```

---

## 7. Datos mínimos de una conexión

```ts
interface EnergyEdgeData {
  id: string;
  type: EnergyEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  energySourceId?: string;
  meterId?: string;
  channelId?: string;
  direction: 'source_to_target' | 'bidirectional';
  lossFactor?: number;
  allocationFactor?: number;
  status: 'active' | 'inactive' | 'planned';
}
```

---

## 8. Paleta de símbolos

La paleta del canvas debe estar ordenada por grupos.

### Fuentes

- Red eléctrica.
- Solar.
- Generador.
- Gas.
- Diésel.

### Distribución eléctrica

- Transformador.
- Tablero.
- Subtablero.
- Breaker.
- Alimentador.

### Medición

- Medidor físico.
- Medidor virtual.
- Sensor.
- Variable externa.

### Operación

- Área.
- Proceso.
- Línea.
- Equipo.
- Carga crítica.

### Utilities

- Compresor.
- Caldera.
- Chiller.
- HVAC.
- Bomba.

---

## 9. Inspector lateral

Al seleccionar un nodo o conexión, debe abrirse un inspector lateral.

### Para nodos

Debe permitir ver y editar:

- nombre,
- código,
- tipo,
- sitio,
- área,
- equipo relacionado,
- medidor relacionado,
- fuente energética,
- unidad,
- capacidad nominal,
- estado,
- tags,
- lecturas recientes,
- calidad de datos,
- alertas,
- acciones relacionadas.

### Para conexiones

Debe permitir ver y editar:

- tipo de conexión,
- nodo origen,
- nodo destino,
- fuente energética,
- medidor asociado,
- canal asociado,
- dirección,
- factor de pérdida,
- factor de asignación,
- estado.

---

## 10. Reglas críticas de validación

1. Un área puede contener equipos, pero no debe alimentar eléctricamente directamente.
2. Un medidor eléctrico no puede medir gas, vapor o agua sin conversión explícita.
3. Un equipo puede estar conectado a más de una fuente solo si existe respaldo, transferencia o generación local.
4. Un medidor virtual debe tener fórmula, unidad, alcance y versión.
5. Las conexiones `feeds` no deben crear ciclos accidentales.
6. Las conexiones `measures` deben apuntar a un nodo o conexión medible.
7. Un medidor puede medir nodo o conexión, pero el alcance debe quedar explícito.
8. Un diagrama publicado queda congelado.
9. Cambiar un diagrama publicado debe crear una nueva versión.
10. Los balances históricos deben saber qué versión del diagrama usaron.
11. Las estimaciones deben distinguirse visualmente de lecturas reales.
12. El usuario debe poder ver qué consumo está medido, calculado, estimado o no explicado.

---

## 11. Versionado de diagramas

El versionado es obligatorio.

Motivo: si el diagrama cambia hoy, no se deben alterar los balances históricos.

Estados sugeridos:

```txt
draft       Versión editable
published   Versión congelada para cálculo/evidencia
archived    Versión histórica no activa
```

Reglas:

1. Solo una versión publicada puede estar activa para un sitio y periodo.
2. Una versión publicada no se edita directamente.
3. Para modificarla, se clona como nuevo draft.
4. Cada balance debe guardar `diagram_version_id`.
5. Cada reporte debe indicar la versión usada.

---

## 12. Overlays visuales

El mapa debe soportar capas visuales activables:

- consumo kWh,
- demanda kW,
- costo,
- emisiones,
- desviación vs baseline,
- calidad de datos,
- criticidad,
- ahorro potencial,
- pérdidas,
- estado de comunicación del medidor.

Convención visual sugerida:

```txt
Verde        Dentro de objetivo
Ámbar        Desviación moderada
Rojo         Desviación crítica
Gris         Sin datos o inactivo
Línea gruesa Mayor flujo de energía
Línea punteada Estimación o relación lógica
```

---

## 13. Motor de topología

El motor de topología debe vivir separado de la UI.

Estructura sugerida:

```txt
src/services/topology-engine/
  graphTypes.ts
  validators.ts
  compiler.ts
  graphQueries.ts
  balanceEngine.ts
  virtualMeterEngine.ts
  topologyVersioning.ts
```

### 13.1. Compiler

Convierte el canvas en un modelo calculable.

Entrada:

```txt
nodes[]
edges[]
meters[]
channels[]
variables[]
```

Salida:

```txt
energyGraph
measurementScopes
balanceTrees
validationIssues
calculationPlan
```

### 13.2. Balance Engine

Debe calcular:

- entrada total,
- consumo medido,
- consumo virtual,
- consumo estimado,
- pérdidas técnicas,
- pérdidas no explicadas,
- balance padre-hijos,
- cobertura de medición.

### 13.3. Virtual Meter Engine

Debe soportar fórmulas como:

```txt
VM_HVAC = M_MAIN - M_PROD - M_COMPRESSORS - M_LIGHTING
VM_LINE_1 = M_PANEL_1 * 0.65
VM_KWH_PER_TON = M_LINE_1_KWH / PRODUCTION_TON
```

Reglas:

1. Toda fórmula declara unidad de salida.
2. Toda fórmula declara periodo de agregación.
3. No debe permitir referencias circulares.
4. Debe mostrar dependencias.
5. Debe registrar versión.
6. Debe indicar si el resultado es medido, calculado o estimado.

---

## 14. Tablas sugeridas

```txt
energy_diagrams
energy_diagram_versions
energy_nodes
energy_edges
energy_node_positions
energy_edge_styles
energy_topology_validation_issues
energy_virtual_meters
energy_virtual_meter_formulas
energy_balance_rules
energy_balance_runs
energy_balance_results
```

Regla: el canvas puede guardar un snapshot JSON para render rápido, pero nodos, conexiones y versiones deben poder consultarse de forma normalizada.

---

## 15. Entregable esperado de esta parte

El diseño del Mapa Energético queda definido como un canvas semántico, versionado y calculable.

El próximo documento debe definir el orden de fases para construir el software con AI, usando entregables pequeños y verificables.
