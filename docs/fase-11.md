# Fase 11 — QA, Demo Dataset, Beta

> Nota documental: este plan queda como referencia inicial. Para implementacion
> futura usa `05_MASTER_IMPROVEMENT_PLAN.md`, especialmente MP-13.

## Objetivo

Preparar VersaEnergy para una demo beta funcional de punta a punta, con dataset completo que incluya múltiples utilities, datos realistas, y verificación de todos los flujos del sistema.

---

## Tareas

### 1. Dataset demo (seed SQL)
Crear datos realistas para una planta ficticia "Planta Demostración" con:

**Utilities (4):**
- Electricidad
- Aire comprimido
- Vapor
- Agua helada

**Estructura:**
- 1 site, 5 áreas (Utilities, Producción, Empaque, HVAC, Administración)
- ~10 equipos (compresor, secador, caldera, chiller, bombas, tableros, transformador)
- ~6 fuentes (red eléctrica, acometida gas, agua de red)
- ~12 MeasurementPoints (acumuladores, sensores instantáneos, medidor virtual)
- ~3 diagramas (eléctrico unifilar, red de vapor, red de aire comprimido)

**Datos de lectura:**
- 12 meses de lecturas mensuales para acumuladores
- Valores con estacionalidad realista
- Algunos gaps y outliers para probar calidad de datos

### 2. Flujo end-to-end
Verificar el flujo completo:
```
site → utility → modelo → diagrama → medidor → lectura →
balance → EnPI → desviación → acción → evidencia ISO → reporte
```

### 3. Revisión de calidad
- [ ] Responsive: sidebar, canvas, tablas en mobile/tablet
- [ ] Empty states: todas las vistas muestran EmptyState cuando no hay datos
- [ ] Error states: manejo de errores de Supabase en todas las vistas
- [ ] Loading states: skeletons/spinners en todas las vistas
- [ ] RLS: verificar que usuarios de diferentes companies no ven datos cruzados
- [ ] Tags únicos: verificar que no hay colisiones en el dataset demo

### 4. Pruebas de motores
- [ ] `topology-engine/compiler.ts`: test con grafo de demo
- [ ] `topology-engine/validators.ts`: test con reglas R01-R12
- [ ] `balance-engine/balanceEngine.ts`: test con datos del demo
- [ ] `measurement-engine/accumulator.ts`: test de calculateDelta (normal, rollover, reset)

### 5. Guía de demo
Documento breve (`docs/guia-demo.md`) con:
- Paso 1: Login
- Paso 2: Navegar por el modelo
- Paso 3: Abrir un diagrama
- Paso 4: Ver lecturas en el inspector
- Paso 5: Ejecutar un balance
- Paso 6: Ver overlays en el mapa
- Paso 7: Crear acción desde desviación
- Paso 8: Ver EnPI
- Paso 9: Generar reporte

---

## Archivos esperados

| Archivo | Acción |
|---------|--------|
| `supabase/seed.sql` | Creado (dataset demo) |
| `docs/guia-demo.md` | Creado |
| Tests de motores (opcional en MVP) | Creados |

---

## Criterios de Aceptación

- [ ] Dataset demo poblado con 4 utilities, 5 áreas, 10+ equipos, 12+ medidores
- [ ] 12 meses de lecturas con estacionalidad
- [ ] Flujo end-to-end verificado
- [ ] Empty/Loading/Error states en todas las vistas
- [ ] RLS verificado (no cross-company data)
- [ ] `npm run build` funciona
- [ ] Guía de demo lista

---

## Prompt sugerido para AI

```txt
Prepara VersaEnergy para beta demo (Fase 11).
Lee AGENTS.md y docs/fase-11.md.

Tareas:
1. Crea supabase/seed.sql con dataset demo:
   - Planta Demo con 4 utilities: electricidad, aire comprimido, vapor, agua helada
   - 5 áreas, 10+ equipos, 6+ fuentes, 12+ MeasurementPoints
   - 3 diagramas (eléctrico unifilar, red vapor, red aire comprimido)
   - 12 meses de lecturas con estacionalidad realista, gaps y outliers

2. Verifica el flujo end-to-end:
   site → modelo → diagrama → medidor → lectura → balance → EnPI → acción → reporte

3. Revisa: responsive, empty states, error states, loading states, RLS

4. Agrega pruebas básicas para:
   - topology-engine/compiler.ts
   - topology-engine/validators.ts
   - balance-engine/balanceEngine.ts
   - measurement-engine/accumulator.ts

5. Crea docs/guia-demo.md con pasos para demo

Debe compilar con npm run build.
```
