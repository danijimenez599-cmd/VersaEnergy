-- seed_phase2.sql
-- VersaEnergy — Dataset Demo Fase 2
-- Extiende seed.sql con: SGEn rico, variables significativas + 18 meses de datos
-- para demostrar análisis multivariable, riesgos, auditoría ejecutada, NCs y
-- revisión directiva con paquete automático.
--
-- Prerrequisito: seed.sql aplicado + migraciones 00017 y 00018.
--
-- Credencial de acceso (sin cambios):
--   email    admin@demo.com
--   password AdminDemo123!

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Diagrama adicional — Red de gas natural
-- ─────────────────────────────────────────────────────────────────────────────

insert into energy_diagrams (id, site_id, name, description, utility_type, status, canvas_state) values
  ('d0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001',
   'Red de gas natural',
   'Acometida de gas natural, regulacion de presion, medicion y caldera B-01.',
   'natural_gas', 'published', '{}')
on conflict (id) do nothing;

insert into energy_diagram_nodes (id, diagram_id, node_type, tag, utility, label, position_x, position_y, properties) values
  ('12000000-0000-0000-0000-000000000501', 'd0000000-0000-0000-0000-000000000005', 'utility_source', 'NG-RED', 'natural_gas', 'Red de gas natural', 50, 160,
   '{"asset_binding":{"required":false,"status":"external_source","reason":"utility_supplier"}}'),
  ('12000000-0000-0000-0000-000000000502', 'd0000000-0000-0000-0000-000000000005', 'area_node', 'UT-CAL', 'natural_gas', 'Sala de Calderas', 180, 30,
   '{"asset_binding":{"required":true,"entity_type":"area","entity_id":"a0000000-0000-0000-0000-000000000001","source":"asset_tree","status":"linked"}}'),
  ('12000000-0000-0000-0000-000000000503', 'd0000000-0000-0000-0000-000000000005', 'regulator', 'RV-401', 'natural_gas', 'Regulador de presion 0.5 bar', 220, 160,
   '{"asset_binding":{"required":false,"status":"optional_unbound","reason":"no_cmms_asset_for_regulator"}}'),
  ('12000000-0000-0000-0000-000000000504', 'd0000000-0000-0000-0000-000000000005', 'gas_meter', 'FQI-401', 'natural_gas', 'Medidor Gas Caldera', 390, 90,
   '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000112","source":"asset_tree","status":"linked"},"measurement_binding":{"required":true,"measurement_point_id":"11000000-0000-0000-0000-000000000012","meter_equipment_id":"e0000000-0000-0000-0000-000000000112","status":"linked","role":"boundary","anchor":{"type":"edge","id":"13000000-0000-0000-0000-000000000502","position":0.5,"side":"line","offset":{"x":0,"y":-55}}}}'),
  ('12000000-0000-0000-0000-000000000505', 'd0000000-0000-0000-0000-000000000005', 'boiler', 'B-01', 'natural_gas', 'Caldera 200 BHP', 560, 160,
   '{"asset_binding":{"required":true,"entity_type":"equipment","entity_id":"e0000000-0000-0000-0000-000000000007","source":"asset_tree","status":"linked"}}')
on conflict (id) do nothing;

insert into energy_diagram_edges (id, diagram_id, source_node_id, target_node_id, edge_type, utility, tag, flow_direction, label, properties) values
  ('13000000-0000-0000-0000-000000000501', 'd0000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000501', '12000000-0000-0000-0000-000000000503', 'pipe', 'natural_gas', 'NG-RED-RV', 'source_to_target', 'Alta presion', '{"pressure_bar":4}'),
  ('13000000-0000-0000-0000-000000000502', 'd0000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000503', '12000000-0000-0000-0000-000000000505', 'pipe', 'natural_gas', 'NG-RV-B01', 'source_to_target', '0.5 bar — 17 Nm3/h', '{"pressure_bar":0.5}'),
  ('13000000-0000-0000-0000-000000000503', 'd0000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000504', '12000000-0000-0000-0000-000000000505', 'signal', 'natural_gas', 'S-FQI401-B01', 'source_to_target', 'Consumo acumulado', '{"measurement_point_id":"11000000-0000-0000-0000-000000000012"}')
on conflict (id) do nothing;

