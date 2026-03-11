export type WeightUnit = "kg" | "lbs";

export function normalizeWeightUnit(value: string | null | undefined): WeightUnit {
  return value === "kg" ? "kg" : "lbs";
}

export function weightUnitLabel(unit: WeightUnit) {
  return unit === "kg" ? "kg" : "lbs";
}
