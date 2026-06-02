const ISO_FORBIDDEN_PATTERNS = [
  /\bISO\s+50001:2018\b.*\bclause\b/i,
  /\bISO\s+50001\b.*\bshall\b/i,
  /\bThe organization shall\b/i,
  /\bTop management shall\b/i,
  /\benergy management system\b.*\bshall\b/i,
  /\bEnMS\b.*\bshall\b/i,
  /\bThis International Standard\b/i,
  /\bconformity assessment\b/i,
  /\bcertification body\b/i,
  /\bISO\/IEC\s+17021\b/i,
  /\bISO\s+50003\b/i,
  /\bISO\s+50004\b/i,
  /\bISO\s+50006\b/i,
  /\bISO\s+50015\b/i,
]

export interface LegalGuardResult {
  safe: boolean
  warnings: string[]
  matches: { pattern: string; text: string }[]
}

export function scanContent(text: string): LegalGuardResult {
  const warnings: string[] = []
  const matches: { pattern: string; text: string }[] = []

  for (const pattern of ISO_FORBIDDEN_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      warnings.push(
        'Contenido potencialmente restringido detectado. VersaEnergy no reproduce texto del estandar ISO. Revisa que el contenido sea original.',
      )
      matches.push({ pattern: pattern.source, text: match[0] })
    }
  }

  const isoRefs = text.match(/\bISO\s*\d{4,5}[:\-]?\d{0,4}\b/g)
  if (isoRefs && isoRefs.length > 0) {
    warnings.push(
      'Se detectaron referencias a normas ISO. Asegurate de no estar copiando definiciones o textos oficiales.',
    )
    for (const ref of isoRefs) {
      matches.push({ pattern: 'ISO_REFERENCE', text: ref })
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
  title: 'Aviso legal — SGEn',
  body: 'VersaEnergy proporciona herramientas operativas de gestion energetica. No reproduce, reemplaza ni sustituye el texto oficial de ISO 50001 ni de ninguna otra norma publicada. Cada organizacion es responsable de adquirir, consultar y cumplir la version oficial del estandar que corresponda. La funcionalidad "SGEn alineado con ISO 50001" describe preparacion operativa, cobertura del sistema de gestion y apoyo a auditorias internas. No implica certificacion, acreditacion ni relacion con ISO.',
  version: '1.0.0',
}

export const ACCEPTED_LANGUAGE = {
  certification: 'alineado con ISO 50001',
  compliance: 'preparacion para auditoria',
  isoSystem: 'SGEn de VersaEnergy',
  evidence: 'evidencia operativa del SGEn',
  audit: 'auditoria interna del SGEn',
  scope: 'alcance energetico del SGEn',
  review: 'revision energetica',
  policy: 'politica energetica interna',
}

export function validateLegalLanguage(text: string): { safe: boolean; suggestions: string[] } {
  const suggestions: string[] = []
  const issues = [
    { pattern: /\bcertificaci[oó]n\s*ISO\b/i, suggestion: 'Usa "' + ACCEPTED_LANGUAGE.certification + '"' },
    { pattern: /\bcumplimiento\s*ISO\b/i, suggestion: 'Usa "' + ACCEPTED_LANGUAGE.compliance + '"' },
    { pattern: /\bsistema\s*ISO\b/i, suggestion: 'Usa "' + ACCEPTED_LANGUAGE.isoSystem + '"' },
    { pattern: /\bauditor[ií]a\s*ISO\b/i, suggestion: 'Usa "' + ACCEPTED_LANGUAGE.audit + '"' },
  ]

  for (const issue of issues) {
    if (issue.pattern.test(text)) {
      suggestions.push(issue.suggestion)
    }
  }

  return { safe: suggestions.length === 0, suggestions }
}
