const GRAMS_PER_LB = 453.59237
const GRAMS_PER_OZ = GRAMS_PER_LB / 16
const MM_PER_INCH = 25.4

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

// Length conversions for growth measurements (height, head circumference), which
// are stored internally as whole millimetres — mirroring weight's grams-as-integer
// rule (CONTEXT.md). Convert only at the UI boundary.
export function cmToMm(cm: number): number {
  return Math.round(cm * 10)
}

export function mmToCm(mm: number): number {
  return mm / 10
}

export function inchesToMm(inches: number): number {
  return Math.round(inches * MM_PER_INCH)
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH
}
