# VersaEnergy — Engineering Blueprint

Fecha inicial: 2026-06-04
Estado: documento vivo canonico de plan, producto, ingenieria y arquitectura.

> Este es el **unico documento de plan vivo** de VersaEnergy. Los documentos
> restantes deben funcionar como documentacion tecnica del software, referencia
> de estado, reglas para AI o contrato de modulo. Si una fase se completa, su
> checklist historico se elimina o se convierte en memoria tecnica aqui.

## 1. Proposito

Este documento define el redisenio conceptual de VersaEnergy para convertirlo
de maqueta funcional en una aplicacion seria de gestion energetica y utilities.
La documentacion y codigo existentes de VersaEnergy son referencia tecnica e
historica, pero no son contrato inmobil. Si contradicen este blueprint o el
arbol nuevo de VersaMaint, se deben revisar y migrar.

VersaEnergy debe compartir con VersaMaint:

- sedes;
- arbol de activos;
- agrupadores operacionales;
- activos mantenibles;
- medidores fisicos;
- measurement points;
- lecturas base cuando corresponda;
- seguridad multi-sede.

VersaEnergy no debe duplicar ese arbol como una verdad paralela. Debe construir
encima una capa energetica satelite para modelar flujos, diagramas, cobertura,
balances, desempeno, oportunidades, M&V y SGEn.

La frase guia:

```txt
VersaMaint sabe que existe y como se mantiene.
VersaEnergy entiende que fluye, como se mide, que se consume,
que se pierde, que se desvia y como se mejora.
```

## 2. Contexto De Diseno

VersaMaint fue redisenado para que el arbol de activos separe claramente:

- `node_role='grouping'`: nodos de sectorizacion, ubicacion, proceso, modulo,
  nave, edificio, sistema organizativo o scope operacional.
- `node_role='maintainable'`: activos mantenibles reales, incluidos equipos,
  infraestructura, instrumentos y medidores fisicos.

Los agrupadores sirven para filtrar, sectorizar y acumular informacion aguas
abajo. No reciben directamente OTs, PM, RCA ni downtime. Los mantenibles reciben
trabajo tecnico.

Energy debe heredar esa claridad:

- un agrupador puede ser frontera energetica, scope de medicion, scope de
  balance o bloque visual;
- un mantenible puede consumir, producir, distribuir, convertir o almacenar
  utilities;
- un medidor fisico es un mantenible del CMMS;
- un MeasurementPoint es una entidad de dato, separada del medidor fisico;
- un diagrama energetico puede partir del arbol, pero no esta obligado a ser
  identico al arbol.

## 3. Principios Rectores

1. **Core-first para activos.** Energy no crea un segundo arbol maestro; crea
   perfiles, grupos y topologias sobre identidades fisicas comunes.
2. **Grafo-first para utilities.** El canvas es una vista; la verdad energetica
   es un grafo versionado.
3. **MeasurementPoint no es medidor fisico.** El medidor fisico se mantiene; el
   MeasurementPoint produce o representa datos.
4. **El arbol sugiere, Energy valida.** El arbol Core/Maint puede proponer
   diagramas, scopes y cobertura, pero el ingeniero energetico valida
   excepciones.
5. **Multi-utility real.** Electricidad, vapor, gas, aire comprimido, agua
   helada, agua industrial, combustibles, generacion y almacenamiento deben ser
   ciudadanos de primera clase.
6. **Balances trazables.** Todo balance debe saber que datos, version de
   diagrama, supuestos, estimaciones y exclusiones uso.
7. **Estimado no es medido.** Lecturas reales, calculadas, estimadas, asignadas
   y faltantes deben distinguirse visual y analiticamente.
8. **SGEn nace de operacion.** El sistema de gestion energetica debe
   alimentarse de mapas, balances, EnPIs, acciones y evidencia real, no de
   formularios decorativos ni textos normativos.
9. **No protocolo industrial directo en frontend.** MQTT, OPC UA, Modbus,
   BACnet u otros protocolos entran por backend/gateway, nunca directo desde
   React.
10. **Versionado obligatorio.** Diagramas publicados y balances usados como
    evidencia no se editan en sitio; se clonan a borrador.

## 4. Separacion De Dominios

### 4.1 VersaMaint

VersaMaint conserva la verdad de:

- empresa y sedes;
- `assets`;
- `node_type`;
- `node_role`;
- `maintainable_kind`;
- jerarquia operacional;
- medidores fisicos como activos mantenibles;
- MeasurementPoints compartidos;
- lecturas operativas base;
- OTs, PM, RCA, inspecciones e inventario;
- `site_access` y permisos por sede.

### 4.2 VersaEnergy

VersaEnergy agrega una capa satelite:

- perfiles energeticos por activo/scope;
- clasificacion consumidor/productor/distribuidor/conversor/almacenamiento;
- sistemas de utility;
- topologias por utility;
- diagramas versionados;
- bindings de MeasurementPoints al grafo;
- reglas de cobertura, excepcion y asignacion;
- balances y resultados;
- EnPIs, baselines y targets;
- estudios energeticos;
- oportunidades y proyectos;
- M&V;
- evidencia SGEn.

## 5. Modelo Conceptual Base

### 5.1 Arbol operacional

Jerarquico, compartido con VersaMaint.

Ejemplo:

```txt
Site ABC
  Planta Norte
    Nave Vasos
      Proceso Termoformado
        Modulo 1
          Linea V-01
            Compresor C-01
            Tablero LP-V01
            Medidor M-KWH-V01
```

### 5.2 Topologia energetica

Grafo dirigido o parcialmente dirigido. Puede usar nodos del arbol como
referencias, pero sus relaciones representan flujo, no pertenencia jerarquica.

Ejemplo:

```txt
Red electrica -> Transformador T1 -> Tablero principal -> Alimentador Linea V-01
                                                   └-> Alimentador Compresores
```

### 5.3 Diagrama

Vista visual/versionada del grafo. Puede ser:

- generado preliminarmente desde el arbol;
- creado desde plantilla;
- editado manualmente por ingeniero;
- publicado como version oficial;
- clonado para cambios.

### 5.4 MeasurementPoint

Entidad de dato:

- utility;
- magnitud;
- unidad;
- fuente;
- frecuencia;
- calidad;
- acumulador/configuracion;
- scope operacional;
- medidor fisico opcional;
- lecturas.

Un MeasurementPoint puede estar asociado a:

- un mantenible;
- un agrupador;
- un nodo del grafo;
- un edge/tramo del grafo;
- una formula;
- una variable externa.

### 5.5 Medidor fisico

Activo mantenible del CMMS:

- requiere calibracion;
- puede tener OTs;
- puede tener PM;
- puede fallar;
- puede tener ubicacion fisica;
- puede estar asociado a uno o mas MeasurementPoints.

## 6. Mapa De Modulos Propuesto

### 6.1 Cockpit Energetico

Objetivo: responder que esta ocurriendo hoy en energia/utilities.

Debe mostrar:

- consumo por utility;
- costo;
- demanda;
- emisiones;
- desviacion contra baseline;
- calidad de datos;
- cobertura de medicion;
- balances con mayor no explicado;
- oportunidades abiertas;
- proyectos en verificacion;
- ahorros verificados;
- SEUs criticos;
- alertas que navegan al modulo exacto.

No debe reemplazar Analytics profundo. Debe ser una pantalla de decision diaria.

### 6.2 Modelo Energetico

Objetivo: aplicar lentes energeticos al arbol Core compartido.

Funciones:

- leer el arbol compartido;
- filtrar por sede, utility, agrupador, mantenible, medidor fisico;
- crear/editar perfil energetico satelite;
- marcar activos energicamente relevantes;
- declarar rol energetico;
- declarar utilities de entrada/salida;
- declarar capacidad, eficiencia nominal, horarios, factores y supuestos;
- asociar activos a sistemas de utility;
- marcar scopes que requieren validacion energetica.

Roles energeticos sugeridos:

- `consumer`: consume una utility.
- `producer`: produce una utility.
- `distributor`: distribuye una utility.
- `converter`: convierte una utility en otra.
- `storage`: almacena energia/utility.
- `measurement_device`: medidor/instrumento fisico.
- `context`: agrupador usado solo como contexto.

Ejemplos:

- caldera: consume gas, produce vapor.
- chiller: consume electricidad, produce agua helada.
- compresor: consume electricidad, produce aire comprimido.
- tablero: distribuye electricidad.
- tanque: almacena fluido.

### 6.3 Medicion

Objetivo: gobernar los MeasurementPoints y la calidad de sus datos.

Funciones:

- alta/edicion de MeasurementPoints compartidos;
- asociacion con medidor fisico CMMS;
- asociacion con scope operacional;
- fuente de datos: manual, file import, API pull, API push, IoT DB, calculado;
- ingestion IoT como capacidad en desarrollo: dejar el punto de conexion
  preparado, pero no prometer protocolo/API definitivo hasta disenarlo;
- frecuencia esperada;
- unidad/magnitud;
- acumuladores y rollover;
- safeguard de acumuladores: una lectura acumulativa no puede ser menor que la
  lectura anterior valida salvo que exista evento explicito de cambio/reset de
  medidor;
- validacion de rangos;
- importacion CSV;
- conciliacion de lecturas;
- calidad de dato;
- trazabilidad de cambios.

Estados de calidad:

- `good`;
- `manual`;
- `calculated`;
- `estimated`;
- `allocated`;
- `delayed`;
- `suspect`;
- `missing`;
- `invalid`.

### 6.4 Mapa Y Topologia

Objetivo: representar y calcular flujos de utilities.

La topologia no es un segundo arbol de activos. Es un grafo energetico
versionado que referencia identidades existentes y les asigna un rol de flujo.

Separacion obligatoria:

```txt
Identidad fisica / logica:
  core_asset | energy_group | external_source | virtual

Rol topologico:
  source | distribution | conversion | storage | load | split | merge |
  meter_anchor | virtual
```

Un `core_asset` puede aparecer como `load`, `conversion`, `distribution` o
`storage` segun su funcion energetica. Un `energy_group` puede aparecer como
`load` agregado, frontera o scope. Un `external_source` representa suministro
externo no mantenible. Un `virtual` permite representar barras, repartos,
tramos, formulas o nodos logicos sin ensuciar el Core Asset Registry.

Capas:

- fisica: equipos, tuberias, cables, headers, tableros, valvulas;
- organizacional: sedes, naves, areas, procesos, lineas;
- medicion: MeasurementPoints, sensores, instrumentos;
- analitica: cobertura, balance, desviacion, oportunidades.

Tipos de diagramas:

- electrico/unifilar;
- vapor/condensado;
- aire comprimido;
- agua helada;
- agua caliente;
- gas/combustibles;
- agua industrial/proceso;
- generacion renovable;
- multi-utility por proceso.

La topologia debe permitir:

