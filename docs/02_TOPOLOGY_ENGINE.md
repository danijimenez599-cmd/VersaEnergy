# VersaEnergy — Parte 2: Mapa de Energy & Utilities y Motor de Topología

## 1. Propósito

El **Mapa Energético y de Utilities** será el diferenciador central de VersaEnergy.

Su objetivo no es permitir que el usuario dibuje cajas y líneas decorativas. El objetivo es crear un modelo visual, lógico y calculable de cómo fluyen la energía y los utilities críticos dentro de una planta, edificio o proceso.

La idea clave es:

```txt
Canvas visual -> Grafo lógico de utilities -> Medición -> Balance -> Desviación -> Acción
```

Cada nodo y cada conexión debe tener significado operativo. El sistema debe poder entender qué alimenta a qué, qué mide cada medidor, qué consumo pertenece a cada área, qué se calcula, qué se estima, qué retorna, qué se pierde y qué queda sin explicar.

---

## 2. Alcance multi-utility

El motor de topología no debe limitarse a electricidad.

Debe poder modelar, como mínimo:

- electricidad,
- gas natural,
- GLP,
- diésel u otros combustibles,
- vapor,
- condensado,
- aire comprimido,
- agua helada,
- agua caliente,
- agua industrial,
- agua potable,
- agua de proceso,
- refrigeración,
- gases industriales,
- generación solar,
- generación propia,
- baterías o almacenamiento.

Cada utility debe tener:

- unidad principal,
- variables de medición,
- tipos de nodos,
- reglas de balance,
- reglas de pérdidas,
- posibles conversiones,
- medidores físicos o virtuales.

---

## 3. Experiencia esperada

El usuario debe poder construir modelos como estos.

### Ejemplo eléctrico

```txt
Red eléctrica
  -> Transformador T1
    -> Tablero principal
      -> Alimentador a Producción [medidor M-001 anclado al tramo]
        -> Área Producción
          -> Equipo Compresor C-01
```

### Ejemplo aire comprimido

```txt
Compresor C-01
  -> Secador
    -> Tanque pulmón
      -> Header principal de aire [medidor de flujo anclado al tramo]
          -> Línea de producción
```

### Ejemplo vapor

```txt
Caldera B-01
  -> Header de vapor [medidor de vapor anclado a la línea]
      -> Intercambiador de calor
        -> Proceso térmico
          -> Retorno de condensado
```

### Ejemplo agua helada

```txt
Chiller CH-01
  -> Bomba primaria
    -> Header de agua helada [medidor BTU anclado al tramo]
      -> AHU
          -> Área climatizada
```

### Ejemplo gas

```txt
Acometida de gas
  -> Regulador
    -> Línea de gas [medidor de gas anclado al tramo]
      -> Caldera
        -> Producción de vapor
```

El usuario debe poder ver sobre el mapa:

- consumo,
- demanda,
- caudal,
- presión,
- temperatura,
- energía térmica,
- costo,
- emisiones,
- desviación contra línea base,
- calidad de datos,
- pérdidas,
- fugas,
- retornos deficientes,
- áreas sin medición,
- consumo no explicado,
- oportunidades de ahorro.

---

## 4. Capas del mapa

El mapa debe manejar varias capas conceptuales, aunque visualmente se integren en una sola experiencia.

### 4.1. Capa física

Representa la distribución real de energía o utility.

Ejemplos:

- acometida eléctrica,
- transformador,
- tablero,
- subtablero,
- breaker,
- alimentador,
- tubería,
- header,
- manifold,
- válvula,
- regulador,
- bomba,
- compresor,
- secador,
- tanque,
- caldera,
- trampa de vapor,
- intercambiador,
- chiller,
- torre de enfriamiento,
- AHU,
- motor,
- generador,
- sistema solar,
- batería.

### 4.2. Capa organizacional

Representa cómo la empresa entiende su operación.

Ejemplos:

- sitio,
- edificio,
- área,
- proceso,
- línea,
- centro de costo,
- departamento.

### 4.3. Capa de medición

Representa cómo se mide cada utility.

Ejemplos:

- medidor eléctrico,
- medidor de gas,
- medidor de vapor,
- medidor de agua,
- medidor de aire comprimido,
- medidor BTU,
- sensor de presión,
- sensor de temperatura,
- sensor de caudal,
- medidor virtual,
- canal de medición,
- lectura manual,
- lectura importada,
- variable externa,
- fórmula.

Convención actual de VersaEnergy:

