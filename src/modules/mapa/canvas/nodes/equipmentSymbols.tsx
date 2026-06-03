/**
 * Mini símbolos IEC 60617 estilizados ("suaves") para tipos de equipo.
 * Reconocibles por un ingeniero pero amigables para no técnicos.
 * Todos usan `currentColor` y un viewBox 32×32.
 */

import type { ReactNode } from 'react'

function Svg({ size = 26, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

/** Transformador — dos devanados (círculos tangentes), IEC 60617 */
function TransformerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="21" r="7" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}

/** Motor — círculo con M */
function MotorSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">M</text>
    </Svg>
  )
}

/** Generador — círculo con G */
function GeneratorSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">G</text>
    </Svg>
  )
}

/** Bomba — círculo con triángulo de impulsión */
function PumpSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <polygon points="11,9 11,23 25,16" fill="currentColor" />
    </Svg>
  )
}

/** Compresor — círculo con cuña de compresión */
function CompressorSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <polygon points="9,9 23,12 23,20 9,23" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Svg>
  )
}

/** Caldera — recipiente con llama */
function BoilerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M16 12 C 13 15, 13 19, 16 21 C 19 19, 19 15, 16 12 Z" fill="currentColor" />
    </Svg>
  )
}

/** Chiller — recipiente con copo (frío) */
function ChillerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="10" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.5" y1="11.5" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20.5" y1="11.5" x2="11.5" y2="20.5" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Torre de enfriamiento — trapecio invertido */
function CoolingTowerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M7 7 L25 7 L21 25 L11 25 Z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M11 14 q5 4 10 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Svg>
  )
}

/** Tanque — cilindro */
function TankSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="8" y="7" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="16" cy="7" rx="8" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Tablero / panel — rectángulo con barras */
function PanelSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Intercambiador de calor — círculo con flechas opuestas */
function HeatExchangerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12 H24" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 20 H24" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="21,9 24,12 21,15" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <polyline points="11,17 8,20 11,23" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Svg>
  )
}

/** Consumidor / carga — cuadrado con diagonal (carga genérica) */
function ConsumerSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="7" y="7" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="7" y1="7" x2="25" y2="25" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Fuente / acometida — círculo con rayo o tilde */
function SourceSym({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M17 8 L11 17 H16 L15 24 L21 14 H16 Z" fill="currentColor" />
    </Svg>
  )
}

const SYMBOLS: Record<string, React.FC<{ size?: number }>> = {
  transformer:    TransformerSym,
  motor:          MotorSym,
  generator:      GeneratorSym,
  pump:           PumpSym,
  compressor:     CompressorSym,
  boiler:         BoilerSym,
  chiller:        ChillerSym,
  cooling_tower:  CoolingTowerSym,
  tank:           TankSym,
  panel:          PanelSym,
  heat_exchanger: HeatExchangerSym,
  consumer:       ConsumerSym,
  utility_source: SourceSym,
}

/** Devuelve el símbolo IEC para un tipo de equipo, o null si no hay. */
export function getEquipmentSymbol(nodeType: string): React.FC<{ size?: number }> | null {
  return SYMBOLS[nodeType] ?? null
}