- nodos y edges tecnicos;
- nodos que referencian Core assets;
- nodos que referencian Energy groups;
- nodos que referencian fuentes externas;
- nodos virtuales para elementos de distribucion/logica no mantenibles;
- utility por edge;
- direccion de flujo;
- nodos conversores multi-utility;
- medidores/MeasurementPoints embebidos por defecto como anclajes a edge, nodo,
  scope, formula o fuente externa;
- opcion de mostrar medidor como nodo explicito solo cuando representa una
  estacion, banco, tablero de instrumentacion o equipo de medicion relevante;
- relaciones logicas que no afectan flujo;
- versionado draft/publicado;
- validaciones;
- overlays de consumo/cobertura/balance/desviacion.

Reglas de limpieza del arbol:

- No todo elemento de distribucion debe ser Core asset.
- Tableros, transformadores, headers, manifolds o estaciones mantenibles si
  pueden ser Core assets.
- Barras logicas, tramos menores, ramales, splitters, merges o repartos
  analiticos pueden vivir solo en topologia.
- Si un elemento requiere OT, PM, calibracion, repuesto o historial fisico, debe
  vivir en Core/CMMS. Si solo explica flujo o calculo, puede ser virtual.

Fuentes externas:

- Red electrica publica, acometida de gas, agua municipal, proveedor externo,
  contrato renovable, entrega de diesel o factura energetica son
  `external_source`.
- Una fuente externa no recibe OTs ni PM.
- La infraestructura propia asociada a la fuente, como subestacion,
  transformador, tanque, estacion reguladora o tablero principal, si puede ser
  Core asset mantenible.

### 6.5 Generador De Diagramas Preliminares

Objetivo: usar el arbol Core/Maint para proponer un diagrama inicial.

Entrada:

- site;
- agrupador o subarbol;
- utility;
- activos mantenibles con perfil energetico;
- MeasurementPoints asociados;
- medidores fisicos;
- relaciones parent/child;
- plantillas por utility.

Salida:

- diagrama draft;
- nodos propuestos;
- edges inferidos;
- medidores anclados cuando sea claro;
- warnings;
- lista de validaciones pendientes.

Regla:

```txt
El generador no publica. Solo propone.
El ingeniero revisa, corrige y publica.
```

### 6.6 Cobertura De Medicion

Objetivo: saber que tan confiable y completa es la medicion.

Debe calcular por scope/utility/periodo:

- consumo medido directo;
- consumo submedido;
- consumo calculado;
- consumo estimado;
- consumo asignado;
- consumo sin medicion;
- cobertura real;
- cobertura extendida;
- incertidumbre;
- puntos faltantes;
- puntos sospechosos;
- scopes con excepciones.

Estados sugeridos:

- `measured_direct`;
- `measured_subtree`;
- `submetered`;
- `allocated`;
- `estimated`;
- `calculated`;
- `unmeasured`;
- `excluded`;
- `requires_engineer_validation`.

### 6.7 Balances

Objetivo: cerrar entradas, salidas, perdidas y no explicado.

Tipos:

- balance por utility;
- balance por sede;
- balance por agrupador;
- balance por sistema;
- balance por equipo;
- balance de conversor;
- balance multi-utility.

Cada balance debe guardar:

- periodo;
- utility;
- scope;
- version de diagrama;
- MeasurementPoints usados;
- entradas;
- salidas;
- retornos;
- perdidas conocidas;
- estimaciones;
- exclusiones;
- no explicado;
- cobertura;
- incertidumbre;
- resultado versionado.

Ejemplo:

```txt
Entrada medida: 100,000 kWh
Submedicion directa: 72,000 kWh
Estimado por modelo: 18,000 kWh
No explicado: 10,000 kWh
Cobertura real: 72%
Cobertura extendida: 90%
Estado: requiere investigacion
```

### 6.8 Desempeno / EnPI

Objetivo: medir desempeno energetico contra produccion, variables y objetivos.

Debe soportar:

- EnPI referenciales;
- formulas visuales;
- numerador desde MeasurementPoint o balance;
- denominador desde variable de produccion;
- variables significativas;
- regresion simple/multiple;
- baseline versionada;
- target;
- desviacion;
- normalizacion;
- confianza del modelo.

Ejemplos:

- kWh/ton;
- Nm3 aire/unidad;
- kg vapor/lote;
- m3 agua/turno;
- TR-h/m2;
- kWh/hora-maquina.

### 6.9 Centro De Estudios Energeticos

Objetivo: convertir datos en preguntas de ingenieria.

El Centro de Estudios debe vivir como modulo propio (`/estudios`), no como tab
secundario de Desempeno. Desempeno gobierna EnPIs maduros; Estudios gobierna
expedientes tecnicos, auditoria, suficiencia de datos, hallazgos, decisiones e
historico. El objeto principal debe ser un expediente guiado, no carriles
horizontales de analisis.

Preguntas que debe soportar:

- que explica la desviacion de consumo;
- que equipo o scope concentra el no explicado;
- que variable tiene mayor impacto;
- que medidor falta para cerrar un balance;
- que linea es menos eficiente;
- que consumo base ocurre sin produccion;
- que oportunidad tiene mejor payback;
- que SEUs deben priorizarse.

Salida:

- estudio guardado;
- fuentes usadas;
- modelos candidatos;
- supuestos;
- hallazgos;
- confianza;
- decisiones;
- acciones sugeridas;
- evidencia SGEn opcional.

### 6.10 Oportunidades, Acciones Y M&V

Objetivo: cerrar el ciclo de mejora.

Flujo:

```txt
Desviacion / hallazgo / estudio
  -> oportunidad
  -> accion rapida o proyecto
  -> estimacion de ahorro
  -> responsable
  -> implementacion
  -> periodo M&V
  -> ahorro verificado
  -> evidencia
```

Debe manejar:

- ahorro energetico estimado;
- ahorro economico;
- emisiones evitadas;
- inversion;
- payback;
- metodo M&V;
- baseline M&V;
- periodo de reporte;
- evidencia;
- cierre sostenido.

Conexion futura con VersaMaint:

- generar solicitud;
- recomendar OT;
- vincular accion a activo;
- evidenciar reduccion de consumo despues de mantenimiento.

### 6.11 SGEn

Objetivo: operar un sistema de gestion de energia alineado con buenas practicas
profesionales, sin mencionar estandares en la experiencia de usuario y sin
copiar texto propietario.

Debe alimentarse de:

- alcance energetico;
- politica propia;
- revision energetica;
- SEUs;
- objetivos;
- EnPIs;
- mapas publicados;
- balances;
- acciones;
- M&V;
- auditorias internas;
- no conformidades;
- revision por direccion;
- evidencias.

Regla:

```txt
SGEn no es un checklist aislado.
Es la capa de gestion que resume y evidencia el trabajo energetico real.
```

### 6.12 Reportes

Objetivo: comunicar resultados tecnicos y ejecutivos.

Reportes minimos:

- consumo mensual;
- costo y emisiones;
- balance por utility;
- cobertura de medicion;
- desempeno vs baseline;
- EnPI y targets;
- acciones y ahorros;
- M&V;
- reporte SGEn;
- informe ejecutivo por sede;
- informe tecnico por sistema.

### 6.13 Administracion Energetica

Objetivo: configurar reglas energeticas transversales.

Debe incluir:

- utilities habilitados;
- unidades y conversiones;
- factores de emision;
- tarifas;
- periodos energeticos;
- parametros de calidad;
- plantillas de diagramas;
- roles;
- fuentes de datos;
- integraciones.

## 7. Versa Core Asset Registry

### 7.1 Decision arquitectonica

Documento compartido relacionado:
`../VERSA_CORE_ASSET_REGISTRY_BLUEPRINT.md` en la raiz del workspace.

El contrato futuro no debe ser `CMMS -> Energy` ni `Energy -> CMMS`. Debe ser:

```txt
Versa Core Asset Registry
  -> VersaPlatform products / capabilities / limits
  -> VersaMaint profile / hierarchy / maintenance semantics
  -> VersaEnergy profile / groups / topology / energy semantics
```

La identidad fisica de sedes, activos, medidores fisicos y MeasurementPoints
debe vivir en una capa comun de plataforma o en un schema compartido que funcione
como registro maestro. Aunque la primera implementacion pueda partir del schema
actual de VersaMaint, el concepto de producto debe ser "asset registry comun de
Versa".

Matiz importante: si el cliente tiene VersaMaint contratado y activo para la
misma empresa/sede, VersaMaint debe ser el steward operativo y autoritativo para
altas, bajas, movimientos y cambios maestros de activos fisicos. En ese escenario
Energy no crea activos fisicos maestros directamente; genera una solicitud de
alta/adopcion para el gestor de mantenimiento. Energy si puede crear grupos
energeticos, nodos virtuales, topologias y perfiles energeticos.

Si el cliente solo tiene Energy, Energy puede crear activos fisicos en Core
usando una plantilla compatible con VersaMaint para que una adopcion futura por
CMMS sea natural.

Esto resuelve tres escenarios:

1. Cliente compra solo Energy.
2. Cliente compra solo VersaMaint.
3. Cliente compra ambos, en cualquier orden.

### 7.1.1 Rol De VersaPlatform

VersaPlatform debe administrar el estado comercial y operativo de productos:

- si VersaMaint esta activo por empresa/sede;
- si VersaEnergy esta activo por empresa/sede;
- limites y cupos aplicables;
- capabilities disponibles;
- cambios de plan/estado;
- auditoria administrativa.

Energy no debe adivinar si esta solo; debe leer capabilities desde Platform o
desde tablas/RPCs compartidas gobernadas por Platform.

### 7.2 Que contiene Core

Core es el asset registry comun. No tiene que exponerse como un modulo nuevo
independiente dentro de CMMS; puede manifestarse como etiquetas, metadata y
guardas dentro del modulo Activos de VersaMaint y como contrato compartido para
Energy.

Core conserva la verdad compartida de:

- empresas;
- sedes;
- activos fisicos y agrupadores base;
- identidad estable del activo;
- nombre/codigo/tag oficial;
- parent base cuando aplique;
- site;
- estado de vida;
- fabricante/modelo/serie cuando aplique;
- medidores fisicos como activos;
- MeasurementPoints como puntos de dato compartidos;
- relaciones fisicas basicas;
- historico minimo de cambios;
- permisos multi-sede base.

Campos conceptuales:

- `id`;
- `company_id`;
- `site_id`;
- `parent_id`;
- `node_type`;
- `node_role`;
- `maintainable_kind`;
- `name`;
- `code`;
- `status`;
- `lifecycle_state`;
- `source_app`;
- `created_by_app`;
- `last_authoritative_app`;
- `sync_status`;
- timestamps.

### 7.3 Que agrega VersaMaint

VersaMaint agrega semantica de mantenimiento:

