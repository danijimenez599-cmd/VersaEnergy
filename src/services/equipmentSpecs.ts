export type SpecFieldType = 'number' | 'text' | 'select'

export interface SpecField {
  key: string
  label: string
  unit?: string
  type: SpecFieldType
  placeholder?: string
  options?: string[]
  hint?: string
}

export interface SpecGroup {
  label: string
  fields: SpecField[]
}

export type EquipmentSpecSchema = SpecGroup[]

const EQUIPMENT_SPEC_SCHEMA: Record<string, EquipmentSpecSchema> = {
  // ── Eléctricos ────────────────────────────────────────────────────────────────
  transformer: [
    {
      label: 'Datos de placa',
      fields: [
        { key: 'kva_nominal',        label: 'Capacidad nominal',    unit: 'kVA',  type: 'number', placeholder: 'Ej. 500' },
        { key: 'voltage_primary',    label: 'Voltaje primario',     unit: 'kV',   type: 'number', placeholder: 'Ej. 13.2' },
        { key: 'voltage_secondary',  label: 'Voltaje secundario',   unit: 'V',    type: 'number', placeholder: 'Ej. 480' },
        { key: 'impedance_pct',      label: 'Impedancia',           unit: '%',    type: 'number', placeholder: 'Ej. 5.75' },
        { key: 'connection_group',   label: 'Grupo de conexión',                  type: 'select',
          options: ['Δ-Y', 'Y-Δ', 'Y-Y', 'Δ-Δ', 'Zig-zag'] },
        { key: 'cooling_type',       label: 'Tipo de enfriamiento',               type: 'select',
          options: ['ONAN', 'ONAF', 'OFAF', 'Seco (AN)', 'Seco (AF)'] },
      ],
    },
    {
      label: 'Operación',
      fields: [
        { key: 'power_factor',       label: 'Factor de potencia',                 type: 'number', placeholder: 'Ej. 0.85' },
        { key: 'efficiency_pct',     label: 'Eficiencia',           unit: '%',    type: 'number', placeholder: 'Ej. 98.5' },
        { key: 'no_load_losses_kw',  label: 'Pérdidas en vacío',    unit: 'kW',   type: 'number' },
        { key: 'full_load_losses_kw',label: 'Pérdidas plena carga', unit: 'kW',   type: 'number' },
      ],
    },
  ],

  panel: [
    {
      label: 'Datos principales',
      fields: [
        { key: 'voltage_nominal',    label: 'Tensión nominal',      unit: 'V',    type: 'number', placeholder: 'Ej. 480' },
        { key: 'current_nominal',    label: 'Corriente nominal',    unit: 'A',    type: 'number', placeholder: 'Ej. 1200' },
        { key: 'main_breaker_a',     label: 'Disyuntor principal',  unit: 'A',    type: 'number' },
        { key: 'phases',             label: 'Fases',                              type: 'select',
          options: ['Monofásico', 'Bifásico', 'Trifásico'] },
        { key: 'circuit_count',      label: 'Número de circuitos',               type: 'number', placeholder: 'Ej. 24' },
      ],
    },
    {
      label: 'Comunicación',
      fields: [
        { key: 'protocol',           label: 'Protocolo',                          type: 'select',
          options: ['Ninguno', 'Modbus RTU', 'Modbus TCP', 'BACnet', 'PROFIBUS', 'Ethernet/IP'] },
        { key: 'metering_class',     label: 'Clase de medición',                 type: 'select',
          options: ['0.2S', '0.5S', '1', '2', '—'] },
      ],
    },
  ],

  generator: [
    {
      label: 'Datos de placa',
      fields: [
        { key: 'kva_nominal',        label: 'Capacidad',            unit: 'kVA',  type: 'number', placeholder: 'Ej. 500' },
        { key: 'kw_nominal',         label: 'Potencia activa',      unit: 'kW',   type: 'number' },
        { key: 'voltage_output',     label: 'Voltaje de salida',    unit: 'V',    type: 'number', placeholder: 'Ej. 480' },
        { key: 'frequency',          label: 'Frecuencia',           unit: 'Hz',   type: 'select', options: ['60', '50'] },
        { key: 'power_factor',       label: 'Factor de potencia',                 type: 'number', placeholder: 'Ej. 0.8' },
      ],
    },
    {
      label: 'Motor primario',
      fields: [
        { key: 'engine_type',        label: 'Tipo de motor',                      type: 'select',
          options: ['Diésel', 'Gas natural', 'GLP', 'Gasolina', 'Vapor'] },
        { key: 'engine_rpm',         label: 'Velocidad',            unit: 'RPM',  type: 'number', placeholder: 'Ej. 1800' },
        { key: 'fuel_consumption',   label: 'Consumo combustible',  unit: 'L/h',  type: 'number' },
      ],
    },
  ],

  // ── Motores ───────────────────────────────────────────────────────────────────
  motor: [
    {
      label: 'Datos de placa',
      fields: [
        { key: 'kw_nominal',         label: 'Potencia nominal',     unit: 'kW',   type: 'number', placeholder: 'Ej. 75' },
        { key: 'voltage_nominal',    label: 'Voltaje nominal',      unit: 'V',    type: 'number', placeholder: 'Ej. 480' },
        { key: 'current_nominal',    label: 'Corriente nominal',    unit: 'A',    type: 'number' },
        { key: 'power_factor',       label: 'Factor de potencia',                 type: 'number', placeholder: 'Ej. 0.88' },
        { key: 'efficiency_pct',     label: 'Eficiencia (η)',        unit: '%',    type: 'number', placeholder: 'Ej. 94.5' },
        { key: 'rpm',                label: 'Velocidad nominal',    unit: 'RPM',  type: 'number', placeholder: 'Ej. 1800' },
      ],
    },
    {
      label: 'Clasificación',
      fields: [
        { key: 'insulation_class',   label: 'Clase de aislamiento',               type: 'select',
          options: ['A', 'B', 'F', 'H'] },
        { key: 'ip_class',           label: 'Protección (IP)',                    type: 'text',   placeholder: 'Ej. IP55' },
        { key: 'nema_frame',         label: 'Frame NEMA',                         type: 'text',   placeholder: 'Ej. 324T' },
        { key: 'ie_class',           label: 'Clase IE',                           type: 'select',
          options: ['IE1', 'IE2', 'IE3', 'IE4'] },
      ],
    },
  ],

  // ── Mecánicos / Fluidos ───────────────────────────────────────────────────────
  compressor: [
    {
      label: 'Desempeño',
      fields: [
        { key: 'kw_nominal',         label: 'Potencia nominal',     unit: 'kW',   type: 'number', placeholder: 'Ej. 132' },
        { key: 'flow_m3min',         label: 'Caudal libre',         unit: 'm³/min', type: 'number', placeholder: 'Ej. 24.5' },
        { key: 'discharge_bar',      label: 'Presión descarga',     unit: 'bar',  type: 'number', placeholder: 'Ej. 8.5' },
        { key: 'inlet_bar',          label: 'Presión aspiración',   unit: 'bar',  type: 'number', placeholder: 'Ej. 1.0' },
        { key: 'isothermal_eff_pct', label: 'Eficiencia isotérmica',unit: '%',    type: 'number' },
      ],
    },
    {
      label: 'Tipo y refrigeración',
      fields: [
        { key: 'compressor_type',    label: 'Tipo de compresor',                  type: 'select',
          options: ['Tornillo rotativo', 'Pistón/Reciprocante', 'Centrífugo', 'Scroll', 'Lóbulos'] },
        { key: 'cooling',            label: 'Refrigeración',                      type: 'select',
          options: ['Aire', 'Agua', 'Aceite (integrado)'] },
        { key: 'design_hours',       label: 'Horas diseño/año',    unit: 'h/año', type: 'number', placeholder: 'Ej. 6000' },
      ],
    },
  ],

  pump: [
    {
      label: 'Hidráulica',
      fields: [
        { key: 'flow_m3h',           label: 'Caudal nominal',       unit: 'm³/h', type: 'number', placeholder: 'Ej. 120' },
        { key: 'head_m',             label: 'Altura manométrica',   unit: 'm',    type: 'number', placeholder: 'Ej. 45' },
        { key: 'kw_nominal',         label: 'Potencia del motor',   unit: 'kW',   type: 'number', placeholder: 'Ej. 22' },
        { key: 'efficiency_pct',     label: 'Eficiencia (η)',        unit: '%',    type: 'number' },
        { key: 'npsh_m',             label: 'NPSHr',                unit: 'm',    type: 'number' },
      ],
    },
    {
      label: 'Tipo y fluido',
      fields: [
        { key: 'pump_type',          label: 'Tipo de bomba',                      type: 'select',
          options: ['Centrífuga', 'Axial', 'Desplazamiento positivo', 'Dosificadora', 'Sumergible'] },
        { key: 'fluid',              label: 'Fluido manejado',                    type: 'text',   placeholder: 'Ej. Agua helada' },
        { key: 'rpm',                label: 'Velocidad',            unit: 'RPM',  type: 'number' },
      ],
    },
  ],

  // ── Térmicos ─────────────────────────────────────────────────────────────────
  boiler: [
    {
      label: 'Capacidad',
      fields: [
        { key: 'capacity_kgh',       label: 'Producción vapor',     unit: 'kg/h', type: 'number', placeholder: 'Ej. 5000' },
        { key: 'capacity_kcalh',     label: 'Capacidad térmica',    unit: 'kcal/h', type: 'number' },
        { key: 'efficiency_pct',     label: 'Rendimiento',          unit: '%',    type: 'number', placeholder: 'Ej. 88' },
        { key: 'steam_pressure_bar', label: 'Presión vapor',        unit: 'bar',  type: 'number', placeholder: 'Ej. 10' },
        { key: 'steam_temp_c',       label: 'Temperatura vapor',    unit: '°C',   type: 'number', placeholder: 'Ej. 185' },
      ],
    },
    {
      label: 'Combustible y tipo',
      fields: [
        { key: 'fuel',               label: 'Combustible',                        type: 'select',
          options: ['Gas natural', 'GLP', 'Diésel', 'Biomasa', 'Dual (gas/diésel)', 'Eléctrica'] },
        { key: 'boiler_type',        label: 'Tipo de caldera',                   type: 'select',
          options: ['Pirotubular', 'Acuotubular', 'Caldera pies/BHP', 'Termobloque'] },
        { key: 'bhp',                label: 'BHP',                               type: 'number' },
      ],
    },
  ],

  chiller: [
    {
      label: 'Capacidad',
      fields: [
        { key: 'tons_refrigeration', label: 'Toneladas refrigeración', unit: 'TR', type: 'number', placeholder: 'Ej. 200' },
        { key: 'cop_nominal',        label: 'COP nominal',                        type: 'number', placeholder: 'Ej. 4.5' },
        { key: 'kw_per_ton',         label: 'kW/TR',                unit: 'kW/TR', type: 'number', placeholder: 'Ej. 0.65' },
        { key: 'kw_nominal',         label: 'Potencia total',       unit: 'kW',   type: 'number' },
      ],
    },
    {
      label: 'Circuito y refrigerante',
      fields: [
        { key: 'refrigerant',        label: 'Refrigerante',                       type: 'select',
          options: ['R-134a', 'R-410A', 'R-407C', 'R-717 (NH3)', 'R-744 (CO2)', 'R-1234ze', 'Otro'] },
        { key: 'chilled_water_flow', label: 'Caudal agua helada',  unit: 'l/s',  type: 'number' },
        { key: 'delta_t_c',          label: 'ΔT diseño',           unit: '°C',   type: 'number', placeholder: 'Ej. 6' },
        { key: 'compressor_type',    label: 'Tipo compresor',                     type: 'select',
          options: ['Tornillo', 'Centrífugo', 'Scroll', 'Reciprocante'] },
      ],
    },
  ],

  cooling_tower: [
    {
      label: 'Desempeño',
      fields: [
        { key: 'tons_capacity',      label: 'Capacidad',            unit: 'TR',   type: 'number', placeholder: 'Ej. 200' },
        { key: 'water_flow_m3h',     label: 'Caudal agua',          unit: 'm³/h', type: 'number' },
        { key: 'fan_kw',             label: 'Potencia ventilador',  unit: 'kW',   type: 'number' },
        { key: 'delta_t_c',          label: 'ΔT diseño',           unit: '°C',   type: 'number', placeholder: 'Ej. 8' },
      ],
    },
    {
      label: 'Tipo',
      fields: [
        { key: 'tower_type',         label: 'Tipo',                               type: 'select',
          options: ['Abierta contraflujo', 'Abierta flujo cruzado', 'Cerrada', 'Evaporativa'] },
        { key: 'fill_material',      label: 'Material relleno',                   type: 'text',   placeholder: 'Ej. PVC film' },
      ],
    },
  ],

  heat_exchanger: [
    {
      label: 'Datos de diseño',
      fields: [
        { key: 'duty_kw',            label: 'Potencia de diseño',   unit: 'kW',   type: 'number' },
        { key: 'flow_hot_kgh',       label: 'Flujo lado caliente',  unit: 'kg/h', type: 'number' },
        { key: 'flow_cold_kgh',      label: 'Flujo lado frío',      unit: 'kg/h', type: 'number' },
        { key: 'temp_hot_in_c',      label: 'T entrada caliente',   unit: '°C',   type: 'number' },
        { key: 'temp_cold_out_c',    label: 'T salida frío',        unit: '°C',   type: 'number' },
      ],
    },
    {
      label: 'Tipo',
      fields: [
        { key: 'hx_type',            label: 'Tipo',                               type: 'select',
          options: ['Carcasa y tubos', 'Placas (PHE)', 'Espiral', 'Doble tubo', 'Aeroenfriador'] },
        { key: 'fluid_hot',          label: 'Fluido caliente',                    type: 'text',   placeholder: 'Ej. Vapor' },
        { key: 'fluid_cold',         label: 'Fluido frío',                        type: 'text',   placeholder: 'Ej. Agua proceso' },
      ],
    },
  ],

  tank: [
    {
      label: 'Características',
      fields: [
        { key: 'volume_m3',          label: 'Volumen',              unit: 'm³',   type: 'number', placeholder: 'Ej. 10' },
        { key: 'pressure_bar',       label: 'Presión diseño',       unit: 'bar',  type: 'number' },
        { key: 'temp_max_c',         label: 'Temperatura máx.',     unit: '°C',   type: 'number' },
        { key: 'fluid',              label: 'Fluido',                             type: 'text',   placeholder: 'Ej. Aire comprimido' },
      ],
    },
    {
      label: 'Tipo',
      fields: [
        { key: 'tank_type',          label: 'Tipo de tanque',                     type: 'select',
          options: ['Presurizado', 'Atmosférico', 'Criogénico', 'De proceso'] },
        { key: 'material',           label: 'Material',                           type: 'text',   placeholder: 'Ej. Acero inoxidable 316' },
      ],
    },
  ],

  consumer: [
    {
      label: 'Consumo',
      fields: [
        { key: 'rated_power_kw',     label: 'Potencia nominal',     unit: 'kW',   type: 'number' },
        { key: 'operating_hours',    label: 'Horas operación/año',  unit: 'h/año', type: 'number', placeholder: 'Ej. 6000' },
        { key: 'load_factor_pct',    label: 'Factor de carga',      unit: '%',    type: 'number', placeholder: 'Ej. 80' },
        { key: 'annual_kwh',         label: 'Consumo anual estimado', unit: 'kWh/año', type: 'number' },
      ],
    },
  ],
}

/** Devuelve el schema de campos para un tipo de equipo. Fallback a consumer. */
export function getEquipmentSpecSchema(equipmentType: string): EquipmentSpecSchema {
  return EQUIPMENT_SPEC_SCHEMA[equipmentType] ?? EQUIPMENT_SPEC_SCHEMA.consumer ?? []
}

/** Devuelve todos los keys del schema para un tipo de equipo (para inicializar el form) */
export function getEquipmentSpecKeys(equipmentType: string): string[] {
  const schema = getEquipmentSpecSchema(equipmentType)
  return schema.flatMap((group) => group.fields.map((f) => f.key))
}
