# VersaEnergy — Parte 1: Visión del producto

## Propósito

VersaEnergy será una app nueva e independiente para **Energy & Utilities Management**, diseñada como compañera visual y funcional de VersaMaint.

No debe ser solamente un dashboard de electricidad. Debe ser una herramienta para entender cómo entran, fluyen, se miden, se consumen, se pierden y se optimizan todos los utilities críticos dentro de una planta, edificio o proceso.

La idea central es:

```txt
VersaEnergy = Mapa vivo de energía y utilities + Medición + Balance + Desempeño + Acciones + SGEn profesional
```

## Alcance de utilities

VersaEnergy debe poder gestionar, como mínimo:

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

El sistema debe tratar cada utility con sus propias unidades, variables, medidores, balances y reglas de cálculo.

## Diferenciador principal

El diferenciador de VersaEnergy será el **Mapa Energético y de Utilities**: un canvas gráfico donde el usuario pueda dibujar y conectar redes de energía y servicios industriales.

Este mapa debe soportar:

- diagramas unifilares eléctricos,
- redes de vapor,
- redes de aire comprimido,
- circuitos de agua helada,
- circuitos de agua caliente,
- distribución de gas,
- distribución de combustibles,
- redes de agua industrial,
- relaciones lógicas entre áreas, equipos, medidores y variables.

Este mapa no debe ser un dibujo decorativo. Cada nodo y conexión debe tener significado operativo.

Ejemplo eléctrico:

```txt
Red eléctrica -> Transformador -> Tablero principal -> Medidor -> Área Producción -> Equipo
```

Ejemplo aire comprimido:

```txt
Compresor -> Secador -> Tanque -> Header principal -> Línea de producción -> Equipo consumidor
```

Ejemplo vapor:

```txt
Caldera -> Header de vapor -> Medidor de vapor -> Intercambiador -> Proceso térmico -> Retorno de condensado
```

Ejemplo agua helada:

```txt
Chiller -> Bomba primaria -> Header de agua helada -> AHU -> Área climatizada
```

El sistema debe entender esas relaciones para calcular consumos, balances, pérdidas, fugas, retornos, áreas sin medición, desviaciones y oportunidades de ahorro.

## Filosofía de producto

### 1. Utilities como flujo

La energía y los utilities deben representarse como flujos dentro de la operación, no solo como registros en una tabla.

La app debe ayudar a responder:

- ¿Qué alimenta este equipo?
- ¿Qué utility consume esta área?
- ¿Qué medidor mide esta red o proceso?
- ¿Qué consumo queda sin explicar?
- ¿Qué cargas dependen de este tablero, header o línea principal?
- ¿Dónde hay fugas, pérdidas o retornos deficientes?
- ¿Dónde hay datos faltantes?
- ¿Qué desviación puede convertirse en acción?

### 2. Operación antes que documentación

El SGEn debe sentirse como una consecuencia de operar bien la energía y los
utilities. La evidencia debe nacer de diagramas, mediciones, balances, acciones,
objetivos y revisiones, no de textos decorativos.

### 3. Mismo ADN que VersaMaint

VersaEnergy debe verse y sentirse como parte de la familia Versa:

- navegación lateral modular,
- cards limpias,
- badges de estado,
- diseño sobrio,
- enfoque operativo,
- trazabilidad,
- claridad para usuarios de planta y gerencia.

## Gestion energetica profesional

La app debe operar un Sistema de Gestion de la Energia con estructura seria,
trazable y defendible por evidencia. La compatibilidad se logra por dominios de
trabajo, datos y controles, no por mencionar estandares ni copiar textos
propietarios.

El lenguaje visible debe ser propio de VersaEnergy y de un profesional de
gestion energetica:

- alcance energético,
- política energética,
- revisión energética,
- usos significativos de energía,
- EnPI,
- líneas base,
- objetivos,
- planes de acción,
- evidencias,
- auditorías internas,
- revisión por dirección,
- mejora continua.

Aunque el sistema cubra múltiples utilities, su estructura debe servir para demostrar gestión del desempeño energético, eficiencia, uso y consumo de energía en el sentido amplio del sistema de gestión.