- jerarquia operacional CMMS si difiere de la base;
- familia tecnica;
- PM;
- OTs;
- RCA;
- downtime;
- inventario;
- tecnicos;
- permisos y workflows de mantenimiento;
- reglas de mantenibilidad.

### 7.4 Que agrega VersaEnergy

- perfil energetico del activo/scope;
- rol energetico;
- utility ports;
- capacidad/eficiencia nominal;
- parametros de modelo;
- topologia;
- bindings de medicion;
- excepciones;
- balances;
- EnPIs;
- estudios;
- acciones;
- evidencia SGEn.

### 7.5 Agrupadores CMMS vs agrupadores Energy

Los agrupadores de CMMS y Energy pueden coincidir, pero no deben ser la misma
obligacion conceptual.

CMMS agrupa por:

- mantenimiento;
- ubicacion operacional;
- tecnicos;
- inventario;
- PM/RCA;
- proceso productivo.

Energy puede agrupar por:

- tablero;
- alimentador;
- circuito;
- header;
- balance boundary;
- centro de carga;
- sistema de utility;
- SEU;
- EnPI scope;
- reporte energetico.

Ejemplo:

```txt
CMMS:
Nave Vasos
  Linea V-01
    Maquina A
    Maquina B
    Maquina C

Energy:
Tablero LP-03
  Circuito 1
    Maquina A
    Maquina C
  Circuito 2
    Maquina B
    Extractor Nave Vasos
```

Ambos modelos son correctos. Core mantiene la identidad de las maquinas.
VersaMaint y VersaEnergy guardan sus agrupaciones disciplinares.

### 7.6 Deteccion De Productos Activos

Energy no debe adivinar si esta "solo" por ausencia de UI o por si existe una
tabla. Debe leer capacidades/licencias activas por empresa y sede.

Estados por empresa/sede:

- `energy_only`: Energy activo, Maint no activo.
- `maint_only`: Maint activo, Energy no activo.
- `maint_and_energy`: ambos activos en la misma sede.
- `none`: ningun producto operativo para la sede.

Fuente esperada:

- tablas de plataforma `company_products` y `site_products`;
- helper CMMS/Core `fn_site_product_mode(site_id)`;
- plan/licencia de empresa;
- flags por sede cuando un producto este habilitado solo en algunas sedes.

Regla UX:

- si `energy_only`, Energy muestra creacion directa de activos fisicos con
  plantilla compatible con Maint;
- si `maint_and_energy`, Energy muestra solicitud de alta/adopcion hacia Maint;
- si `maint_only`, Energy no aparece salvo previsualizacion comercial o setup;
- si cambia el estado de producto, se recalculan permisos y flujos disponibles.

### 7.7 Creacion De Activos Con Uno O Dos Productos

Recomendacion de producto:

```txt
Si tienes VersaMaint activo en esta sede, el gestor de mantenimiento debe dar de
alta el equipo fisico. Energy puede solicitar el alta, enriquecer la ficha
energetica y proponer cambios, pero Maint gobierna el maestro fisico operativo.
```

#### Cliente solo VersaMaint

1. Usuario crea activo desde VersaMaint.
2. Se crea registro en Core.
3. Se crea/actualiza perfil de mantenimiento.
4. Energy no ve UI del activo hasta que el producto se active, pero el registro
   ya es reutilizable.

#### Cliente solo VersaEnergy

1. Usuario crea activo o agrupador desde Energy.
2. Se crea registro en Core.
3. Se crea/actualiza perfil energetico.
4. La plantilla de alta de equipos fisicos debe ser compatible con VersaMaint:
   nombre, codigo/tag, ubicacion, fabricante, modelo, serie, estado,
   node_type/node_role, maintainable_kind potencial, especificaciones tecnicas
   y adjuntos basicos. Se omiten o dejan inactivos campos propios de
   mantenimiento como PM, planes, repuestos, RCA o criticidad de mantenimiento.
5. Si despues compra VersaMaint, el activo ya existe; Maint agrega perfil,
   jerarquia operativa y reglas de mantenibilidad.
6. Durante adopcion por Maint, el gestor de mantenimiento valida nombre, codigo,
   ubicacion, estado, mantenibilidad y datos tecnicos maestros.

#### Cliente con ambos productos

1. VersaMaint crea y gobierna activos fisicos maestros para sedes donde ambos
   productos estan activos.
2. Energy, si necesita un activo fisico que no existe, crea una solicitud de
   alta/adopcion para Maint, no un activo fisico maestro directo.
3. La solicitud incluye datos energeticos utiles: nombre sugerido, tag,
   ubicacion/scope, utility, potencia/capacidad, medidor asociado, motivo y
   diagrama/topologia donde se necesita.
4. Maint acepta, corrige, fusiona o rechaza. Si acepta, crea/actualiza el activo
   Core y su perfil de mantenimiento.
5. Energy recibe el activo validado y agrega perfil energetico, grupos,
   bindings y topologia.
6. Si Energy necesita una jerarquia distinta, crea una vista/agrupacion
   disciplinar, no duplica el activo fisico.

Regla:

```txt
Con solo Energy, Energy puede crear activos fisicos compatibles con Maint.
Con Energy + Maint activos, Maint centraliza activos fisicos y Energy solicita.
```

### 7.7.1 Campos editables por app

Ambas apps pueden mostrar una ficha del equipo, pero no todos los campos tienen
el mismo dueno.

Cuando VersaMaint esta activo:

- Maint gobierna: nombre oficial, codigo/tag maestro, ubicacion operacional,
  estado de vida, mantenibilidad, familia tecnica, fabricante, modelo, serie,
  criticidad de mantenimiento y baja/movimiento maestro.
- Energy gobierna: utility principal/secundarias, rol energetico, potencia o
  capacidad energetica, eficiencia nominal, puertos de utility, parametros de
  modelo, pertenencia a energy groups, bindings, topologia, coverage y EnPIs.
- Campos compartidos como potencia nominal, capacidad, fabricante/modelo o
  serie pueden ser sugeridos desde Energy, pero si Maint esta activo el cambio
  maestro debe pasar por propuesta/aprobacion del steward de mantenimiento,
  salvo permisos y reglas explicitamente definidos.

Estados sugeridos para cambios originados en Energy sobre campos Core/Maint:

- `accepted`: cambio aplicado directamente por permiso/regla.
- `proposed`: requiere revision de Maint.
- `rejected`: Maint rechazo el cambio.
- `superseded`: otra actualizacion reemplazo la propuesta.

Esto evita que Energy sea una via paralela no gobernada para modificar el
maestro de activos cuando existe un CMMS operativo.

### 7.8 Mecanismo De Acuerdo Y Sincronizacion

La sincronizacion debe ser gobernada por ownership de campos, no bidireccional
ciega.

Tipos de propiedad:

- **Core-owned:** identidad, sede, estado de vida, codigo oficial, datos fisicos
  basicos.
- **Maint-owned:** PM, OTs, RCA, familia tecnica, reglas de mantenimiento,
  jerarquia CMMS si es especifica y stewardship maestro cuando el cliente tiene
  VersaMaint activo.
- **Energy-owned:** perfiles energeticos, energy groups, topology, bindings,
  balances, EnPI, M&V.
- **Shared but governed:** MeasurementPoints, medidores fisicos, potencia/capacidad
  nominal, aliases y tags. Si Maint esta activo, cambios maestros originados en
  Energy pueden convertirse en propuestas para revision.

Cada cambio relevante debe generar evento:

- `asset.created`;
- `asset.updated`;
- `asset.lifecycle_changed`;
- `asset.moved`;
- `asset.decommissioned`;
- `measurement_point.created`;
- `measurement_point.updated`;
- `measurement_binding.changed`.

Energy reacciona a cambios Core:

- si un activo se desactiva, no se borra de Energy;
- se marca como fuera de servicio desde fecha efectiva;
- se excluye de balances futuros salvo override;
- se conserva historico;
- se alerta si participa en topologias publicadas;
- se solicita revisar diagramas, coverage y EnPIs afectados.

Maint reacciona a cambios Core/Energy:

- si Energy solicita un activo fisico, Maint puede crearlo, fusionarlo,
  corregirlo o rechazarlo;
- si Energy solicita un medidor fisico en una sede con Maint activo, Maint debe
  darlo de alta/adoptarlo como activo mantenible; si el medidor nacio cuando el
  cliente solo tenia Energy, Maint puede adoptarlo y habilitar PM/calibracion;
- si Energy crea un MeasurementPoint, Maint puede verlo como punto disponible
  para PM predictivo/inspecciones, pero no esta obligado a usarlo.

### 7.9 Deteccion De Duplicados Y Merge

Cuando una app crea un activo que parece existir:

- comparar `site_id`;
- codigo/tag;
- nombre normalizado;
- serie;
- fabricante/modelo;
- ubicacion;
- tipo;
- medidor fisico asociado.

Estados sugeridos:

- `unique`;
- `possible_duplicate`;
- `confirmed_duplicate`;
- `merged`;
- `rejected_match`.

El merge debe ser asistido, no automatico salvo coincidencia fuerte. Debe
conservar aliases y trazabilidad.

### 7.10 MeasurementPoints Compartidos

Los MeasurementPoints deben ser comunes, con perfiles por app.

Core MeasurementPoint:

- identidad;
- tag;
- nombre;
- site;
- utility;
- quantity;
- unit;
- source;
- frecuencia;
- estado;
- dominios/tags de uso;
- asset/scope fisico cuando aplique;
- medidor fisico opcional.

Fuentes de dato:

- `manual`: captura manual desde UI.
- `file_import`: importacion CSV/Excel u otro archivo validado.
- `api_pull`: Energy consulta una API externa.
- `api_push`: sistema externo envia lecturas a Energy.
- `iot_db`: lectura desde una base/gateway IoT externo.
- `calculated`: formula calculada por Energy.

Estado de IoT:

```txt
En desarrollo. Energy debe dejar preparado el "punto donde enchufar" ingestion
IoT/API, pero el protocolo, gateway, autenticacion, payload y proceso definitivo
se disenaran en una fase posterior.
```

Dominios/tags recomendados:

- `energy`: punto energetico para balances, EnPI, cobertura, M&V o SGEn.
- `maintenance_condition`: condicion para mantenimiento predictivo/inspeccion.
- `production`: variable de produccion o denominador operativo.
- `quality`: calidad de producto/proceso.
- `environmental`: emisiones, clima, temperatura ambiente u otra variable
  ambiental.
- `safety`: variable de seguridad/proteccion.
- `commercial`: facturacion, tarifa o frontera fiscal.
- `custom`: uso definido por cliente.

Regla: los dominios deben ser multi-tag. Un mismo MeasurementPoint puede ser
`energy` y tambien `maintenance_condition`, por ejemplo temperatura de chiller
usada en eficiencia y en condicion operativa. El tag `energy` no convierte al
punto en exclusivo de Energy; solo declara que Energy lo adopta o puede
adoptarlo para su capa analitica.

