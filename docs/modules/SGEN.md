# Modulo: SGEn (ISO 50001)

## Responsabilidad

Workspace para operar un Sistema de Gestion de la Energia alineado con
ISO 50001. No copia texto del estandar. No promete certificacion. Consume
evidencia del resto de modulos y la organiza para auditoria y mejora continua.

## Archivos clave

| Responsabilidad | Archivo |
|-----------------|---------|
| Modulo UI (entry) | `src/modules/iso50001/index.tsx` |
| Motor SGEn | `src/services/sgen-engine/` |

## Modelo/Tablas

- `sgen_scope` — alcance del SGEn.
- `sgen_policy` — politica energetica propia.
- `sgen_energy_reviews` — revisiones energeticas.
- `sgen_significant_uses` — usos significativos de energia (SEUs).
- `sgen_objectives` — objetivos energeticos.
- `sgen_evidence` — evidencia recolectada.
- `sgen_audits` — auditorias internas.
- `sgen_management_reviews` — revisiones gerenciales.
- `sgen_nonconformities` — no conformidades.

Migracion: `00011_sgen_iso50001.sql`.

## Flujo actual

1. Dashboard con estado de preparacion del SGEn.
2. Alcance definido con utilities, areas y periodo.
3. Aviso legal visible en cada pantalla.
4. Boton transversal para recolectar evidencia (Snapshot) desde otros modulos.
5. Secciones: Alcance, Politica, Revision energetica, SEUs, Objetivos,
   Evidencia, Auditorias, Revision gerencial.

## Invariantes

- **No copiar texto de ISO 50001** ni prometer certificacion.
- Aviso legal visible: "VersaEnergy apoya la gestion operativa de la energia.
  No constituye certificacion ISO 50001."
- La evidencia nace del sistema, no de formularios manuales.
- Los objetivos SGEn se vinculan a targets de EnPI, no se duplican.
- Los planes de accion se vinculan a proyectos de Acciones, no se duplican.
- Preguntas de auditoria deben ser originales, no copiadas del estandar.

## Permisos

Visible para todos los usuarios autenticados.

## Integraciones

- Balances: evidencia de balance como input para revision energetica.
- EnPI: targets vinculados a objetivos.
- Acciones: proyectos como planes de accion.
- Medicion: cobertura como evidencia.
- Mapa: diagramas publicados como evidencia.
- Reportes: paquete de evidencia SGEn.

## No hacer

- No copiar articulos, clausulas, tablas o checklists de ISO 50001.
- No usar logo ISO.
- No prometer certificacion.
- No crear formularios manuales cuando el dato existe en el sistema.
- No duplicar objectives vs targets de EnPI.

## Verificacion recomendada

- Cambio frontend: `npm run build`.
- Revisar que no se introduzca texto ISO.
