import { COPSOQ_ALLOWED_ANSWER_VALUES } from '@/lib/copsoq/config/constants'

export function isValidCopsoqAnswerValue(value: number): boolean {
  return COPSOQ_ALLOWED_ANSWER_VALUES.includes(value as (typeof COPSOQ_ALLOWED_ANSWER_VALUES)[number])
}

export function toCopsoqScore0to100(rawValue: number, reverseScored = false): number {
  const normalized = (rawValue - 1) * 25
  const score = reverseScored ? 100 - normalized : normalized
  return Math.min(100, Math.max(0, score))
}