- El equipo medidor existe en el árbol de activos para mantenimiento,
  calibración, adjuntos y compatibilidad CMMS.
- El `MeasurementPoint` existe como entidad de datos: unidad, magnitud,
  frecuencia, fuente, acumulador y lecturas.
- El símbolo del medidor en el mapa es una representación visual del punto de
  medición, no un consumidor de energía.
- El símbolo debe anclarse a un punto físico mediante
  `properties.measurement_binding.anchor`.

Formato preferido:

```json
{
  "measurement_binding": {
    "measurement_point_id": "...",
    "role": "boundary",
    "anchor": {
      "type": "edge",
      "id": "edge-id",
      "position": 0.5,
      "side": "line",
      "offset": { "x": 0, "y": -55 }
    }
  }
}
```

Reglas:

- `anchor.type = "edge"` significa que el instrumento mide un tramo físico; su
  alcance para balance se calcula desde el extremo aguas abajo de ese tramo.
- `anchor.type = "node"` significa que el instrumento mide un equipo, header,
  tablero u otro nodo técnico.
- `signal` y `logical` son anotaciones/relaciones de información: no alimentan
  el grafo físico ni deben afectar el recorrido aguas abajo.
- `boundary` se reserva para medidores totalizadores de entrada, revenue o
  frontera de sistema.
- Sensores de presión/temperatura aportan contexto operativo, pero no son
  frontera de balance ni consumo.

### 4.4. Capa analítica

Representa cómo se convierte el dato en gestión.

Ejemplos:

- EnPI,
- línea base,
- objetivo,
- desviación,
- uso significativo de energía,
- acción de ahorro,
- evidencia ISO,
- hallazgo de mantenimiento.

---

## 5. Tipos de nodos iniciales

Los nodos deben tener un tipo claro. Esto permite validar conexiones y calcular balances.

```txt
utility_source             Fuente externa genérica
electric_utility_source    Red eléctrica
gas_source                 Fuente de gas natural o GLP
fuel_source                Diésel u otro combustible
renewable_source           Solar, eólica u otra fuente renovable
generator                  Generador local
battery                    Batería o almacenamiento

transformer                Transformador
main_switchgear            Tablero o switchgear principal
panel                      Tablero
sub_panel                  Subtablero
breaker                    Breaker o alimentador

pipe                       Tubería o línea de distribución
header                     Header principal
manifold                   Manifold
valve                      Válvula
regulator                  Regulador
pump                       Bomba
tank                       Tanque

compressor                 Compresor
dryer                      Secador de aire
air_receiver               Tanque de aire comprimido

boiler                     Caldera
steam_header               Header de vapor
steam_trap                 Trampa de vapor
condensate_return          Retorno de condensado
heat_exchanger             Intercambiador de calor

chiller                    Chiller
cooling_tower              Torre de enfriamiento
ahu                        Unidad manejadora de aire
hvac                       HVAC

meter                      Medidor físico
virtual_meter              Medidor virtual
sensor                     Sensor

area                       Área
process                    Proceso
production_line            Línea de producción
equipment                  Equipo genérico
motor                      Motor
consumer                   Consumidor de utility
loss_node                  Nodo de pérdidas
group                      Agrupador visual/lógico
```

---

## 6. Tipos de conexiones

Las conexiones también deben tener significado. Una línea no es solo una línea.

```txt
feeds             Alimenta energéticamente o suministra utility
flows_to          Flujo físico de utility hacia otro nodo
returns_to        Retorno de condensado, agua o fluido
measures          Mide un nodo o conexión
belongs_to        Pertenece a un área, proceso o grupo
allocated_to      Asigna consumo a un área/proceso/equipo
derived_from      Se calcula a partir de otros medidores o variables
normalizes_by     Se normaliza con una variable externa
backup_supply     Fuente de respaldo
exports_to        Exporta energía hacia otro punto
losses_to         Representa pérdidas hacia un nodo de pérdidas
leaks_to          Representa fuga estimada o detectada
recovers_from     Recupera energía o calor desde otro punto
```

Ejemplos:

```txt
Transformador T1 --feeds--> Tablero P1
Compresor C-01 --flows_to--> Header de aire comprimido
Header vapor --flows_to--> Intercambiador HX-01
Intercambiador HX-01 --returns_to--> Retorno de condensado
Medidor M-001 --measures--> Tablero P1
Medidor vapor MV-01 --measures--> Línea de vapor
Compresor C-01 --belongs_to--> Área Utilities
VM-HVAC --derived_from--> M-MAIN, M-PROD, M-COMP
```