insert into energy_diagram_versions (id, diagram_id, version_number, status, label, is_published, snapshot, node_count, edge_count, published_at) values
  ('14000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 1, 'published', 'Seed publicado', true, '{}', 5, 3, now())
on conflict (diagram_id, version_number) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SGEn — Política energética activa (requiere migration 00017 con status)
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_policy_documents (id, site_id, title, version, effective_date, review_due_date, content, communication_evidence, status, content_origin) values
  ('p1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Política Energética — Planta Demostracion',
   '2.0',
   '2025-01-15',
   '2026-01-15',
   'La dirección de Planta Demostracion se compromete a:

1. Mejorar continuamente el desempeño energético mediante el seguimiento de indicadores (EnPIs) con baseline y metas definidas.
2. Proveer los recursos humanos, técnicos y financieros necesarios para el Sistema de Gestión de la Energía.
3. Cumplir con todos los requisitos legales y contractuales aplicables al uso de la energía.
4. Apoyar la adquisición de equipos y servicios energéticamente eficientes cuando se justifique técnicamente.
5. Asegurar que la información de desempeño energético sea accesible para la toma de decisiones operativas.
6. Comunicar esta política a todo el personal que afecta el desempeño energético y revisarla anualmente.',
   'Publicada en tablero principal de la planta el 15-ene-2025. Presentada en reunión general de arranque de año. Disponible en sistema VersaEnergy para todo el personal.',
   'active',
   'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SGEn — Revisión energética con periodo completo
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_energy_reviews (id, site_id, period_start, period_end, summary, data_quality_score, total_cost, consumption_by_utility, linked_enpis, status, content_origin) values
  ('re100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   '2025-01-01', '2025-06-30',
   'Revisión del primer semestre 2025.

Hallazgos principales:
- Consumo eléctrico total: 572,400 kWh (+4.2% vs S1 2024). Principal driver: verano adelantado en mayo-junio.
- Sistema de vapor: eficiencia de caldera cayó 2.3 puntos por falta de mantenimiento preventivo.
- Compresor C-01: el proyecto VSD en progreso reducirá ~85,000 kWh/año estimados.
- Chiller ajuste setpoint (acción cerrada ene-2025): ahorro verificado 15,000 kWh/mes.

Oportunidades identificadas:
- Recuperación de condensado en HX-01 (ahorro estimado 45,000 kg/mes).
- Revisión de fugas en red de aire comprimido.
- Programa de monitoreo de motor M-01 para detectar desequilibrio de fases.',
   88,
   142600,
   '{"electricity":{"kwh":572400,"cost":68688},"steam":{"kg":1320000,"cost":26400},"compressed_air":{"nm3":1680000,"cost":33600},"natural_gas":{"nm3":112200,"cost":14000}}',
   '{"22000000-0000-0000-0000-000000000001","22000000-0000-0000-0000-000000000002","22000000-0000-0000-0000-000000000003"}',
   'reviewed',
   'user_original'),
  ('re100000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001',
   '2025-07-01', '2025-12-31',
   'Revisión del segundo semestre 2025.

Hallazgos principales:
- EnPI kWh/ton mejoró de 130.2 a 117.9 (-9.4%) gracias al proyecto VSD compresor en etapa final.
- Sistema de vapor: se observa tendencia de mejora desde la limpieza de tubos en octubre.
- Cobertura de medición: 87-89% en electricidad. Brecha en subestación de empaque.

Oportunidades:
- Instalar medidor en área de empaque para cerrar brecha de medición.
- Programa de aislamiento en tuberías de vapor identificado como siguiente proyecto.',
   91,
   138900,
   '{"electricity":{"kwh":589200,"cost":70704},"steam":{"kg":1368000,"cost":27360},"compressed_air":{"nm3":1740000,"cost":34800},"natural_gas":{"nm3":116280,"cost":14535}}',
   '{"22000000-0000-0000-0000-000000000001","22000000-0000-0000-0000-000000000003"}',
   'approved',
   'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SGEn — SEUs con control operacional (requiere migration 00017)
-- ─────────────────────────────────────────────────────────────────────────────

update sgen_significant_uses set
  operational_criteria = 'Presión de descarga: 7.0–8.5 bar. Temperatura de descarga: ≤45°C. Alarma de alta temperatura: 55°C. Corriente nominal: ≤145 A. Factor de potencia: ≥0.92. Arranques/hora: ≤4.',
  relevant_variables = '{"produccion_ton","turno_operacion","temperatura_exterior"}',
  maintenance_criteria = 'Cambio de aceite cada 2,000 h. Limpieza de filtro cada 500 h. Revisión de correas cada 1,000 h. Calibración de transmisor de presión anual. Verificación de fugas mensual.',
  review_frequency = 'monthly'
where id = '33000000-0000-0000-0000-000000000001';

update sgen_significant_uses set
  operational_criteria = 'Presión de vapor: 7.5–8.5 bar. Temperatura de gases de salida: ≤220°C. Relación aire/gas: 11–13. Temperatura agua de alimentación: ≥80°C. Purga de fondo: 1 vez/turno.',
  relevant_variables = '{"produccion_ton","presion_vapor_bar","temperatura_exterior"}',
  maintenance_criteria = 'Limpieza de tubos semestral. Análisis de agua semanal. Calibración de quemador anual. Revisión de trampas de vapor mensual. Prueba de alivio de presión anual.',
  review_frequency = 'monthly'
where id = '33000000-0000-0000-0000-000000000002';

update sgen_significant_uses set
  operational_criteria = 'Temperatura de salida agua helada: 7.0–8.5°C. Temperatura de retorno: ≤13°C. Corriente compresor: ≤95 A. Presión refrigerante (evap): 5.0–5.8 bar. EER mínimo aceptable: 4.8.',
  relevant_variables = '{"temperatura_exterior","carga_hvac_pct","horas_operacion"}',
  maintenance_criteria = 'Limpieza de condensador semestral. Verificación de refrigerante anual. Limpieza de filtros mensual. Calibración de termómetros semestrales.',
  review_frequency = 'quarterly'
where id = '33000000-0000-0000-0000-000000000003';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SGEn — Objetivos vinculados a EnPIs y acciones
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_objectives (id, site_id, name, description, enpi_id, period_start, period_end, estimated_savings, estimated_investment, linked_improvement_id, verification_method, status, content_origin) values
  ('ob100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Reducir kWh/ton a 115 kWh/ton para diciembre 2025',
   'Mejorar el indicador de electricidad por tonelada producida en 8% respecto al baseline (125.5 kWh/ton) mediante el proyecto VSD del compresor principal.',
   '22000000-0000-0000-0000-000000000001',
   '2025-01-01', '2025-12-31',
   85000, 45000,
   '50000000-0000-0000-0000-000000000001',
   'Comparar EnPI kWh/ton del período octubre-diciembre 2025 vs baseline. Validar con medidores EM-001 y PM-001. Ahorro total >85,000 kWh/año documentado.',
   'achieved', 'user_original'),
  ('ob100000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001',
   'Reducir kg vapor/ton a 2,650 kg/ton para diciembre 2025',
   'Mejorar eficiencia de caldera B-01 y recuperar condensado para reducir el consumo de vapor específico en 7% vs baseline (2,850 kg/ton).',
   '22000000-0000-0000-0000-000000000003',
   '2025-01-01', '2025-12-31',
   45000, 8000,
   '50000000-0000-0000-0000-000000000004',
   'Comparar EnPI kg/ton del período octubre-diciembre 2025 vs baseline. Incluir período de estabilización de 2 meses post-instalación trampa de vapor.',
   'active', 'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SGEn — Riesgos y oportunidades (requiere migration 00017)
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_risks_opportunities (id, site_id, type, title, description, source, utility, probability, impact, climate_action_related, treatment_plan, residual_probability, residual_impact, review_date, linked_improvement_id, status, content_origin) values
  ('ri100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'risk', 'Incremento de tarifa eléctrica en horario punta',
   'La CFE anunció revisión de tarifas industriales T-HM. Un incremento del 15-20% en horario punta (18-20h) aumentaría la factura eléctrica en ~$35,000 USD/año.',
   'Revisión energética S1-2025 + boletín CFE marzo 2025',
   'electricity', 'high', 'high', false,
   'Programa de respuesta a la demanda: desplazar cargas no críticas fuera de horario punta. Instalar banco de capacitores para mejorar factor de potencia y reducir kVAr facturados. Evaluar generación solar para autoabasto parcial.',
   'medium', 'medium',
   '2025-12-31',
   null, 'in_progress', 'user_original'),

  ('ri100000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001',
   'risk', 'Falla de caldera principal B-01 por corrosión interna',
   'Inspección de octubre 2025 detectó signos de corrosión en tubo de humos. Una falla no planificada detendría la producción de vapor y afectaría la producción durante 5-10 días.',
   'Informe de inspección preventiva oct-2025',
   'steam', 'medium', 'high', false,
   'Programar inspección interna completa en diciembre 2025. Tratar agua de alimentación para reducir dureza <5 ppm. Instalar inhibidor de corrosión. Plan de contingencia con caldera portátil disponible.',
   'low', 'high',
   '2025-12-31',
   null, 'in_progress', 'user_original'),

  ('ri100000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001',
   'risk', 'Nuevas regulaciones de eficiencia energética para sector industrial',
   'Se espera publicación de NOM-028-ENER actualizada en 2026 con requisitos de medición y reporte para plantas con consumo >1 GWh/año. Puede requerir inversiones en medición adicional.',
   'Consulta con cámara industrial + DOF',
   'electricity', 'medium', 'medium', false,
   'Mantener sistema de medición actualizado y documentado. El sistema VersaEnergy ya cumple con los requisitos de registro y reporte. Revisar NOM publicada cuando esté disponible.',
   'low', 'medium',
   '2026-06-30',
   null, 'open', 'user_original'),

  ('ri100000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001',
   'opportunity', 'Instalación de generación solar para autoabasto eléctrico',
   'El techo de la nave principal ofrece ~2,000 m² disponibles. Un sistema de 350 kWp generaría ~490,000 kWh/año reduciendo la factura eléctrica en ~$58,800 USD/año y la huella de carbono.',
   'Revisión energética S2-2025 + estudio de prefactibilidad',
   'electricity', 'low', 'high', true,
   'Fase 1: Ingeniería conceptual y análisis de techo (Q1-2026). Fase 2: Gestión de interconexión CFE. Fase 3: Instalación y comisionamiento. ROI estimado: 4.5 años.',
   null, null,
   '2026-03-31',
   null, 'open', 'user_original'),

  ('ri100000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001',
   'opportunity', 'Recuperación de calor residual en gases de caldera',
   'Los gases de escape de la caldera B-01 salen a 210°C. Un economizador de agua de alimentación podría recuperar ~180 kW térmicos, reduciendo el consumo de gas en ~8%.',
   'Auditoría energética interna jun-2025',
   'natural_gas', 'low', 'medium', false,
   'Cotizar economizador para caldera de 200 BHP. Estudio de prefactibilidad en Q2-2026. Ahorro estimado: 9,500 Nm3 gas/año (~$11,400 USD/año).',
   null, null,
   '2026-06-30',
   '50000000-0000-0000-0000-000000000004', 'open', 'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SGEn — Auditoría interna con checklist ejecutado
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_audits (id, site_id, title, scope, planned_date, actual_date, questions, status, content_origin) values
  ('au100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Auditoría interna SGEn 2025',
   'Revisión completa del SGEn: alcance, política, revisiones energéticas, SEUs, EnPIs, objetivos, medición, acciones, evidencias y correcciones.',
   '2025-06-15',
   '2025-06-20',
   '[
     {"topic":"Contexto y sistema","question":"¿Los límites del sistema cubren todas las fuentes de energía significativas y se documentaron las exclusiones con justificación?","evidence":"Alcance aprobado, utilities incluidos y excluidos con justificación.","result":"ok","evidence_note":"Alcance v1 aprobado con 5 utilities incluidos. Exclusión de edificio administrativo justificada (<3% consumo)."},
     {"topic":"Liderazgo y política","question":"¿La política energética contiene compromisos verificables con datos del sistema?","evidence":"Política vigente con versión y fecha, compromisos cuantificables.","result":"ok","evidence_note":"Política v2.0 activa desde ene-2025. Compromisos ligados a EnPIs con metas numéricas."},
     {"topic":"Liderazgo y política","question":"¿Existen roles y responsabilidades formalmente asignadas para la operación y mejora del SGEn?","evidence":"Organigrama energético o matriz de responsabilidades.","result":"gap","evidence_note":"No existe documento formal de roles. Ing. de Energía asume informalmente, pero no hay registro de asignación formal."},
     {"topic":"Planificación","question":"¿Los riesgos y oportunidades están registrados, priorizados y con tratamiento definido?","evidence":"Registro de riesgos con probabilidad, impacto, plan de tratamiento y estado.","result":"ok","evidence_note":"5 riesgos/oportunidades registrados con matriz prob×impacto y plan de tratamiento."},
     {"topic":"Revisión energética","question":"¿La revisión energética documenta consumo y costos por fuente con datos verificables?","evidence":"Revisión documentada, balances del periodo, fuente de datos declarada.","result":"ok","evidence_note":"Dos revisiones documentadas (S1 y S2 2025) con consumos por utility y calidad de datos >88%."},
     {"topic":"SEUs","question":"¿Cada uso significativo tiene criterio de significancia documentado?","evidence":"Criterio de significancia por SEU, score justificado.","result":"ok","evidence_note":"3 SEUs con criterio: C-01 (85), B-01 (92), CH-01 (72). Criterios operacionales y variables capturados."},
     {"topic":"SEUs","question":"¿Los SEUs tienen criterios operativos definidos: rangos normales, setpoints, condiciones de alarma?","evidence":"Criterios de operación documentados en el SEU.","result":"ok","evidence_note":"Criterios operacionales documentados para los 3 SEUs en el sistema."},
     {"topic":"Indicadores y metas","question":"¿Los EnPIs tienen líneas base y metas que permiten cuantificar la mejora?","evidence":"EnPIs activos con baseline, target definido y periodo de referencia.","result":"ok","evidence_note":"4 EnPIs activos con baseline 2024 y metas 2025."},
     {"topic":"Plan de acción","question":"¿Los proyectos de mejora tienen estimado de ahorro, inversión y método de verificación?","evidence":"Acciones con ahorro estimado, inversión y método M&V.","result":"ok","evidence_note":"Proyecto VSD compresor: 85,000 kWh/año, $45,000 inversión, método baseline_model."},
     {"topic":"Medición y datos","question":"¿Los medidores críticos para EnPIs tienen programa de calibración?","evidence":"Registros de calibración, fechas, resultados.","result":"gap","evidence_note":"EM-001 y FQI-101 calibrados (vigentes hasta 2027). FQI-201 vence en marzo 2027. PERO no existe programa documentado formal de calibración — solo registros individuales."},
     {"topic":"Correcciones","question":"¿Las no conformidades tienen análisis de causa, acción correctiva, responsable y fecha?","evidence":"NCs registradas con causa probable, acción, dueño y fecha.","result":"ok","evidence_note":"2 NCs activas con causa documentada y acción correctiva asignada."},
     {"topic":"Evidencia","question":"¿La evidencia del sistema está organizada y es recuperable?","evidence":"Registros con fecha reciente, versionados, sin vacíos.","result":"ok","evidence_note":"Evidencia documentada por dominio. Snapshots automáticos + notas manuales de auditorías anteriores."},
     {"topic":"Revisión directiva","question":"¿La revisión por la dirección incluye información actualizada sobre desempeño, objetivos, auditorías y recursos?","evidence":"Acta de revisión con todas las entradas requeridas.","result":"gap","evidence_note":"La última revisión directiva es de 2024. Pendiente agendar revisión S1-2025 con paquete completo de datos."}
   ]'::jsonb,
   'completed', 'app_original')
on conflict (id) do nothing;

insert into sgen_audit_findings (id, audit_id, finding_text, severity, status, content_origin) values
  ('af100000-0000-0000-0000-000000000001', 'au100000-0000-0000-0000-000000000001',
   'No existe documento formal de roles y responsabilidades energéticas. El Ing. de Energía actúa informalmente. Sin evidencia escrita de asignación.',
   'minor', 'open', 'user_original'),
  ('af100000-0000-0000-0000-000000000002', 'au100000-0000-0000-0000-000000000001',
   'No existe un programa documentado de calibración. Los registros individuales de cada medidor están disponibles pero no hay un plan maestro con frecuencias, responsables y seguimiento centralizado.',
   'minor', 'open', 'user_original'),
  ('af100000-0000-0000-0000-000000000003', 'au100000-0000-0000-0000-000000000001',
   'La revisión por la dirección está vencida. La última fue diciembre 2024. Para agosto 2025 se requiere la revisión S1 con el paquete completo de indicadores, objetivos y acciones.',
   'minor', 'addressed', 'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SGEn — No conformidades en ciclo de vida real
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_nonconformities (id, site_id, source, description, severity, probable_cause, corrective_action, due_date, verification_of_effectiveness, status, content_origin) values
  ('nc100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Auditoría interna SGEn 2025',
   'No existe documento formal de asignación de roles y responsabilidades energéticas. El Ing. de Energía actúa de forma informal sin evidencia escrita.',
   'minor',
   'El SGEn fue implementado de manera operativa sin formalizar la estructura de responsabilidades. No se incluyó en el plan de implementación inicial.',
   'Elaborar y aprobar matriz de roles energéticos firmada por dirección. Incluir responsabilidades de medición, SEUs, objetivos y auditorías. Publicar en sistema y tablero.',
   '2025-09-30',
   null,
   'in_progress', 'user_original'),

  ('nc100000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001',
   'Auditoría interna SGEn 2025',
   'No existe programa maestro de calibración. Los registros individuales de calibración de medidores están disponibles pero no hay un plan centralizado con frecuencias, responsables y seguimiento.',
   'minor',
   'Los registros de calibración se generan al calibrar cada equipo pero no existe un proceso de gestión centralizada del programa.',
   'Crear programa maestro de calibración en el sistema con: todos los medidores críticos para EnPIs, frecuencia de calibración, responsable, próxima fecha y resultado. Revisar trimestralmente.',
   '2025-10-31',
   null,
   'open', 'user_original'),

  ('nc100000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001',
   'Inspección operacional',
   'Fuga de vapor detectada en trampa termodinámica TRP-03 del intercambiador HX-01. Pérdida estimada: 200 kg vapor/día (~$14/día).',
   'major',
   'La trampa de vapor no recibió el mantenimiento preventivo programado para Q3-2024. Se venció la fecha de inspección sin ejecución.',
   'Reemplazar trampa TRP-03 de manera inmediata. Agregar al programa de mantenimiento preventivo semestral. Revisar todas las trampas de vapor en la planta (programa trimestral).',
   '2025-08-15',
   'Después de reemplazo de TRP-03 en agosto 2025, el consumo de vapor bajó de 232,000 a 218,000 kg/mes en septiembre. Medición verificada con FQI-101. Trampa operando correctamente en inspección visual y prueba de temperatura.',
   'closed', 'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SGEn — Revisión directiva con datos del sistema
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_management_reviews (id, site_id, title, period_start, period_end, meeting_date, attendees, energy_performance_summary, objectives_status, actions_projects_status, audit_results, risks_opportunities_status, resource_needs, decisions, follow_up_deadline, status, content_origin) values
  ('mr100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'Revisión de dirección — Primer semestre 2025',
   '2025-01-01', '2025-06-30',
   '2025-07-10',
   '{"Director General","Gerente de Operaciones","Ing. de Energía","Jefe de Mantenimiento","Jefe de Producción"}',
   'Revisión del desempeño energético S1-2025:

EnPI kWh/ton: inicio de semestre 130.2 → junio 128.4 (mejora de 1.4%). Por debajo de la meta de 115 kWh/ton, pero con tendencia positiva.
EnPI kg vapor/ton: 2,895 → 2,850 (estabilizado en baseline). La trampa rota (NC-003) afectó el indicador en Q2.
Consumo total: 572,400 kWh electricidad (+4.2% vs S1-2024). El VSD aún no completa la instalación.
Calidad de datos: 88-91% en todos los utilities.',

   'Objetivo 1 (kWh/ton ≤115): En progreso — mejora gradual. Depende de cierre del proyecto VSD.
Objetivo 2 (kg vapor/ton ≤2,650): En progreso — afectado por trampa rota. Se espera mejora en S2 con recuperación de condensado.',

   'Proyecto VSD Compresor C-01: Fase 3 (instalación) al 60%. Fecha estimada de cierre: septiembre 2025.
Acción fuga de aire empaque: Completada. Ahorro verificado 12,000 kWh/año.
Ajuste setpoint chiller: Cerrado S1-2024. Ahorro confirmado 15,000 kWh/mes (6 meses).
Recuperación condensado HX-01: Identificada, pendiente de inicio.',

   'Auditoría interna SGEn junio 2025: 10 OK / 3 GAP.
GAPs: roles formales, programa calibración, revisión directiva vencida.
NC-001 (roles): en progreso. NC-002 (calibración): abierta. NC-003 (trampa vapor): cerrada con evidencia.
Estado general: sistema vivo pero requiere formalización de estructura.',

   'Riesgo tarifa CFE: en tratamiento — estudio de banco de capacitores iniciado.
Riesgo corrosión caldera: en tratamiento — inspección programada para diciembre.
Oportunidad solar fotovoltaica: pendiente de evaluar — alta potencial de impacto.
Oportunidad recuperación calor caldera: pendiente de cotización.',

   'Contratar técnico de instrumentación para liberar al Ing. de Energía de lecturas manuales.
Presupuesto para medidor de área de empaque (cierre de brecha de medición).
Asignar $8,000 USD para proyecto de recuperación de condensado en Q3-2025.',

   '[{"decision":"Aprobar presupuesto de $8,000 USD para recuperación de condensado HX-01","owner":"Director General","due_date":"2025-08-01"},{"decision":"Contratar servicio de calibración para programa maestro antes de octubre 2025","owner":"Jefe de Mantenimiento","due_date":"2025-10-01"},{"decision":"Elaborar estudio de factibilidad solar fotovoltaica para presentar en revisión de dirección Q4-2025","owner":"Ing. de Energía","due_date":"2025-11-30"},{"decision":"Formalizar matriz de roles energéticos y presentar a dirección para firma","owner":"Ing. de Energía","due_date":"2025-09-15"}]'::jsonb,
   '2025-10-15',
   'completed', 'user_original')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SGEn — Evidencia adicional (snapshots y notas)
-- ─────────────────────────────────────────────────────────────────────────────

insert into sgen_evidence (id, site_id, title, description, domain, linked_entity_type, linked_entity_id, source_type, status) values
  ('70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001',
   'Política energética v2.0 — comunicación',
   'Política activa desde enero 2025. Publicada en tablero y presentada en reunión general. Disponible en sistema.',
   'revision', 'site', '40000000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001',
   'Auditoría interna SGEn 2025 — Informe ejecutivo',
   'Auditoría ejecutada 20-jun-2025. 13 preguntas: 10 OK, 3 GAP. Hallazgos formalizados como NCs. Estado general del SGEn: operativo con áreas de mejora.',
   'auditoria', 'audit', 'au100000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001',
   'Objetivo kWh/ton — alcanzado en diciembre 2025',
   'EnPI kWh/ton llegó a 117.9 en diciembre 2025 (-6.1% vs baseline). Objetivo de 115 no alcanzado pero tendencia positiva validada.',
   'objetivos', 'site', '40000000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted'),
  ('70000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001',
   'NC-003 cerrada — Trampa vapor HX-01 reemplazada',
   'Trampa TRP-03 reemplazada agosto 2025. Consumo vapor bajó de 232,000 a 218,000 kg/mes. Verificación con FQI-101 durante septiembre.',
   'correccion', 'site', '40000000-0000-0000-0000-000000000001', 'manual_note', 'accepted'),
  ('70000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001',
   'Snapshot SGEn — Cierre de año 2025',
   'Estado: 2 revisiones energéticas, 3 SEUs activos, 2 objetivos (1 alcanzado, 1 en progreso), 1 auditoría completada, 2 NCs abiertas, 5 riesgos/oportunidades.',
   'cockpit', 'site', '40000000-0000-0000-0000-000000000001', 'system_snapshot', 'accepted')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. EnPI — Variables significativas y datos de 18 meses para regresión
--
--  EnPI 1: kWh/ton producida (electricity)
--    Variables: temperatura_exterior (°C, promedio), produccion_mensual (ton, suma),
--               horas_operacion (h, suma)
--
--  El objetivo es que la regresión muestre:
--    - r(EnPI, temp) ≈ +0.95  → muy fuerte positiva (verano = más HVAC)
--    - r(EnPI, prod) ≈ -0.72  → fuerte negativa (economías de escala)
--    - r(EnPI, horas) ≈ +0.15 → no significativa
--    - Regresión múltiple R² ≈ 0.92
-- ─────────────────────────────────────────────────────────────────────────────

insert into enpi_significant_variables (id, enpi_id, name, description, unit, data_type, aggregation_method, expected_impact, sort_order, is_active) values
  -- Variables para kWh/ton
  ('v1000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001',
   'Temperatura exterior promedio',
   'Temperatura media mensual del aire exterior. Mayor temperatura aumenta la carga de HVAC y por tanto el consumo eléctrico total, elevando el EnPI.',
   '°C', 'continuous', 'average', 'positive', 1, true),
  ('v1000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001',
   'Producción mensual',
   'Toneladas producidas en el mes. Mayor producción distribuye el consumo eléctrico fijo en más unidades, mejorando el EnPI (economías de escala).',
   'ton', 'discrete', 'sum', 'negative', 2, true),
  ('v1000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001',
   'Horas de operación productiva',
   'Horas totales con producción activa en el mes. Más horas de marcha en vacío elevan el EnPI.',
   'h', 'discrete', 'sum', 'positive', 3, true),
  -- Variables para kg vapor/ton (EnPI 3)
  ('v1000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000003',
   'Presión de vapor promedio',
   'Presión media de operación del header de vapor. Mayor presión requiere más energía de generación por kg de vapor.',
   'bar', 'continuous', 'average', 'positive', 1, true),
  ('v1000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000003',
   'Producción mensual',
   'Toneladas producidas. Economías de escala en el consumo de vapor de proceso.',
   'ton', 'discrete', 'sum', 'negative', 2, true)
on conflict (id) do nothing;

-- ─── 18 meses de datos de variables y EnPI ────────────────────────────────────
-- Datos calibrados para mostrar regresiones claras y útiles.
-- Ene-2025 = mes 1, Jun-2026 = mes 18.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  months text[][] := array[
    --  label          start          end           enpi1   temp   prod   horas  enpi3   pres_vap  prod3
    array['Ene-2025','2025-01-01','2025-01-31', '119.2','12.1','882','720','2810','8.1','882'],
    array['Feb-2025','2025-02-01','2025-02-28', '120.8','14.3','851','672','2830','8.2','851'],
    array['Mar-2025','2025-03-01','2025-03-31', '122.5','18.7','863','720','2845','8.0','863'],
    array['Abr-2025','2025-04-01','2025-04-30', '124.1','22.4','835','696','2860','8.1','835'],
    array['May-2025','2025-05-01','2025-05-31', '126.3','26.8','812','720','2875','8.3','812'],
    array['Jun-2025','2025-06-01','2025-06-30', '128.4','30.5','773','696','2895','8.2','773'],
    array['Jul-2025','2025-07-01','2025-07-31', '130.2','32.1','741','720','2910','8.4','741'],
    array['Ago-2025','2025-08-01','2025-08-31', '128.9','31.2','754','720','2900','8.3','754'],
    array['Sep-2025','2025-09-01','2025-09-30', '127.3','27.3','781','696','2870','8.1','781'],
    array['Oct-2025','2025-10-01','2025-10-31', '123.8','22.1','843','720','2840','7.9','843'],
    array['Nov-2025','2025-11-01','2025-11-30', '120.4','16.2','872','696','2815','7.8','872'],
    array['Dic-2025','2025-12-01','2025-12-31', '117.9','13.4','891','720','2790','7.7','891'],
    array['Ene-2026','2026-01-01','2026-01-31', '117.2','12.4','908','720','2780','7.7','908'],
    array['Feb-2026','2026-02-01','2026-02-28', '119.1','15.1','873','672','2800','7.9','873'],
    array['Mar-2026','2026-03-01','2026-03-31', '121.8','19.2','862','720','2828','8.0','862'],
    array['Abr-2026','2026-04-01','2026-04-30', '124.3','23.5','843','696','2855','8.1','843'],
    array['May-2026','2026-05-01','2026-05-31', '126.9','27.4','821','720','2878','8.2','821'],
    array['Jun-2026','2026-06-01','2026-06-30', '129.6','31.4','792','696','2905','8.4','792']
  ];
  m text[];
  enpi1_val numeric;
  enpi3_val numeric;
begin
  foreach m slice 1 in array months loop
    enpi1_val := m[4]::numeric;
    enpi3_val := m[9]::numeric;

    -- EnPI 1: kWh/ton
    insert into enpi_period_values (enpi_id, period_label, period_start, period_end, actual_value)
    values ('22000000-0000-0000-0000-000000000001', m[1], m[2]::date, m[3]::date, enpi1_val)
    on conflict (enpi_id, period_start) do nothing;

    -- Temperatura exterior (variable 1)
    insert into enpi_variable_period_values (variable_id, period_label, period_start, period_end, value, source)
    values ('v1000000-0000-0000-0000-000000000001', m[1], m[2]::date, m[3]::date, m[5]::numeric, 'manual')
    on conflict (variable_id, period_start) do nothing;

    -- Producción mensual (variable 2 para EnPI 1)
    insert into enpi_variable_period_values (variable_id, period_label, period_start, period_end, value, source)
    values ('v1000000-0000-0000-0000-000000000002', m[1], m[2]::date, m[3]::date, m[6]::numeric, 'manual')
    on conflict (variable_id, period_start) do nothing;

    -- Horas de operación (variable 3)
    insert into enpi_variable_period_values (variable_id, period_label, period_start, period_end, value, source)
    values ('v1000000-0000-0000-0000-000000000003', m[1], m[2]::date, m[3]::date, m[7]::numeric, 'manual')
    on conflict (variable_id, period_start) do nothing;

    -- EnPI 3: kg vapor/ton
    insert into enpi_period_values (enpi_id, period_label, period_start, period_end, actual_value)
    values ('22000000-0000-0000-0000-000000000003', m[1], m[2]::date, m[3]::date, enpi3_val)
    on conflict (enpi_id, period_start) do nothing;

    -- Presión de vapor promedio (variable 4)
    insert into enpi_variable_period_values (variable_id, period_label, period_start, period_end, value, source)
    values ('v1000000-0000-0000-0000-000000000004', m[1], m[2]::date, m[3]::date, m[10]::numeric, 'manual')
    on conflict (variable_id, period_start) do nothing;

    -- Producción mensual (variable 5 para EnPI 3)
    insert into enpi_variable_period_values (variable_id, period_label, period_start, period_end, value, source)
    values ('v1000000-0000-0000-0000-000000000005', m[1], m[2]::date, m[3]::date, m[11]::numeric, 'manual')
    on conflict (variable_id, period_start) do nothing;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Corrección: energy_improvements sin source_enpi_id → vincular a EnPI
-- ─────────────────────────────────────────────────────────────────────────────

update energy_improvements set
  source_enpi_id = '22000000-0000-0000-0000-000000000002'
where id = '50000000-0000-0000-0000-000000000001'; -- VSD compresor → EnPI Nm3 aire/unidad

update energy_improvements set
  source_enpi_id = '22000000-0000-0000-0000-000000000004'
where id = '50000000-0000-0000-0000-000000000003'; -- Ajuste chiller → EnPI TR-h/m2

update energy_improvements set
  source_enpi_id = '22000000-0000-0000-0000-000000000003'
where id = '50000000-0000-0000-0000-000000000004'; -- Recuperación condensado → EnPI kg/ton

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Diagrama eléctrico — publicar versión del diagrama de vapor también
-- ─────────────────────────────────────────────────────────────────────────────

insert into energy_diagram_versions (id, diagram_id, version_number, status, label, is_published, snapshot, node_count, edge_count, published_at) values
  ('14000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 1, 'draft', 'Seed borrador', false, '{}', 8, 5, null),
  ('14000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 1, 'draft', 'Seed borrador', false, '{}', 7, 5, null)
on conflict (diagram_id, version_number) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fin seed_phase2.sql
-- ─────────────────────────────────────────────────────────────────────────────
