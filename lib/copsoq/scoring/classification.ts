import type { CopsoqClassification } from '@/lib/copsoq/types'

export function classifyCopsoqScore(score: number): CopsoqClassification {
  if (score <= 25) {
    return 'saudavel'
  }

  if (score <= 74) {
    return 'medio_alerta'
  }

  return 'critico'
}

export function getCopsoqClassificationLabel(classification: CopsoqClassification): string {
  if (classification === 'saudavel') {
    return 'Saudavel / Favoravel'
  }

  if (classification === 'medio_alerta') {
    return 'Medio / Alerta'
  }

  return 'Critico / Risco Alto'
}