---

## 7. Datos mínimos de un nodo

```ts
interface UtilityNodeData {
  id: string;
  type: UtilityNodeType;
  label: string;
  siteId: string;
  utilityType: UtilityType;
  areaId?: string;
  equipmentId?: string;
  meterId?: string;
  sourceId?: string;
  nominalCapacity?: number;
  nominalCapacityUnit?: string;
  pressureRating?: number;
  pressureUnit?: string;
  temperatureRating?: number;
  temperatureUnit?: string;
  voltageLevel?: string;
  phase?: 'single' | 'three' | 'dc' | 'na';
  status: 'active' | 'inactive' | 'planned' | 'retired';
  measurementCoverage?: 'measured' | 'estimated' | 'calculated' | 'unmetered';
  tags?: string[];
}
```

---

## 8. Datos mínimos de una conexión

```ts
interface UtilityEdgeData {
  id: string;
  type: UtilityEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  utilityType: UtilityType;
  meterId?: string;
  channelId?: string;
  direction: 'source_to_target' | 'target_to_source' | 'bidirectional';
  lossFactor?: number;
  leakFactor?: number;
  allocationFactor?: number;
  status: 'active' | 'inactive' | 'planned';
}
```

---

## 9. Tipos de utility y unidades

```ts
type UtilityType =
  | 'electricity'
  | 'natural_gas'
  | 'lpg'
  | 'diesel'
  | 'steam'
  | 'condensate'
  | 'compressed_air'
  | 'chilled_water'
  | 'hot_water'
  | 'industrial_water'
  | 'potable_water'
  | 'process_water'
  | 'refrigeration'
  | 'industrial_gas'
  | 'solar_generation'
  | 'battery_storage';
```

Unidades típicas:

```txt
Electricidad: kWh, kW, kVA, kvarh, V, A, FP
Gas: m3, Nm3, SCF, BTU, GJ
Vapor: kg, kg/h, ton/h, bar, psi, °C, entalpía
Aire comprimido: Nm3, SCFM, bar, psi, kWh/Nm3
Agua helada: m3, L/s, GPM, TR, TR-h, BTU/h, °C
Agua: m3, L, GPM, presión, temperatura
Combustibles: gal, L, kg, GJ, BTU
Refrigeración: TR, TR-h, kW térmico
```

---

## 10. Paleta de símbolos

La paleta del canvas debe estar ordenada por grupos.

### Fuentes

- Red eléctrica.
- Solar.
- Generador.
- Gas natural.
- GLP.
- Diésel.
- Agua de red.

### Distribución eléctrica

- Transformador.
- Tablero.
- Subtablero.
- Breaker.
- Alimentador.

### Vapor y térmico

- Caldera.
- Header de vapor.
- Trampa de vapor.
- Intercambiador.
- Retorno de condensado.
- Tanque de condensado.

### Aire comprimido

- Compresor.
- Secador.
- Tanque pulmón.
- Header de aire.
- Punto de consumo.

### Agua helada / HVAC

- Chiller.
- Bomba.
- Header.
- AHU.
- Torre de enfriamiento.
- Consumidor térmico.

### Agua y fluidos

- Bomba.
- Tanque.
- Válvula.
- Regulador.
- Línea/tubería.
- Medidor de caudal.

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

---

## 11. Inspector lateral

Al seleccionar un nodo o conexión, debe abrirse un inspector lateral.

### Para nodos

Debe permitir ver y editar:

- nombre,
- código,
- tipo,
- utility,
- sitio,
- área,
- equipo relacionado,
- medidor relacionado,
- fuente,
- unidad,
- capacidad nominal,
- presión nominal,
- temperatura nominal,
- estado,
- tags,
- lecturas recientes,
- calidad de datos,
- alertas,
- acciones relacionadas.

### Para conexiones

Debe permitir ver y editar:

- tipo de conexión,
- utility,
- nodo origen,
- nodo destino,
- medidor asociado,
- canal asociado,
- dirección,
- factor de pérdida,
- factor de fuga,
- factor de asignación,
- estado.

---

## 12. Reglas críticas de validación