Safeguard para acumuladores:

- Si `measurement_type='accumulator'`, la nueva lectura valida debe ser mayor o
  igual que la lectura anterior valida del mismo MeasurementPoint.
- Puede bajar solo si existe un evento explicito: cambio de medidor, reset,
  rollover configurado, correccion auditada o reemplazo de canal.
- El evento debe guardar fecha efectiva, lectura inicial nueva, motivo,
  usuario/fuente y medidor fisico involucrado si aplica.
- La UI puede advertir, pero la guarda debe vivir en servicio/RPC/DB para que
  tambien aplique a importaciones, API e IoT.

VersaMaint puede agregar:

- uso para PM predictivo;
- umbrales de mantenimiento;
- inspecciones;
- calibracion ligada a medidor fisico;
- OTs por anomalia si se define.

VersaEnergy puede agregar:

- binding a energy group;
- binding a topology node/edge;
- rol de cobertura;
- boundary/submeter/sensor/allocation;
- incertidumbre;
- reglas de calidad;
- inclusion/exclusion en balances.

Regla:

```txt
Un MeasurementPoint creado en Energy debe quedar disponible para Maint.
Un MeasurementPoint creado en Maint debe quedar disponible para Energy.
Cada app decide si lo adopta en su perfil.
```

### 7.11 Anclaje De Medicion En Energy

Energy debe permitir que un MeasurementPoint se ancle a:

- mantenible fisico;
- agrupador Core/CMMS;
- agrupador Energy;
- nodo de topologia;
- edge/tramo de topologia;
- formula;
- variable externa.

Esto permite que los medidores esten embebidos en equipos, agrupadores o
fronteras energeticas que no existen como agrupadores CMMS.

Entidad conceptual: `energy_measurement_bindings`.

Campos:

- `measurement_point_id`;
- `binding_type`: asset, core_group, energy_group, topology_node,
  topology_edge, formula, external;
- `asset_id`;
- `energy_group_id`;
- `topology_node_id`;
- `topology_edge_id`;
- `role`: boundary, submeter, sensor, allocation_input, calculated;
- `valid_from`;
- `valid_to`;
- `requires_validation`;
- `notes`.

### 7.12 Datos que Energy no debe duplicar

- identidad fisica de activos;
- medidores fisicos como inventario paralelo;
- MeasurementPoints comunes;
- estado de vida compartido;
- permisos multi-sede base.

Energy si puede duplicar/versionar snapshots para evidencia historica, pero no
como fuente maestra editable.

## 8. Entidades Satelite Propuestas

Nombres tentativos, sujetos a revision:

### 8.1 `energy_asset_profiles`

Perfil energetico para un asset de Core.

Campos conceptuales:

- `asset_id`;
- `company_id`;
- `site_id`;
- `energy_role`;
- `primary_utility`;
- `input_utilities`;
- `output_utilities`;
- `utility_ports`;
- `rated_capacity`;
- `rated_efficiency`;
- `model_parameters`;
- `requires_energy_validation`;
- `notes`;
- timestamps.

### 8.2 `energy_measurement_profiles`

Perfil energetico de MeasurementPoint compartido.

Campos conceptuales:

- `measurement_point_id`;
- `utility`;
- `quantity`;
- `unit`;
- `expected_frequency`;
- `energy_semantics`;
- `coverage_role`;
- `uncertainty_class`;
- `validation_rules`;
- `domains`;
- `source_status`;
- `notes`.

### 8.2.1 `measurement_point_lifecycle_events`

Eventos auditados que explican cambios no normales en una serie.

Casos:

- cambio de medidor fisico;
- reset de contador;
- rollover configurado;
- correccion auditada;
- reemplazo de canal;
- cambio de multiplicador/CT/PT;
- cambio de fuente de datos.

Campos conceptuales:

- `measurement_point_id`;
- `physical_meter_asset_id`;
- `event_type`;
- `effective_at`;
- `previous_reading`;
- `new_initial_reading`;
- `reason`;
- `created_by`;
- `source_app`;
- `evidence_attachment_id`;
- timestamps.

### 8.3 `energy_topologies`

Grafo logico por site/utility/scope.

Campos:

- `site_id`;
- `scope_asset_id`;
- `utility`;
- `name`;
- `status`;
- `current_version_id`;
- `created_by`;
- timestamps.

### 8.4 `energy_topology_versions`

Version congelada o borrador.

Campos:

- `topology_id`;
- `version_number`;
- `status`: draft, published, archived;
- `graph_hash`;
- `published_at`;
- `published_by`;
- `change_notes`.

### 8.5 `energy_topology_nodes`

Nodo tecnico del grafo.

Puede referenciar:

- asset Core;
- agrupador Core;
- energy group;
- nodo virtual;
- fuente externa;
- anotacion.

Campos conceptuales:

- `version_id`;
- `node_kind`;
- `asset_id`;
- `label`;
- `utility`;
- `energy_role`;
- `properties`;
- posicion visual.

### 8.6 `energy_groups`

Agrupadores propios de Energy. No reemplazan agrupadores Core/CMMS; representan
fronteras o vistas energeticas.

Tipos sugeridos:

- `load_center`;
- `utility_system`;
- `balance_boundary`;
- `measurement_scope`;
- `enpi_scope`;
- `seu`;
- `reporting_group`;
- `topology_group`;
- `custom`.

Campos:

- `company_id`;
- `site_id`;
- `parent_energy_group_id`;
- `name`;
- `code`;
- `group_type`;
- `utility`;
- `source`: manual, generated_from_core, generated_from_topology;
- `status`;
- `requires_validation`;
- `notes`.

### 8.7 `energy_group_members`

Membresia flexible de agrupadores Energy.

Puede incluir:

- asset Core;
- agrupador Core;
- otro energy group;
- topology node;
- topology edge;
- MeasurementPoint.

Campos:

- `energy_group_id`;
- `member_type`;
- `asset_id`;
- `core_group_asset_id`;
- `child_energy_group_id`;
- `topology_node_id`;
- `topology_edge_id`;
- `measurement_point_id`;
- `allocation_factor`;
- `valid_from`;
- `valid_to`;
- `notes`.

### 8.8 `energy_topology_edges`

Relacion de flujo.

Campos:

- `version_id`;
- `source_node_id`;
- `target_node_id`;
- `utility`;
- `edge_kind`: cable, pipe, busbar, duct, logical, signal;
- `flow_direction`;
- `properties`;
- perdida estimada;
- factor de asignacion.

### 8.9 `energy_measurement_bindings`

Relacion entre MeasurementPoint y topologia.

Campos:

- `measurement_point_id`;
- `version_id`;
- `binding_type`: node, edge, scope, formula, external;
- `node_id`;
- `edge_id`;
- `scope_asset_id`;
- `role`: boundary, submeter, sensor, context, allocation_input;
- `coverage_semantics`;
- `anchor_properties`;
- `requires_validation`;
- `notes`.

### 8.10 `energy_scope_exceptions`

Excepciones de cobertura.

Ejemplos:

- medidor mide modulo 1 excepto tres equipos;
- medidor cubre dos areas;
- consumo se asigna 70/30;
- equipo huerfano se excluye del balance preliminar;
- medicion requiere validacion de ingeniero.

Campos:

- `scope_asset_id`;
- `measurement_point_id`;
- `included_asset_ids`;
- `excluded_asset_ids`;
- `allocation_rules`;
- `reason`;
- `validated_by`;
- `validated_at`;

## 9. Reglas De Negocio Clave

### 9.1 Scope de medicion

Si un MeasurementPoint tiene scope en agrupador:

```txt
Semantica por defecto: mide el subarbol aguas abajo.
```

Pero Energy puede declarar excepciones:

- exclusiones;
- inclusiones externas;
- reparto;
- estimacion;
- validacion pendiente.

### 9.2 Medicion en equipo

Si un MeasurementPoint apunta a mantenible:

```txt
Semantica por defecto: mide ese mantenible.
```

Puede haber excepciones, por ejemplo un medidor en tablero de equipo que tambien
incluye auxiliares.

### 9.3 Medidor fisico asociado

Un MeasurementPoint puede referenciar un medidor fisico mantenible.

Eso permite:

- mantenimiento/calibracion en CMMS;
- lectura/calidad en Energy;
- trazabilidad entre falla de medidor y calidad de dato.

### 9.4 Topologia vs arbol

El arbol es pertenencia operacional.
La topologia es flujo energetico.

No siempre coinciden. Energy debe soportar la diferencia sin contaminar el CMMS.

### 9.5 Diagramas preliminares

Un diagrama generado desde el arbol inicia con estado:

```txt
draft + requires_engineer_validation
```

Nunca debe usarse para balance oficial hasta ser validado/publicado.

### 9.6 Balances oficiales

Un balance oficial debe referenciar:

- version de topologia;
- periodo;
- fuentes de datos;
- supuestos;
- exclusiones;
- usuario que ejecuto;
- estado de calidad.

### 9.7 Acciones y mantenimiento

Energy no debe crear OTs directas sin una decision explicita futura.
Por ahora, el flujo recomendado es:

```txt
hallazgo energetico -> oportunidad -> recomendacion / solicitud CMMS
```

La OT, si se crea, debe apuntar a un mantenible CMMS, no a un agrupador.

## 10. Flujos Principales

### 10.1 Onboarding energetico de una sede

```txt
1. Seleccionar sede.
2. Leer arbol Core/Maint.
3. Detectar agrupadores, mantenibles, medidores fisicos y MeasurementPoints.
4. Sugerir utilities relevantes.
5. Crear perfiles energeticos minimos.
6. Proponer diagramas por utility.
7. Marcar huecos y validaciones pendientes.
8. Ingeniero revisa y publica primera version.
9. Energy calcula cobertura inicial.
10. Energy propone balances iniciales.
```

### 10.2 Crear un MeasurementPoint

```txt
1. Seleccionar utility y magnitud.
2. Seleccionar fuente de dato.
3. Seleccionar scope: agrupador, mantenible, edge, node o formula.
4. Asociar medidor fisico si existe.
5. Definir frecuencia, unidad, acumulador y reglas de calidad.
6. Guardar.
7. Energy actualiza cobertura.
```

### 10.3 Crear diagrama desde arbol

```txt
1. Seleccionar sede, utility y agrupador raiz.
2. Motor lee perfiles energeticos y MeasurementPoints.
3. Genera nodos y edges preliminares.
4. Ancla medidores cuando la inferencia sea segura.
5. Marca conexiones inciertas.
6. Usuario corrige.
7. Validaciones pasan.
8. Publicar version.
```

### 10.4 Ejecutar balance

