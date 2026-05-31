# VersaEnergy — Parte 1: Visión del producto

## Propósito

VersaEnergy será una app nueva e independiente para gestión energética, diseñada como compañera visual y funcional de VersaMaint.

No debe ser solamente un dashboard de consumo. Debe ser una herramienta para entender cómo entra, fluye, se mide, se consume, se pierde y se mejora la energía dentro de una planta, edificio o proceso.

La idea central es:

```txt
VersaEnergy = Mapa energético vivo + Medición + Balance + Desempeño + Acciones + ISO 50001
```

## Diferenciador principal

El diferenciador de VersaEnergy será el **Mapa Energético**: un canvas gráfico donde el usuario pueda dibujar diagramas unifilares y relaciones lógicas entre fuentes, tableros, áreas, equipos, medidores y variables.

Este mapa no debe ser un dibujo decorativo. Cada nodo y conexión debe tener significado operativo.

Ejemplo:

```txt
Red eléctrica -> Transformador -> Tablero principal -> Medidor -> Área Producción -> Equipo
```

El sistema debe entender esa relación para calcular consumos, balances, pérdidas, áreas sin medición, desviaciones y oportunidades de ahorro.

## Filosofía de producto

### 1. Energía como flujo

La energía debe representarse como un flujo dentro de la operación, no solo como registros en una tabla.

La app debe ayudar a responder:

- ¿Qué alimenta este equipo?
- ¿Qué medidor mide esta área?
- ¿Qué consumo queda sin explicar?
- ¿Qué cargas dependen de este tablero?
- ¿Dónde hay datos faltantes?
- ¿Qué desviación puede convertirse en acción?

### 2. Operación antes que documentación

ISO 50001 debe sentirse como una consecuencia de operar bien la energía. La evidencia debe nacer de diagramas, mediciones, balances, acciones, objetivos y revisiones.

### 3. Mismo ADN que VersaMaint

VersaEnergy debe verse y sentirse como parte de la familia Versa:

- navegación lateral modular,
- cards limpias,
- badges de estado,
- diseño sobrio,
- enfoque operativo,
- trazabilidad,
- claridad para usuarios de planta y gerencia.

## Referencia normativa

La base normativa será **ISO 50001:2018**, considerando también la enmienda **ISO 50001:2018/Amd 1:2024 — Climate action changes**.

La app no debe copiar el texto del estándar. Debe traducirlo a funciones prácticas:

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

## Estilo visual

VersaEnergy debe compartir el lenguaje visual de VersaMaint, pero con identidad energética.

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

- Azul: marca Versa.
- Teal/verde: eficiencia energética.
- Naranja: advertencia, combustibles o desviaciones moderadas.
- Rojo: pérdidas, alarmas o desviaciones críticas.
- Gris: datos faltantes, estimados o inactivos.

## Módulos principales

### 1. Inicio / Energy Cockpit

Dashboard principal con consumo, costo, demanda, emisiones, ahorro, calidad de datos, alertas y avance contra objetivos.

### 2. Mapa Energético

Canvas para dibujar diagramas unifilares, conectar fuentes, tableros, áreas, equipos y medidores.

Este módulo será el corazón del producto.

### 3. Modelo Energético

Catálogos de sitios, áreas, equipos, fuentes energéticas, medidores, canales, variables, tarifas y factores de emisión.

### 4. Medición

Gestión de medidores, canales, lecturas manuales, importaciones CSV, calidad de datos y trazabilidad.

### 5. Balances

Cálculo de consumo medido, consumo estimado, consumo calculado, pérdidas y consumo no explicado.

### 6. Desempeño Energético

Gestión de EnPI, líneas base, metas, desviaciones y comparación contra objetivos.

### 7. Acciones de Ahorro

Conversión de hallazgos energéticos en acciones con responsable, ahorro esperado, ahorro real, evidencia y estado.

### 8. ISO 50001

Workspace para alcance, política, revisión energética, SEUs, objetivos, evidencias, auditorías, revisión gerencial y mejora continua.

### 9. Reportes

Reportes PDF/CSV de consumo, balances, desempeño, acciones e ISO 50001.

### 10. Integración VersaMaint

Integración futura para vincular hallazgos energéticos con activos, solicitudes y órdenes de trabajo en VersaMaint.

## Criterios de éxito de esta visión

VersaEnergy será valioso si permite a un usuario:

1. Crear una planta.
2. Dibujar su mapa energético.
3. Asociar medidores.
4. Importar lecturas.
5. Ver consumo y desviaciones sobre el mapa.
6. Detectar consumo no explicado.
7. Crear una acción de ahorro.
8. Medir desempeño con EnPI.
9. Generar evidencia para ISO 50001.
10. Conectar hallazgos con mantenimiento.

## Frase guía

**VersaEnergy no solo reporta energía; entiende cómo fluye, cómo se mide y cómo se mejora.**
