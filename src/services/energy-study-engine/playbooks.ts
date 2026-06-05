import type { StudyPlaybook, StudyType } from './types'

export function getStudyPlaybook(studyType: StudyType): StudyPlaybook {
  const common = {
    title: 'Ruta de decision tecnica',
    intent: 'Convertir una pregunta energetica en una salida gobernable.',
  }

  const playbooks: Record<StudyType, StudyPlaybook> = {
    area_process_intensity: {
      ...common,
      steps: [
        { id: 'boundary', label: 'Cerrar frontera', detail: 'Confirma que la energia corresponda al area o proceso estudiado.' },
        { id: 'driver', label: 'Validar driver', detail: 'Produccion, horas o mezcla deben explicar fisicamente el consumo.' },
        { id: 'enpi', label: 'Gobernar metrica', detail: 'Promueve a EnPI cuando la cobertura y estabilidad sean suficientes.', decision: 'promote_enpi' },
      ],
    },
    equipment_efficiency: {
      ...common,
      steps: [
        { id: 'input_output', label: 'Entrada vs salida', detail: 'Relaciona consumo, carga util y horas de operacion.' },
        { id: 'losses', label: 'Separar perdidas', detail: 'Distingue deterioro, carga parcial, fugas y mala medicion.' },
        { id: 'quick_action', label: 'Accion rapida', detail: 'Si hay desviacion puntual, crea ajuste/inspeccion/correccion corta.', decision: 'create_quick_action' },
        { id: 'project', label: 'Proyecto', detail: 'Si requiere inversion o cronograma, crea proyecto con fases y M&V.', decision: 'create_project' },
      ],
    },
    multi_utility_normalization: {
      ...common,
      steps: [
        { id: 'native', label: 'Conservar unidades nativas', detail: 'No pierdas kWh, kg, Nm3 ni costos originales.' },
        { id: 'conversion', label: 'Conversion trazable', detail: 'Cada utility necesita factor, fuente y version.' },
        { id: 'evidence', label: 'Evidenciar criterio', detail: 'Guarda snapshot SGEn si soporta revision energetica.', decision: 'create_sgen_evidence' },
      ],
    },
    utility_choice: {
      ...common,
      steps: [
        { id: 'constraints', label: 'Listar restricciones', detail: 'Costo, emisiones, capacidad, seguridad y calidad del proceso.' },
        { id: 'scenario', label: 'Comparar escenarios', detail: 'Evalua costo marginal, CO2e y energia util.' },
        { id: 'project', label: 'Decidir cambio', detail: 'Crea proyecto si la opcion domina tecnicamente y requiere gestion estructurada.', decision: 'create_project' },
      ],
    },
    peak_detective: {
      ...common,
      steps: [
        { id: 'window', label: 'Aislar ventana', detail: 'Identifica hora, turno, linea y simultaneidad del pico.' },
        { id: 'cause', label: 'Buscar causa operacional', detail: 'Arranques, limpieza, demanda contratada o control manual.' },
        { id: 'measurement', label: 'Pedir medicion', detail: 'Si faltan submedidores, registra brecha antes de decidir.', decision: 'request_measurement' },
      ],
    },
    loss_hunt: {
      ...common,
      steps: [
        { id: 'closure', label: 'Cerrar balance', detail: 'Separa medido, calculado, estimado y no explicado.' },
        { id: 'field', label: 'Contrastar en campo', detail: 'Prioriza fugas, retornos pobres y cargas no inventariadas.' },
        { id: 'quick_action', label: 'Capturar mejora', detail: 'Abre accion rapida si la perdida puede corregirse en campo.', decision: 'create_quick_action' },
        { id: 'project', label: 'Escalar a proyecto', detail: 'Escala si la perdida exige rediseño, presupuesto o varias tareas.', decision: 'create_project' },
      ],
    },
    baseline_model: {
      ...common,
      steps: [
        { id: 'variables', label: 'Probar variables', detail: 'Incluye solo variables fisicamente plausibles.' },
        { id: 'residuals', label: 'Revisar residuales', detail: 'Busca sesgo por temporada, mezcla o cambios operativos.' },
        { id: 'enpi', label: 'Promover baseline', detail: 'Usa el modelo seleccionado para crear EnPI/baseline.', decision: 'promote_enpi' },
      ],
    },
    mv_guardian: {
      ...common,
      steps: [
        { id: 'baseline', label: 'Fijar referencia', detail: 'Selecciona ventana previa y umbral de degradacion.' },
        { id: 'monitoring', label: 'Vigilar ahorro', detail: 'Compara cada mes contra baseline y target.' },
        { id: 'quick_action', label: 'Reactivar accion', detail: 'Si el ahorro cae por ajuste simple, abre accion correctiva.', decision: 'create_quick_action' },
        { id: 'project', label: 'Replanificar proyecto', detail: 'Si el ahorro requiere intervencion mayor, crea proyecto de recuperacion.', decision: 'create_project' },
      ],
    },
  }

  return playbooks[studyType]
}