```txt
1. Seleccionar scope, utility, periodo y version de topologia.
2. Resolver MeasurementPoints.
3. Clasificar datos medidos/calculados/estimados/asignados.
4. Calcular entrada, salida, retorno, perdida y no explicado.
5. Calcular cobertura e incertidumbre.
6. Guardar resultado.
7. Generar hallazgos si hay desviaciones.
```

### 10.5 Convertir desviacion en mejora

```txt
1. Balance/EnPI/estudio detecta hallazgo.
2. Usuario acepta crear oportunidad.
3. Se estima ahorro, costo, inversion y confianza.
4. Se decide accion rapida o proyecto.
5. Se implementa.
6. Se define M&V.
7. Se verifica ahorro.
8. Se cierra con evidencia.
```

## 11. Excepciones Que Deben Soportarse

Casos reales esperados:

- un medidor mide un modulo excepto tres maquinas;
- un medidor mide cargas en dos agrupadores distintos;
- un tablero alimenta equipos fuera de su rama CMMS;
- un medidor fisico alimenta varios MeasurementPoints;
- un MeasurementPoint calculado usa otros puntos;
- una lectura manual cubre un periodo irregular;
- una formula estima consumo de equipo sin medicion;
- un retorno de condensado no esta medido;
- una fuga se modela como perdida estimada;
- un equipo conversor tiene entrada y salida de utilities distintas;
- una medicion contable no coincide con la topologia fisica.

Regla:

```txt
Core/Maint no se deforma para resolver excepciones energeticas.
Energy guarda excepciones, supuestos y validacion.
```

## 12. Relacion Con La Maqueta Actual

Piezas rescatables:

- shell asset-tree-first;
- canvas React Flow;
- topology engine;
- measurement engine;
- balance sheet engine;
- EnPI engine;
- energy study engine;
- acciones/proyectos;
- SGEn workspace;
- reportes CSV iniciales;
- idea de diagramas versionados.

Piezas que deben revisarse:

- `assets_compat` como fuente futura;
- `asset_type` como contrato;
- `energy_areas` / `energy_equipment` como arbol paralelo;
- MeasurementPoints con `target_type/target_id` legacy;
- IoT como nodo visual en vez de fuente de dato;
- balances que no dependan de version de topologia publicada;
- duplicacion de conceptos ya existentes en VersaMaint.

Piezas que deben eliminarse o migrarse:

- simulacion de tablas CMMS dentro de Energy como verdad de producto;
- reglas rigidas que asuman solo plant/area/system/equipment;
- cualquier dependencia futura de `asset_type`.

## 13. Roadmap Vivo

Esta seccion concentra todo el plan pendiente. No crear documentos paralelos de
plan salvo que el usuario lo pida explicitamente; si se necesita detalle
temporal para una fase larga, al cerrarla se integra aqui y se elimina el plan
auxiliar.

### ✅ Fase E0 — Blueprint y decisiones

- [x] Crear este documento.
- [x] Discutir contrato Core/Maint/Energy.
- [x] Decidir si Core sera schema compartido real, extraccion del schema actual de
  VersaMaint o servicio de sincronizacion entre bases durante transicion.
- [x] Definir ownership de campos y eventos de sincronizacion.
- [x] Decidir entidades satelite.
- [x] Definir que se conserva de la maqueta.
- [x] Definir que se migra o elimina.

### ✅ Fase E1 — Core Asset Registry y creacion compartida

- [x] Modificar/extraer en VersaMaint el contrato de activos fisicos comunes
  como primera implementacion del Core Asset Registry.
- No crear un modulo separado de "Core" dentro de CMMS salvo decision futura;
  comenzar exponiendo metadata/etiquetas de asset registry dentro del modulo
  Activos existente.
- [x] Definir capacidades por empresa/sede con `company_products`,
  `site_products` y `fn_site_product_mode(site_id)`.
- [x] Definir cola backend `asset_registry_requests` para solicitar
  alta/adopcion/cambio cuando Maint esta activo.
- [x] Definir servicio Energy para leer `assets` Core primero y usar
  `assets_compat` solo como fallback temporal.
- [x] Definir servicio Energy para crear en `assets` Core cuando la sede esta
  `energy_only`, o crear `asset_registry_requests` cuando Maint gobierna.
- [x] Definir RPC/servicio comun para aprobar solicitudes cuando Maint si esta
  activo.
  - CMMS/Core expone `fn_approve_asset_registry_request_tx` para aprobar,
    crear, adoptar, fusionar o actualizar activos fisicos y MeasurementPoints.
  - CMMS/Core expone `fn_reject_asset_registry_request_tx` para rechazar con
    nota obligatoria.
  - Energy queda como originador de solicitudes cuando Maint gobierna; la
    decision maestra vive en Maint/Core.
- [x] Definir perfiles por app: Maint profile y Energy profile
  (`energy_asset_profiles` como satelite inicial).
- [x] Definir recommendation UX: si Maint esta activo, Energy sugiere que altas de
  equipos fisicos las haga el gestor de mantenimiento.
- [x] Definir estados de vida y reglas de historico.
  - `assets.status` representa vida fisica: `active`, `standby`,
    `decommissioned`.
  - `asset_registry_requests.status` representa decision:
    `pending`, `approved`, `rejected`, `merged`, `cancelled`.
  - `asset_registry_events` conserva historial append-only para solicitudes,
    decisiones, activos, MeasurementPoints y medidores.
- [x] Definir eventos de sincronizacion.
  - E1 deja contrato de eventos: `sync_published`, `sync_applied` y
    `sync_conflict`.
  - La sincronizacion runtime se implementara en fases posteriores; E1 deja
    memoria y schema para no perder trazabilidad.
- [x] Definir deduplicacion y merge asistido.
  - No es flujo normal en `maint_and_energy`, porque Energy solo solicita y no
    crea duplicados fisicos.
  - Aplica a adopcion posterior de clientes `energy_only`, imports masivos,
    solicitudes contra activos existentes y fusiones administrativas.
- [x] Definir adoption flow: activo creado en una app y enriquecido por la otra.
  - `energy_only`: Energy puede crear activo Core compatible CMMS y perfil
    satelite.
  - Al activar Maint despues, la adopcion se resuelve con
    `asset_registry_requests` tipo `adopt_physical_asset` o
    `merge_physical_asset`.
  - `energy_asset_profiles` enriquece el activo sin cambiar su identidad
    fisica.
- [x] Definir dominios/tags de MeasurementPoints compartidos con
  `measurement_points.domains`.
- [x] Definir safeguard de acumuladores con evento auditado de cambio/reset de
  medidor.
  - `fn_record_measurement_reading_tx` registra lecturas modernas.
  - Trigger en `measurement_readings` bloquea retrocesos de
    `accumulator/counter` salvo `meter_reset`, `meter_changed`,
    `meter_rollover` o `manual_correction`.
  - Los eventos se escriben en `asset_registry_events`.

### ✅ Fase E2 — Contrato compartido Core -> Energy

- [x] Definir lectura canonica de assets Core.
- [x] Definir lectura canonica de MeasurementPoints Core.
- [x] Definir modelo de medidor fisico.
- [x] Definir permisos y site scope.
  - `site_access` y `fn_user_can_access_site(user_id, site_id)` quedan como
    contrato local compatible con CMMS.
  - Las tablas Core/mock (`assets`, `energy_asset_profiles`,
    `measurement_points`, `measurement_readings`,
    `asset_registry_requests`, `asset_registry_events`) filtran por sede.
  - Mientras no existan filas `site_access`, Energy mantiene fallback de
    desarrollo por empresa; cuando se configuren filas, el scope manda.
- [x] Documentar invariantes.
  - Invariantes vigentes en `docs/modules/CORE_ASSET_REGISTRY.md`.

### ✅ Fase E3 — Schema satelite Energy

- [x] Redisenar `energy_asset_profiles`.
  - Se agregan estado/clase energetica, capacidades nominales, relevancia para
    baseline, tags y notas.
- [x] Agregar `energy_groups` y `energy_group_members`.
  - Grupos Energy pueden diferir de agrupadores CMMS y representar fronteras,
    zonas de medicion, lineas, proyectos o grupos topologicos.
- [x] Agregar perfiles de MeasurementPoint si aplica.
  - `energy_measurement_point_profiles` define semantica de lectura,
    agregacion, frecuencia esperada y perfil de validacion.
- [x] Agregar topologias/versiones/nodos/edges/bindings/excepciones.
  - Se evoluciona `energy_diagrams` como topologia versionada.
  - Nodos/edges aceptan semantica energetica y referencias Core opcionales.
  - `energy_measurement_bindings` declara bindings formales a asset,
    energy_group, topology_node, topology_edge, formula o external.
  - `energy_scope_exceptions` documenta excepciones de medicion/alcance sin
    deformar el arbol CMMS.
- [x] Definir RLS.
  - Tablas satelite usan `fn_user_can_access_site`.
- [x] Seed minimo coherente.
  - Seed crea grupos Energy demo, perfiles de MeasurementPoints y bindings
    primarios.

### ✅ Fase E4 — Arbol compartido en Energy

- [x] Reemplazar lectura primaria `assets_compat` por `assets` Core.
- [x] Mostrar/transportar `node_type/node_role/maintainable_kind` en el arbol
  Energy.
- [x] Filtros por grouping/maintainable/meter.
  - El arbol Energy permite aislar agrupadores, mantenibles y medidores
    fisicos sin cambiar la jerarquia Core.
  - Energy es multitenant igual que CMMS: toda lectura debe quedar filtrada por
    sede y por `fn_user_can_access_site`.
- [x] Lentes disponibles por rol energetico.
  - Agrupadores no se tratan como equipos con ficha tecnica mantenible.
  - Mantenibles muestran especificaciones; medidores fisicos muestran lente de
    medicion y conservan cualidades de equipo mantenible.
  - El seed global de activos lo gobierna CMMS/Core. Energy siembra capas
    satelite encima: perfiles, groups, bindings, topologia y excepciones.
  - Los agrupadores Core se importan como scopes disponibles, pero moverlos
    desde Energy no modifica el arbol fisico. La reorganizacion energetica se
    hace con `energy_groups`, topologia y diagramas.

### ✅ Fase E5 — Medicion compartida

- [x] Alinear UI de MeasurementPoints con contrato Core.
- [x] Asociar medidor fisico opcional.
  - Un MeasurementPoint puede tener `physical_meter_asset_id` si existe un
    medidor fisico mantenible.
  - Un MeasurementPoint tambien puede existir sin medidor fisico cuando el dato
    viene de lectura operacional, estimacion, formula, API futura, IoT futuro o
    integracion externa.
- [x] Asociar scope operacional Core o Energy group.
  - El scope medido siempre debe ser explicito aunque no exista medidor fisico.
  - El scope puede ser un activo mantenible, agrupador Core/CMMS, Energy group,
    nodo/edge de topologia, formula o fuente externa.
