import type { DiagramSnapshot, DiagramVersion, DiagramStatus } from './graphTypes'

export interface VersioningResult {
  success: boolean
  message: string
  version?: DiagramVersion
}

export function canEdit(status: DiagramStatus): boolean {
  return status === 'draft'
}

export function canPublish(status: DiagramStatus): boolean {
  return status === 'draft'
}

export function canArchive(status: DiagramStatus): boolean {
  return status === 'published' || status === 'draft'
}

export function canClone(status: DiagramStatus): boolean {
  return status === 'published'
}

export function createVersionNumber(existingVersions: number[]): number {
  if (existingVersions.length === 0) return 1
  return Math.max(...existingVersions) + 1
}

export function publishVersion(
  version: DiagramVersion,
  snapshot: DiagramSnapshot,
): VersioningResult {
  if (!canPublish(version.status)) {
    return {
      success: false,
      message: `No se puede publicar una versión con estado "${version.status}". Solo se pueden publicar drafts.`,
    }
  }

  return {
    success: true,
    message: 'Versión publicada correctamente. La versión queda congelada.',
    version: {
      ...version,
      status: 'published',
      snapshot,
      publishedAt: new Date().toISOString(),
    },
  }
}

export function archiveVersion(version: DiagramVersion): VersioningResult {
  if (!canArchive(version.status)) {
    return {
      success: false,
      message: `No se puede archivar una versión con estado "${version.status}".`,
    }
  }

  return {
    success: true,
    message: 'Versión archivada correctamente.',
    version: {
      ...version,
      status: 'archived',
    },
  }
}

export function createCloneVersion(
  sourceVersion: DiagramVersion,
  newVersionNumber: number,
): VersioningResult {
  if (!canClone(sourceVersion.status)) {
    return {
      success: false,
      message: `No se puede clonar una versión con estado "${sourceVersion.status}". Solo se pueden clonar versiones publicadas.`,
    }
  }

  return {
    success: true,
    message: `Versión clonada correctamente como draft v${newVersionNumber}.`,
    version: {
      id: crypto.randomUUID?.() || `version-${Date.now()}`,
      diagramId: sourceVersion.diagramId,
      versionNumber: newVersionNumber,
      status: 'draft',
      snapshot: null,
      createdBy: null,
      createdAt: new Date().toISOString(),
      publishedAt: null,
    },
  }
}

export function getActiveVersion(
  versions: DiagramVersion[],
): DiagramVersion | undefined {
  return versions.find((v) => v.status === 'published')
}

export function getLatestDraft(
  versions: DiagramVersion[],
): DiagramVersion | undefined {
  return versions
    .filter((v) => v.status === 'draft')
    .sort((a, b) => b.versionNumber - a.versionNumber)[0]
}

export function validateVersionTransition(
  from: DiagramStatus,
  to: DiagramStatus,
): VersioningResult {
  const validTransitions: Record<DiagramStatus, DiagramStatus[]> = {
    draft: ['published', 'archived'],
    published: ['archived'],
    archived: [],
  }

  if (!validTransitions[from]?.includes(to)) {
    return {
      success: false,
      message: `Transición inválida: "${from}" → "${to}". Transiciones válidas desde "${from}": ${(validTransitions[from] || []).join(', ') || 'ninguna'}`,
    }
  }

  return { success: true, message: 'Transición válida.' }
}