VersaEnergy no debe prometer certificaciones, aprobaciones externas ni uso de
sellos de terceros. La promesa correcta es preparacion operativa, trazabilidad,
evidencia y cobertura profesional para apoyar auditorias internas, revision
ejecutiva y mejora continua.

## Estilo visual

VersaEnergy debe compartir el lenguaje visual de VersaMaint, pero con identidad propia de Energy & Utilities.

Stack visual sugerido:

```txt
React
Vite
TypeScript
Tailwind
Supabase
Zustand
Recharts
Framer Motion
Lucide
@xyflow/react
@react-pdf/renderer
```

Paleta conceptual:

- Azul: marca Versa y electricidad.
- Teal/verde: eficiencia energética y sostenibilidad.
- Naranja: gas, combustibles o desviaciones moderadas.
- Morado: vapor o procesos térmicos.
- Cyan: agua helada, agua industrial o refrigeración.
- Gris: datos faltantes, estimados o inactivos.
- Rojo: pérdidas, fugas, alarmas o desviaciones críticas.

## Módulos principales

### 1. Inicio / Utilities Cockpit

Dashboard principal con consumo, costo, demanda, emisiones, ahorro, calidad de datos, alertas y avance contra objetivos por utility, sitio, área y equipo.

### 2. Mapa Energético y de Utilities

Canvas para dibujar diagramas unifilares, redes de vapor, aire comprimido, agua helada, gas, combustibles y otras utilities, conectando fuentes, distribución, medidores, áreas, procesos y equipos.

Este módulo será el corazón del producto.

### 3. Modelo Energy & Utilities

Catálogos de sitios, áreas, procesos, equipos, fuentes, utilities, medidores, canales, variables, tarifas, factores de conversión y factores de emisión.

### 4. Medición

Gestión de medidores, canales, lecturas manuales, importaciones CSV, calidad de datos y trazabilidad para todas las utilities.

### 5. Balances

Cálculo de consumo medido, consumo estimado, consumo calculado, pérdidas, fugas, retornos y consumo no explicado por utility.

### 6. Desempeño Energético

Gestión de EnPI, líneas base, metas, desviaciones y comparación contra objetivos.

Ejemplos:

- kWh por tonelada,
- Nm3 de aire comprimido por unidad,
- kg de vapor por tonelada,
- m3 de agua por lote,
- TR-h por área,
- GJ por unidad producida.

### 7. Acciones y Proyectos de Mejora

Conversión de hallazgos energéticos y de utilities en acciones rápidas o
proyectos de mejora. Las acciones simples se gestionan con responsable, ahorro,
evidencia y estado. Las iniciativas grandes se gestionan como proyectos con
fases, tareas, recursos, inversión, avance, verificación de ahorro y cierre.

### 8. SGEn profesional

Workspace para alcance, política propia, revisión energética, usos
significativos, objetivos, evidencias, auditorías internas, revisión gerencial y
mejora continua. Debe evitar texto propietario, referencias normativas visibles
y usar lenguaje original del producto.

### 9. Reportes

Reportes PDF/CSV de consumo, balances, desempeño, acciones y cobertura del SGEn,
filtrables por utility.

### 10. Integración VersaMaint

Integración futura para vincular hallazgos energéticos y de utilities con activos, solicitudes y órdenes de trabajo en VersaMaint.

## Criterios de éxito de esta visión

VersaEnergy será valioso si permite a un usuario:

1. Crear una planta.
2. Modelar sus utilities críticos.
3. Dibujar mapas eléctricos, térmicos, hidráulicos y neumáticos simplificados.
4. Asociar medidores.
5. Importar lecturas.
6. Ver consumos, pérdidas y desviaciones sobre el mapa.
7. Detectar consumo no explicado, fugas o pérdidas.
8. Crear una acción rápida o proyecto de mejora.
9. Medir desempeño con EnPI.
10. Generar evidencia para el SGEn profesional.
11. Conectar hallazgos con mantenimiento.

## Frase guía

**VersaEnergy no solo reporta electricidad; entiende cómo fluyen, se miden y se optimizan todos los utilities críticos de la operación.**