- [x] Implementar dominios/tags de uso (`energy`, `maintenance_condition`,
  `production`, etc.).
- [x] Implementar safeguard de acumuladores: no aceptar lectura menor que anterior
  valida sin evento de cambio/reset/rollover/correccion.
- [x] Definir eventos de ciclo de vida de MeasurementPoint/medidor.
- [x] Calidad de datos.
- [x] Fuente vigente de captura: ingreso manual.
  - La UI y validaciones de E5 deben priorizar captura manual trazable.
  - File import, API pull/push, IoT DB/gateway y calculated quedan como
    capacidades disenadas pero **EN DESARROLLO**.
  - E5 debe dejar placeholders/contrato de enchufe para esas fuentes futuras sin
    prometer ingestion productiva ni decidir protocolo, gateway o payload final.

### ✅ Fase E6 — Topology engine 2.0

> **Estado:** completada y verificada el 2026-06-04. Incluye E6-A..E6-E:
> migracion `00030_e6_topology.sql`, compiler por utility, validaciones
> draft/publish, generador preliminar acotado y prueba end-to-end electrico +
> vapor.

- Adaptar nodos/edges a identidad y rol separados, **sobre `00028` (aditivo)**.
  - Identidad por **FKs tipadas**: `asset_id` | `energy_group_id` |
    `energy_source_id` (o ninguna = `virtual`), con `CHECK` de identidad unica y
    columna generada `identity_kind`. **No** usar `identity_type/identity_id`
    polimorficos.
  - **Un solo `energy_role` canonico** (perfil + nodo): `source`,
    `distribution`, `conversion`, `storage`, `load`, `junction`, `virtual`
    (+ `instrument` solo si el medidor es nodo explicito). `split`/`merge` se
    derivan del grafo; `meter_anchor` no existe (es un binding).
  - `load`, `conversion`, `distribution` pueden ser Core asset, Energy group o
    nodo virtual segun convenga, sin ensuciar el arbol CMMS.
- Tratar fuentes externas como **entidad** `energy_sources` (proveedor, cuenta,
  poder calorifico HHV/LHV, factor de emision, tarifa). El nodo `external_source`
  solo la referencia. No mantenibles salvo infraestructura propia en Core.
- Medidores **embebidos por defecto** como anclajes (binding); nodo explicito
  solo para estaciones/bancos/tableros de instrumentacion. Medidor fisico ≠
  MeasurementPoint ≠ binding.
- **Conversores multi-utility con puertos** (in/out por utility) y modelo de
  conversion (`rated_efficiency`, `basis`). Energia termica = cantidad
  **calculada** con MeasurementPoints companion (flujo + T/entalpia); el aire se
  balancea en flujo/fuga (kWh/Nm3 es EnPI, no acumulador); combustibles batch por
  inventario.
- **Grupos** como conjunto/scope reutilizable; membresia en
  `energy_group_members` (no en el dibujo); **un solo boundary primario por
  (grupo, utility)**; reconciliacion contra Core para evitar arbol paralelo.
- Generador preliminar **acotado**: nodos + contencion + anclas obvias; aristas
  de flujo solo como sugerencia (nunca inferir flujo de la contencion); `draft` +
  `requires_engineer_validation`; no publica ni calcula balance oficial.
- Validaciones en **dos niveles**: `validateDraft` (warnings, permisivo) vs
  `validateForPublish` (bloqueantes: tag, utility, medidor, scope, boundary
  duplicado, fuente futura productiva, conversor sin in/out). Mover R13 a
  publish-time.
- Versionar publish/clone; balances fijan version publicada por nivel.

### ✅ Fase E6.5 — Drill down topologico

- Implementar navegacion por niveles de diagrama.
  - Un nodo puede abrir un diagrama hijo.
  - Un Energy group o Core agrupador puede tener topology propia.
  - Breadcrumbs de navegacion y retorno al diagrama padre.
- Mantener continuidad de medicion.
  - MeasurementPoints embebidos en nivel padre pueden propagarse como contexto
    al hijo.
  - Un nodo agregado puede mostrar cobertura/resumen de sus hijos.
- Mantener versionado por nivel.
  - Cada diagrama hijo debe tener estado `draft/published`.
  - Cambios en hijos no deben invalidar silenciosamente balances publicados del
    padre; deben crear advertencia o nueva version.
- Preparar rollups visuales.
  - Consumo, cobertura, no explicado y calidad de datos por nodo agregado.
  - El calculo formal de balances queda en E7.
- E6.5-data:
  - Los `child_block` pueden cargar `e65_data` transitorio desde
    `energy_groups`, `energy_measurement_bindings`, `measurement_points` y
    `measurement_readings`.
  - `e65_data` no es mock ni fixture de UI: es un overlay calculado en runtime
    desde Supabase y se elimina antes de guardar, publicar o versionar el
    diagrama.
  - La vista puede mostrar medidor de frontera, submedicion, residual preliminar,
    cobertura operativa, medidores y preview compacto de hijos.
  - Este overlay no se guarda en el JSONB del diagrama ni en snapshots; se
    recalcula al cargar.
  - Si no existe `energy_group_id` explicito ni metadata de scope confiable, no
    se hace matching por nombre ni se inventan numeros.
  - No sustituye E7: no resuelve excepciones, incertidumbre, asignaciones,
    rollups versionados ni balance oficial.

> **Estado:** completada como E6.5-lite + E6.5-data visual. La navegacion
> drill-down, `child_block`, breadcrumbs, expansion/colapso y summary visual
> transitorio (`e65_data`) ya estan implementados. Los rollups auditables siguen
> perteneciendo a E7.

### Fase E7 — Cobertura y balances

- Motor formal de cobertura. ✅
  - Resolver scope desde ancla, nodo, edge, asset o Energy group.
  - Calcular closure aguas abajo y miembros incluidos/excluidos.
  - Separar medido, submedido, estimado, asignado, perdida declarada y no
    explicado.
  - Calcular incertidumbre/confianza por fuente y calidad de dato.
- Balance oficial por scope/utility/version. ✅
  - Todo balance debe fijar `scope`, `utility`, periodo y version publicada de
    diagrama.
  - No ejecutar balances oficiales sobre diagramas draft.
  - Guardar versiones hijas consumidas cuando el balance agregue niveles de
    drill-down.
  - Si un diagrama hijo se republica, marcar rollup padre como `superseded`, no
    invalidarlo silenciosamente ni borrar evidencia.
- Rollups auditables para E6.5-pesado. ✅
  - `child_block.e65_data` sigue siendo preview visual.
  - Los rollups reales se consumen desde resultados E7 versionados.
- Hallazgos de balance. ✅
  - Crear data gaps, recomendaciones de medicion y oportunidades desde no
    explicado.
  - Agregar CTA directo desde Balance hacia Estudios con prefill de balance
    sheet cuando aplique.

> **Estado:** E7 queda implementada como contrato oficial sobre
> `energy_balance_sheets/results`. La migracion `00031_e7_official_balances.sql`
> agrega `calculation_mode`, `scope`, `diagram_id`, `diagram_version_id`,
> `child_diagram_version_ids`, `coverage_breakdown`, `topology_snapshot`,
> `findings`, `confidence_score` y `result_status`. El motor
> `calculateOfficialSheet` bloquea topologias no publicadas, consume version
> publicada padre/hijas y persiste resultados oficiales via
> `persistOfficialResult`. El seed incluye versiones publicadas y resultados E7
> reales para Sala de Calderas y Nave A.

### Fase E8 — EnPI y estudios

- EnPIs conectados a balances y variables. ✅
- Baselines versionados.
- Centro de Estudios como laboratorio tecnico trazable. ✅
  - Balance cierra energia; Estudio explica comportamiento.
  - No todo ratio debe convertirse en EnPI; usar metricas candidatas antes de
    promover indicadores gobernados.
  - Mantener estudios persistentes con hipotesis, fuentes, modelos, hallazgos y
    decisiones.
- Variables relevantes. ✅
  - Ranking de drivers por cobertura, correlacion, estabilidad del ratio,
    plausibilidad fisica y seleccion del ingeniero.
  - Persistencia en `energy_study_variable_candidates`.
- Modelos candidatos. ✅
  - Ratio operacional.
  - Banda estable.
  - Mejor periodo observado.
  - Regresion simple energia = base + pendiente x driver.
  - CUSUM inicial.
  - M&V guardian.
- Decisiones operativas. ✅
  - Promover a EnPI.
  - Solicitar medicion.
  - Crear accion rapida.
  - Crear proyecto con fases/tareas tipo project management.
  - Crear evidencia SGEn.
- Pendientes heredados del Centro de Estudios.
  - Mostrar ficha/resumen del estudio origen dentro de Acciones.
  - Incluir estudios recientes en paquete automatico de revision directiva SGEn.
  - Agregar CTA directo desde Balance hacia Estudios con prefill.
- Modelos futuros.
  - Mejorar regresion multivariable real y comparacion de modelos.
  - Mantener conversiones multi-utility explicitas y trazables.

> **Estado:** E8 queda implementada como primera capa seria de laboratorio:
> `00032_e8_study_workflow.sql` agrega `energy_study_variable_candidates`,
> workflow/methodology, decision payload y decisiones `create_quick_action` /
> `create_project`. `resolveStudyCandidate` rankea variables disponibles,
> compara modelos y el UI muestra variables relevantes. El repositorio puede
> crear accion rapida o proyecto con detalle, fases y tareas base. El seed deja
> un estudio Nave A conectado a un balance E7 oficial y a un proyecto real.

### Fase E9 — Acciones, M&V y Maint handoff

- Oportunidades desde hallazgos. ✅
- Proyectos y acciones rapidas. ✅
- M&V formal. ✅
  - `energy_mv_plans` versiona baseline source, metodo, ventana de baseline,
    ventana de verificacion, ahorro esperado/real, criterio de aceptacion y
    evidencia.
  - `energy_improvements.mv_plan_status` es solo resumen operacional.
- Handoff Maint/CMMS. ✅
  - Energy crea solicitudes en `energy_cmms_handoff_requests`.
  - Si Maint/CMMS existe, Energy no crea OT directa; Maint/CMMS decide activo,
    prioridad, OT y cierre tecnico.
  - Se soporta feedback inverso `cmms_to_energy` para hallazgos de
    mantenimiento con impacto energetico.
- Auditoria de ejecucion. ✅
  - `energy_improvement_events` conserva origen, M&V, handoff, feedback,
    cambios clave, cierres con/sin ahorro y revision.
- Pendientes heredados para E10/SGEn.
  - Cierre de proyecto debe generar evidencia SGEn automaticamente.
  - Acciones originadas por estudios deben mostrar ficha completa de origen,
    modelo y supuestos en el workspace.
  - Reportes deben incluir M&V, handoff CMMS y auditoria de acciones.