1. Un área puede contener equipos, pero no debe alimentar físicamente una utility por sí misma.
2. Un medidor debe ser compatible con el utility que mide.
3. Un medidor eléctrico no puede medir gas, vapor o agua sin una conversión explícita.
4. Una conexión de vapor no puede conectarse directamente a un tablero eléctrico.
5. Una conexión de retorno debe apuntar a una red compatible de retorno.
6. Un equipo puede estar conectado a más de una fuente solo si existe respaldo, transferencia, mezcla o generación local.
7. Un medidor virtual debe tener fórmula, unidad, alcance y versión.
8. Las conexiones `feeds` y `flows_to` no deben crear ciclos accidentales, salvo redes explícitamente definidas como recirculación.
9. Las conexiones `measures` deben apuntar a un nodo o conexión medible.
10. Un medidor puede medir nodo o conexión, pero el alcance debe quedar explícito.
11. Un diagrama publicado queda congelado.
12. Cambiar un diagrama publicado debe crear una nueva versión.
13. Los balances históricos deben saber qué versión del diagrama usaron.
14. Las estimaciones deben distinguirse visualmente de lecturas reales.
15. El usuario debe poder ver qué consumo está medido, calculado, estimado o no explicado.

---

## 13. Versionado de mapas

El versionado es obligatorio.

Motivo: si el mapa cambia hoy, no se deben alterar balances históricos ni evidencias ISO.

Estados sugeridos:

```txt
draft       Versión editable
published   Versión congelada para cálculo/evidencia
archived    Versión histórica no activa
```

Reglas:

1. Solo una versión publicada puede estar activa para un sitio, utility y periodo.
2. Una versión publicada no se edita directamente.
3. Para modificarla, se clona como nuevo draft.
4. Cada balance debe guardar `diagram_version_id`.
5. Cada reporte debe indicar la versión usada.

---

## 14. Overlays visuales

El mapa debe soportar capas visuales activables:

- consumo,
- demanda,
- caudal,
- presión,
- temperatura,
- costo,
- emisiones,
- desviación vs baseline,
- calidad de datos,
- criticidad,
- ahorro potencial,
- pérdidas,
- fugas,
- retorno de condensado,
- eficiencia específica,
- estado de comunicación del medidor.

Convención visual sugerida:

```txt
Verde          Dentro de objetivo
Ámbar          Desviación moderada
Rojo           Desviación crítica, pérdida o fuga
Gris           Sin datos o inactivo
Azul           Electricidad
Morado         Vapor / térmico
Cyan           Agua / frío
Naranja        Gas / combustible
Línea gruesa   Mayor flujo de utility
Línea punteada Estimación o relación lógica
```

---

## 15. Motor de topología

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
  unitConversion.ts
  utilityRules.ts
  topologyVersioning.ts
```

### 15.1. Compiler

Convierte el canvas en un modelo calculable.

Entrada:

```txt
nodes[]
edges[]
meters[]
channels[]
variables[]
utilityTypes[]
conversionFactors[]
```

Salida:

```txt
utilityGraph
measurementScopes
balanceTrees
validationIssues
calculationPlan
utilityCompatibilityMap
```

### 15.2. Balance Engine

Debe calcular por utility:

- entrada total,
- consumo medido,
- consumo virtual,
- consumo estimado,
- pérdidas técnicas,
- fugas estimadas,
- retornos,
- pérdidas no explicadas,
- balance padre-hijos,
- cobertura de medición.

### 15.3. Virtual Meter Engine

Debe soportar fórmulas como:

```txt
VM_HVAC_ELECTRIC = M_MAIN - M_PROD - M_COMPRESSORS - M_LIGHTING
VM_AIR_LINE_1 = FLOW_HEADER * 0.65
VM_STEAM_PROCESS = M_STEAM_MAIN - M_STEAM_OTHER_USERS
VM_KWH_PER_NM3_AIR = COMPRESSOR_KWH / AIR_NM3
VM_KG_STEAM_PER_TON = STEAM_KG / PRODUCTION_TON
```

Reglas:

1. Toda fórmula declara utility de salida.
2. Toda fórmula declara unidad de salida.
3. Toda fórmula declara periodo de agregación.
4. No debe permitir referencias circulares.
5. Debe mostrar dependencias.
6. Debe registrar versión.
7. Debe indicar si el resultado es medido, calculado o estimado.
8. Las conversiones entre utilities deben ser explícitas.

---

## 16. Tablas sugeridas

```txt
utility_types
utility_units
utility_conversion_factors
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

Regla: el canvas puede guardar un snapshot JSON para render rápido, pero utilities, nodos, conexiones y versiones deben poder consultarse de forma normalizada.

---

## 17. Entregable esperado de esta parte

El diseño del Mapa Energético y de Utilities queda definido como un canvas semántico, multi-utility, versionado y calculable.

El próximo documento debe definir el orden de fases para construir el software con AI, usando entregables pequeños y verificables.
