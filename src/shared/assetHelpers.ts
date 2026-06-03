// Helpers de activos — espejo del contrato CMMS (apex-cmms v1.3.0).
// Energy adapta; el CMMS es autoritativo. No copiar RCM aquí (§13.1).

export type AssetType = 'plant' | 'area' | 'system' | 'equipment';
export type AssetCategory = 'rotating' | 'static' | 'electrical' | 'instrument' | 'civil' | 'other';
export type AssetCriticality = 'high' | 'medium' | 'low';
export type AssetStatus = 'active' | 'standby' | 'decommissioned';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  plant:     'Planta',
  area:      'Área',
  system:    'Sistema',
  equipment: 'Equipo',
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  plant:     '🏭',
  area:      '🗺️',
  system:    '⚙️',
  equipment: '🔧',
};

// Color por tipo de activo — para badges y encabezados en lentes energéticas.
export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  plant:     '#1B6FF8',
  area:      '#7c3aed',
  system:    '#0d9488',
  equipment: '#374151',
};

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  rotating:   'Rotativo',
  static:     'Estático',
  electrical: 'Eléctrico',
  instrument: 'Instrumentación',
  civil:      'Civil/Estructural',
  other:      'Otro',
};

export const CRITICALITY_CONFIG: Record<AssetCriticality, {
  label: string;
  color: string;
  bg: string;
}> = {
  high:   { label: 'Alta',  color: '#b91c1c', bg: '#fef2f2' },
  medium: { label: 'Media', color: '#0f6e56', bg: '#f0fdf4' },
  low:    { label: 'Baja',  color: '#185fa5', bg: '#eff6ff' },
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  active:          'Activo',
  standby:         'Reserva',
  decommissioned:  'Desafectado',
};

/** Icono emoji para un tipo de activo — shorthand para JSX. */
export function assetTypeIcon(type: AssetType): string {
  return ASSET_TYPE_ICONS[type] ?? '📦';
}

/** Ids de todos los descendientes de un activo en la lista plana. */
export function getDescendantIds(id: string, assets: { id: string; parentId: string | null }[]): string[] {
  const result: string[] = [];
  for (const child of assets.filter(a => a.parentId === id)) {
    result.push(child.id);
    result.push(...getDescendantIds(child.id, assets));
  }
  return result;
}

/** Un activo es borrable si no tiene hijos. */
export function canDeleteAsset(id: string, assets: { id: string; parentId: string | null }[]): boolean {
  return assets.every(a => a.parentId !== id);
}