> **Estado:** E9 queda implementada como primera capa seria de ejecucion:
> `00033_e9_execution_audit_cmms.sql` agrega `energy_mv_plans`,
> `energy_cmms_handoff_requests`, `energy_improvement_events` y estados resumen
> en `energy_improvements`. El workspace de Acciones muestra una pestaña
> **Auditoria / CMMS** para crear plan M&V, enviar solicitud Maint/CMMS y ver la
> bitacora. El seed cubre Energy->CMMS con `VM-WO-2026-0007` y CMMS->Energy con
> `VM-WO-2026-0012`.

### Fase E10 — SGEn y reportes

- Evidencia viva.
- Reportes ejecutivos y tecnicos.
- Paquetes SGEn.
- Verificacion documental.
- Regla de lenguaje y producto.
  - No mencionar estandares, codigos normativos, organismos ni certificacion en
    interfaz, reportes, prompts de generacion documental o textos visibles al
    cliente.
  - No copiar articulos, clausulas, tablas, checklists ni frases propietarias.
  - Redactar todo como analisis profesional de gestion energetica: alcance,
    responsabilidades, riesgos, desempeno, evidencia, acciones, seguimiento,
    revision ejecutiva y mejora continua.
  - Internamente puede existir trazabilidad por dominios funcionales, pero los
    nombres visibles deben ser operativos y propios de VersaEnergy.
- Reportes y exportaciones.
  - PDF mensual.
  - PDF de balance.
  - PDF de EnPI.
  - Paquete SGEn seguro con lenguaje propio, sin texto propietario.
  - Historial de reportes generados.
- Administracion energetica.
  - Usuarios, roles y acceso por sede.
  - Factores/tarifas configurables.
  - Parametros de calidad de datos y significancia SEU.
  - RLS verificado.
- QA y beta.
  - Demo corre con seed.
  - Flujo end-to-end documentado.
  - Build verde y QA basica aprobada.
  - Code splitting para chunks grandes.

### ✅ Fase E11 — EnPI Portfolio y Variables Relevantes 2.0

- Grupos/portfolios de EnPIs. ✅
  - `energy_enpi_groups` permite ordenar indicadores por utility, linea, area,
    proceso, estudios, seguimiento directivo o criterio custom.
  - `energy_enpi_group_members` permite que un EnPI pertenezca a varios grupos;
    `energy_enpis.primary_group_id` conserva el grupo principal.
- Registro canonico de variables relevantes. ✅
  - `relevant_variables` reemplaza el concepto limitado de variables de
    produccion.
  - Una variable puede representar produccion, clima, ocupacion, area, horas de
    operacion, calidad, costo, tarifa, operacion o cualquier driver custom.
  - La unidad es libre (`lb`, `ton`, `L`, `°C`, `personas`, `m2`, `h`, etc.).
  - La frecuencia por defecto puede ser diaria, semanal, mensual, trimestral,
    anual o ad hoc.
  - La agregacion se declara por variable: suma, promedio, minimo, maximo,
    ultimo valor, delta, promedio ponderado o conteo.
- Buckets de variables relevantes. ✅
  - `relevant_variable_groups` y `relevant_variable_group_members` permiten
    ordenar empresas grandes sin saturar el editor.
- Lecturas flexibles. ✅
  - `relevant_variable_readings` guarda frecuencia, unidad snapshot, calidad,
    fuente y periodo.
  - Fuente manual es la productiva actual; IoT/API/import/calc quedan
    preparados pero en desarrollo.
- Conexion formal EnPI-variable. ✅
  - `energy_enpi_variable_links` guarda roles: denominador, driver, ajuste,
    contexto, segmentacion o exclusion.
  - `energy_enpis.denominator_type` usa `relevant_variable` como valor
    canonico cuando el EnPI se calcula contra una variable real.
- UI y motor. ✅
  - Balances expone tab `Variables relevantes` con buckets, creacion de
    variable, unidad/frecuencia/agregacion y editor de lecturas.
  - Desempeno filtra la biblioteca de EnPIs por grupo y el builder referencial
    selecciona variable relevante.
  - `computeEnPITrend` resuelve denominadores desde `relevant_variable_readings`
    y aplica la agregacion declarada.

> **Estado:** E11 queda implementada y verificada con
> `00034_e11_enpi_relevant_variables.sql`. `npm run build` y
> `supabase db reset` pasaron; el seed real deja 6 variables relevantes, 4
> buckets, 108 lecturas, 4 grupos de EnPIs, 5 membresias y 5 links
> EnPI-variable. En reset ya no existen `production_variables` ni
> `production_readings`; las tablas canonicas son `relevant_variables` y
> `relevant_variable_readings`.

### ✅ Fase E12 — Diagram Workspace 2.0

- Diagramas como vistas guardadas del modelo topologico. ✅
  - `energy_diagrams` declara `diagram_type`, `view_preset`,
    `workspace_notes` y `metadata`.
  - Tipos canonicos: `overview`, `utility`, `boundary`, `group`,
    `equipment`, `generated`, `custom`.
  - Lentes canonicos: `macro`, `technical`, `balance`, `audit`.
  - El scope acepta `site`, `area`, `system`, `equipment`, `energy_group`,
    `asset` o `custom`.
- `/diagrama` deja de ser un canvas aislado. ✅
  - El lente operativo muestra un panel permanente `Diagramas / Workspace`.
  - El usuario puede abrir diagramas existentes, filtrar por estado/tipo y
    crear una vista nueva sin salir al editor.
  - El boton `Nuevo` y el panel crean una vista guardada; no duplican activos,
    medidores ni MeasurementPoints.
  - Los diagramas generados desde arbol nacen como `generated` con lente
    `macro` y metadata de origen.
- `/mapa` queda como editor completo. ✅
  - Mantiene galeria, templates, palette, inspector, versiones y publicacion.
  - Comparte la misma clasificacion de diagramas y puede crear diagramas hijo
    desde el inspector.
- Control visual del desorden. ✅
  - `DiagramModeBar` usa lenguaje de lentes: `Tecnico`, `Macro`, `Balance`.
  - En lente `Macro`, los `child_block` se compactan: ocultan totales/residuales
    detallados y muestran cobertura.
  - Los equipos en lente `Macro` reducen MPs inline a un resumen compacto.
  - Expansion/colapso de bloques se conserva para drill-down progresivo.
- Acciones contextuales. ✅
  - El inspector permite crear diagrama hijo desde un nodo.
  - Tambien expone accesos a balance de frontera, estudio energetico y ficha
    del activo/equipo.

> **Estado:** E12 queda implementada con
> `00035_e12_diagram_workspace.sql`. `npm run build` y `supabase db reset`
> pasaron. Verificacion visual en `/diagrama` confirmo panel Workspace, filtros,
> tipos de diagrama, modal de creacion y lente Macro compacto.

### ✅ Fase E13 — Estudios y auditoria Energetica Workflow 2.0

- Convertir Estudios en modulo de expediente guiado. ✅
  - El modulo visible es `/estudios`.
  - Desempeno conserva EnPIs, baselines, targets y gobierno de indicadores.
  - Estudios conserva preguntas tecnicas, auditoria, recoleccion de datos,
    suficiencia, modelos, hallazgos, decisiones e historico.
  - El layout primario no debe ser de carriles horizontales; debe ser flujo
    vertical de proceso con expediente vivo.
- Tipos de expediente. ✅
  - `energy_study`: pregunta tecnica o analisis exploratorio.
  - `performance_review`: revision periodica de EnPIs/desviaciones.
  - `measurement_gap`: brecha de medicion o cobertura insuficiente.
  - `balance_investigation`: investigacion de residual/no explicado.
  - `mv_review`: verificacion de ahorro o estabilidad posterior a accion.
  - `internal_audit`: revision estructurada de gestion, evidencia y
    seguimiento.
  - `seu_review`: revision de usos energeticos significativos.
- Flujo canonico. ✅
  1. Intake: origen, pregunta, prioridad, owner, periodo y fecha objetivo.
  2. Alcance y frontera: sitio, agrupador, Energy group, diagrama, balance,
     asset, MeasurementPoint, utility o scope custom.
  3. Recoleccion de datos: matriz de requisitos con fuentes requeridas,
     recomendadas y opcionales.
  4. Suficiencia de datos: cobertura, calidad, alineacion temporal, frontera,
     variables, supuestos y riesgo de conclusion.
  5. Plan de analisis: ratio, baseline, residual, ranking de drivers,
     regresion, comparacion de modelos, CUSUM inicial, before/after o M&V.
  6. Hallazgos: severidad, confianza, impacto, evidencia, supuestos e
     incertidumbre.
  7. Decision: EnPI, baseline, accion, proyecto, solicitud Maint/CMMS,
     medicion, evidencia SGEn, balance/diagrama requerido o cierre no
     concluyente.
  8. Cierre e historico: bitacora append-only, versionado y filtros.
- Estados de expediente. ✅
  - `draft`, `scoping`, `data_collection`, `data_gap`,
    `ready_for_analysis`, `analyzing`, `findings_review`,
    `decision_pending`, `decided`, `closed`, `archived`.
- UX objetivo. ✅
  - Header con `Nuevo expediente` y recarga.
  - Izquierda: inbox/lista de expedientes por sitio.
  - Centro: paso activo con formularios y resultados.
  - Derecha: expediente vivo con scope, fuentes, suficiencia, hallazgos,
    decisiones y enlaces.
  - Historico como paso/panel de bitacora, no como lista suelta.
- Schema implementado.
  - Extiende `energy_studies` para no duplicar el concepto actual.
  - Agregar campos de workflow: tipo, etapa, owner, prioridad, vencimiento,
    origen, periodo, suficiencia, resumen de calidad y cierre.
  - Agrega `energy_study_activities` para tareas tecnicas tipo OT energetica.
  - Agrega `energy_study_evidence` para adjuntos/referencias/evidencias.
  - Agrega `energy_study_events` como bitacora append-only.
  - Reusar `energy_study_sources`, `energy_study_models`,
    `energy_study_findings`, `energy_study_decisions` y
    `energy_study_variable_candidates`.
- Decision final. ✅
  - Puede registrar decision trazable.
  - Puede crear EnPI.
  - Puede crear accion rapida.
  - Puede crear proyecto con ficha de proyecto.
  - Puede registrar solicitud de medicion, Maint/CMMS, evidencia SGEn,
    seguimiento o cierre sin accion como decision/historial.
- Seed real. ✅
  - El estudio Nave A queda como expediente `balance_investigation` con 4
    actividades, 3 evidencias y 4 eventos.

> **Estado:** implementada con `00037_e13_study_case_management.sql`.
> `npm run build` y `supabase db reset` pasaron. Consulta real post-reset:
> `energy_studies=1`, `energy_study_activities=4`,
> `energy_study_evidence=3`, `energy_study_events=4`.

