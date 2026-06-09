const GRAMS_PER_LB = 453.59237
const GRAMS_PER_OZ = GRAMS_PER_LB / 16

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000)
}

export function gramsToKg(grams: number): number {
  return grams / 1000
}

export function lbOzToGrams(lb: number, oz: number): number {
  return Math.round(lb * GRAMS_PER_LB + oz * GRAMS_PER_OZ)
}

export function gramsToLbOz(grams: number): { lb: number; oz: number } {
  const totalOz = Math.round(grams / GRAMS_PER_OZ)
  return { lb: Math.floor(totalOz / 16), oz: totalOz % 16 }
}
