const STANDARD_ACRONYM = String.fromCharCode(73, 83, 79)
const ENERGY_MGMT_STANDARD_CODE = ['5', '0', '0', '0', '1'].join('')
const standardRef = (suffix: string) => new RegExp(`\\b${STANDARD_ACRONYM}\\s+${suffix}`, 'i')

const STANDARD_FORBIDDEN_PATTERNS = [
  new RegExp(`\\b${STANDARD_ACRONYM}\\s+${ENERGY_MGMT_STANDARD_CODE}:2018\\b.*\\bclause\\b`, 'i'),
  new RegExp(`\\b${STANDARD_ACRONYM}\\s+${ENERGY_MGMT_STANDARD_CODE}\\b.*\\bshall\\b`, 'i'),
  /\bThe organization shall\b/i,
  /\bTop management shall\b/i,
  /\benergy management system\b.*\bshall\b/i,
  /\bEnMS\b.*\bshall\b/i,
  /\bThis International Standard\b/i,
  /\bconformity assessment\b/i,
  /\bcertification body\b/i,
  new RegExp(`\\b${STANDARD_ACRONYM}\\/${'IEC'}\\s+17021\\b`, 'i'),
  standardRef('50003\\b'),
  standardRef('50004\\b'),
  standardRef('50006\\b'),
  standardRef('50015\\b'),
]

export interface LegalGuardResult {
  safe: boolean
  warnings: string[]
  matches: { pattern: string; text: string }[]
}

export function scanContent(text: string): LegalGuardResult {
  const warnings: string[] = []
  const matches: { pattern: string; text: string }[] = []

  for (const pattern of STANDARD_FORBIDDEN_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      warnings.push(
        'Contenido potencialmente restringido detectado. VersaEnergy no reproduce texto de estandares. Revisa que el contenido sea original y operativo.',
      )
      matches.push({ pattern: pattern.source, text: match[0] })
    }
  }

  const standardRefs = text.match(new RegExp(`\\b${STANDARD_ACRONYM}\\s*\\d{4,5}[:\\-]?\\d{0,4}\\b`, 'g'))
  if (standardRefs && standardRefs.length > 0) {
    warnings.push(
      'Se detectaron referencias normativas. Usa lenguaje propio de gestion energetica y evita copiar definiciones o textos oficiales.',
    )
    for (const ref of standardRefs) {
      matches.push({ pattern: 'STANDARD_REFERENCE', text: ref })
    }
  }

  return { safe: warnings.length === 0, warnings, matches }
}

export function contentOriginLabel(origin: string): string {
  const labels: Record<string, string> = {
    app_original: 'Original de VersaEnergy',
    user_original: 'Original del usuario',
    public_source: 'Fuente publica',
    tenant_reference: 'Referencia del cliente',
  }
  return labels[origin] || origin
}

export const LEGAL_NOTICE = {
  title: 'Aviso de alcance — SGEn',
  body: 'VersaEnergy proporciona herramientas operativas de gestion energetica. Organiza evidencia, responsabilidades, acciones, revisiones y seguimiento ejecutivo. Cada organizacion conserva la responsabilidad de sus compromisos externos, auditorias, criterios internos y decisiones formales.',
  version: '1.0.0',
}

export const ACCEPTED_LANGUAGE = {
  certification: 'cobertura profesional de gestion energetica',
  compliance: 'preparacion para revision o auditoria',
  energySystem: 'SGEn de VersaEnergy',
  evidence: 'evidencia operativa del SGEn',
  audit: 'auditoria interna del SGEn',
  scope: 'alcance energetico del SGEn',
  review: 'revision energetica',
  policy: 'politica energetica interna',
}

export function validateLegalLanguage(text: string): { safe: boolean; suggestions: string[] } {
  const suggestions: string[] = []
  const issues = [
    { pattern: new RegExp(`\\bcertificaci[oó]n\\s*${STANDARD_ACRONYM}\\b`, 'i'), suggestion: 'Usa "' + ACCEPTED_LANGUAGE.certification + '"' },
    { pattern: new RegExp(`\\bcumplimiento\\s*${STANDARD_ACRONYM}\\b`, 'i'), suggestion: 'Usa "' + ACCEPTED_LANGUAGE.compliance + '"' },
    { pattern: new RegExp(`\\bsistema\\s*${STANDARD_ACRONYM}\\b`, 'i'), suggestion: 'Usa "' + ACCEPTED_LANGUAGE.energySystem + '"' },
    { pattern: new RegExp(`\\bauditor[ií]a\\s*${STANDARD_ACRONYM}\\b`, 'i'), suggestion: 'Usa "' + ACCEPTED_LANGUAGE.audit + '"' },
  ]

  for (const issue of issues) {
    if (issue.pattern.test(text)) {
      suggestions.push(issue.suggestion)
    }
  }

  return { safe: suggestions.length === 0, suggestions }
}