### Backlog Tecnico Transversal

- Cut-over de datos legacy hacia Core/`assets` y reduccion progresiva de
  dependencias en `assets_compat`.
- Mantener `assets_compat` solo como fallback temporal para modulos legacy.
- Eliminar referencias a planes historicos en prompts, docs y reglas AI.
- Mantener `DATABASE.md` sincronizado con migraciones nuevas.
- No reintroducir mock/local data en runtime.

## 14. Preguntas Pendientes

1. Core Asset Registry vivira como schema real de VersaPlatform, como
   extraccion del schema actual de VersaMaint o como servicio de sincronizacion
   entre bases durante transicion?
2. Energy y VersaMaint compartiran la misma base Supabase fisica o habra
   integracion entre bases?
3. Cual sera el RPC/servicio canonico para crear activos comunes desde Maint,
   crear desde Energy-only o solicitar alta/adopcion desde Energy cuando Maint
   esta activo?
4. Que campos Core puede editar Energy directamente cuando Maint esta activo y
   cuales deben quedar como propuesta para el gestor de mantenimiento?
5. Cuando Energy crea un activo, debe nacer siempre como mantenible potencial o
   puede nacer como agrupador/energy-only hasta que Maint lo adopte?
6. Cuando Maint crea un activo, debe nacer siempre visible para Energy o solo
   cuando se marque como energicamente relevante?
7. Quien aprueba merges de duplicados cuando ambos productos crean activos
   parecidos?
8. Que campos son Core-owned, Maint-owned, Energy-owned y shared-governed?
9. MeasurementPoints viviran canonicamente en Core, Maint, Energy o una capa
   comun de medicion?
10. Las lecturas canonicas seran compartidas o Energy tendra tabla especializada
   que referencie MeasurementPoints comunes?
11. Donde vive la guarda final de acumuladores: tabla Core, RPC compartida,
   servicio de ingestion o tabla especializada de Energy?
12. Como se modelaran reemplazos de medidor, reset y rollover para no romper
   historicos?
13. Que contrato minimo dejaremos para IoT/API mientras la integracion queda en
   desarrollo?
14. Que roles Energy necesita aparte de admin/manager/engineer?
15. Que acciones pueden crear solicitudes u OTs en VersaMaint y bajo que
   aprobacion?
16. Como se manejara historico si el arbol Core/Maint cambia despues de publicar una
   topologia?
17. Que nivel de precision inicial se exigira para publicar un balance?
18. Que utilities entran en MVP serio?
19. Que diagramas deben tener plantillas primero?
20. Que datos de produccion vendran de Energy, VersaMaint, ERP o carga manual?

## 15. Invariantes

- No duplicar el arbol de activos como verdad paralela.
- La identidad fisica debe crearse en Core aunque la accion nazca desde Maint o
  Energy.
- Si VersaMaint esta activo, es el steward recomendado y autoritativo para
  altas/bajas/movimientos maestros de activos fisicos.
- Si VersaMaint esta activo en la sede, Energy no crea activos fisicos maestros
  directos; crea solicitudes de alta/adopcion para Maint.
- Core Asset Registry no implica necesariamente un modulo nuevo en CMMS; puede
  implementarse como contrato, metadata, etiquetas y guardas dentro de Activos.
- No volver a `asset_type` como contrato.
- No tratar medidores fisicos como entidad especial fuera de mantenibles.
- No mezclar medidor fisico con MeasurementPoint.
- No aceptar lecturas acumulativas decrecientes sin evento auditado de cambio,
  reset, rollover o correccion.
- No disenar IoT directo en frontend; dejar contrato preparado y resolver
  gateway/API en fase posterior.
- No hacer sincronizacion bidireccional ciega; sincronizar por ownership de
  campos y eventos.
- No borrar historico energetico porque un activo se desactive o cambie en
  Maint/Core.
- No publicar diagramas generados automaticamente sin validacion.
- No ejecutar balances oficiales sobre diagramas draft.
- No ocultar estimaciones como si fueran mediciones reales.
- No permitir que excepciones energeticas deformen el arbol Core/Maint.
- No copiar texto propietario de ningun estandar ni mencionar codigos
  normativos en textos visibles.
- No poner protocolos industriales en frontend.

## 16. Criterio De Exito

VersaEnergy dejara de ser maqueta cuando un usuario pueda:

1. seleccionar una sede compartida con VersaMaint;
2. ver el arbol real de activos;
3. identificar activos y agrupadores relevantes para Energy;
4. asociar medidores fisicos y MeasurementPoints;
5. generar un diagrama preliminar por utility;
6. corregir excepciones;
7. publicar topologia;
8. calcular cobertura;
9. correr balances;
10. detectar desviaciones;
11. crear oportunidades;
12. verificar ahorros;
13. alimentar SGEn;
14. emitir reportes tecnicos y ejecutivos.

## 17. Memoria Viva

| Fecha | Decision / avance | Impacto |
|-------|-------------------|---------|
| 2026-06-04 | E1 arranca formalmente con lectura Core-first en `src/services/asset-tree.ts`. | Energy lee `assets` Core con `node_type`, `node_role`, `maintainable_kind` y mezcla `energy_asset_profiles`; `assets_compat` queda solo como fallback temporal. |
| 2026-06-04 | La creacion desde Energy respeta `fn_site_product_mode(site_id)`. | Si la sede esta `energy_only`, Energy crea en `assets` Core y agrega perfil Energy; si Maint gobierna, Energy crea `asset_registry_requests`. |
| 2026-06-04 | El mock local de Energy se alinea al contrato CMMS/Core. | `00015_assets_convergence.sql` agrega shape Core, capabilities, solicitudes registry, dominios de MeasurementPoints y perfiles Energy satelite. |
| 2026-06-04 | CMMS/Core ya puede decidir solicitudes del Asset Registry. | `fn_approve_asset_registry_request_tx` y `fn_reject_asset_registry_request_tx` aprueban/rechazan solicitudes iniciadas por Energy cuando Maint gobierna; la prueba transaccional cubrio approve y reject sin dejar datos de QA. |
| 2026-06-04 | E1 cierra contrato de lifecycle, eventos y acumuladores. | `asset_registry_events` queda como historial append-only; dedupe/merge no es flujo normal en `maint_and_energy`; lecturas acumuladoras menores requieren evento auditado. |
| 2026-06-04 | E2 define site scope compatible con CMMS. | `site_access`, `fn_current_profile_id` y `fn_user_can_access_site` gobiernan lectura/escritura de tablas Core/mock en Energy; el fallback por empresa solo existe mientras no se configure scope formal. |
| 2026-06-04 | E3 crea schema satelite Energy serio. | `energy_groups`, `energy_group_members`, `energy_measurement_point_profiles`, `energy_measurement_bindings` y `energy_scope_exceptions` separan semantica energetica del arbol CMMS sin perder bindings Core. |
| 2026-06-04 | E4 cierra arbol compartido visible en Energy. | Energy filtra el arbol por agrupadores, mantenibles y medidores; los lentes del detalle dependen del rol Core; CMMS/Core manda el seed global de `assets` y Energy mueve solo sus capas satelite (`energy_groups`, topologia y diagramas). |
| 2026-06-04 | E5 alinea MeasurementPoints al contrato compartido. | MeasurementPoint puede tener medidor fisico opcional, scope Core/Energy group y dominios; la captura productiva es manual via `fn_record_measurement_reading_tx`; file import/API/IoT/calculated quedan **EN DESARROLLO**. |
| 2026-06-04 | E6 se define como grafo con identidad y rol separados. | `load`, `conversion` y `distribution` pueden ser Core assets, Energy groups o virtuales; medidores van embebidos por defecto; fuentes externas son suministro no mantenible; drill down queda como Fase E6.5 antes de balances E7. |
| 2026-06-04 | E6 queda implementada y verificada. | `00030_e6_topology.sql`, compiler por utility, puertos de conversion, scope/closure de grupo, validaciones draft/publish, generador preliminar y prueba E6-E quedaron cerrados; `npm run build` y `supabase db reset` pasaron. |
| 2026-06-04 | E6.5-lite + E6.5-data visual quedan implementadas. | Los `child_block` soportan expansion/colapso elegante y cargan `e65_data` transitorio desde Energy groups, bindings, MeasurementPoints y lecturas; no persiste en diagramas ni sustituye balances E7. |
| 2026-06-04 | E7 queda implementada y verificada. | `00031_e7_official_balances.sql` convierte balance sheets en resultados oficiales versionados: exige topologia publicada, guarda version padre/hijas, cobertura, hallazgos, confianza y estado `current/superseded`; `npm run build`, `supabase db reset` y consulta real de resultados oficiales pasaron. |
| 2026-06-04 | E8 queda implementada en alcance inicial. | Estudios rankean variables relevantes, comparan ratio/banda/mejor periodo/regresion simple/CUSUM/M&V guardian y deciden EnPI, medicion, accion rapida, proyecto o evidencia SGEn; el seed incluye estudio Nave A con proyecto derivado. |
| 2026-06-05 | E9 queda implementada y verificada. | `00033_e9_execution_audit_cmms.sql` agrega planes M&V formales, handoff Energy<->Maint/CMMS y bitacora auditada. El workspace Acciones tiene pestaña Auditoria/CMMS; `npm run build`, `supabase db reset` y consultas reales confirmaron 1 plan M&V, 2 handoffs y 6 eventos. |
| 2026-06-05 | E11 queda implementada y verificada. | `00034_e11_enpi_relevant_variables.sql` reemplaza `production_*` por `relevant_variables/readings`, agrega buckets, grupos de EnPIs y links EnPI-variable; la UI permite variables relevantes con unidad/frecuencia flexible y Desempeno filtra EnPIs por grupo. |
| 2026-06-05 | E12 queda implementada y verificada. | `00035_e12_diagram_workspace.sql` clasifica diagramas por tipo/lente/scope; `/diagrama` muestra Workspace lateral con filtros y creacion de vistas, `/mapa` conserva editor completo, y Macro compacta agrupadores/equipos para bajar ruido visual sin perder drill-down. |
| 2026-06-05 | E13 queda definida como fase de diseno para Estudios. | Estudios debe pasar de workbench/carriles a expediente guiado: intake, alcance, matriz de datos, suficiencia, analisis, hallazgos, decision e historico. Desempeno queda como gobierno de EnPIs; `/estudios` sera el modulo de auditoria y preguntas tecnicas. |
| 2026-06-04 | Auditoria de arquitectura E6 incorporada al blueprint. | La seccion E6 adopta identidad por FKs tipadas (no polimorficas) sobre `00028`, un solo `energy_role`, `energy_sources` como entidad, energia termica calculada con companions, aire en flujo/fuga, validaciones draft/publish, y el modelo de medidor de frontera de grupo + cobertura. |
