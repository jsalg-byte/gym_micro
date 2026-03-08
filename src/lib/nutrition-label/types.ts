export type NutritionSource = "manual" | "barcode" | "label_scan" | "merged";

export type MicronutrientValue = {
  name: string;
  value: number;
  unit: string;
  confidence?: number;
};

export type ParsedNutritionDraft = {
  name: string | null;
  barcodeUpc?: string | null;
  servingSizeText: string | null;
  servingSizeG: number | null;
  servingsPerContainer: number | null;
  caloriesKcal: number | null;
  fatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  carbsG: number | null;
  fiberG: number | null;
  sugarsG: number | null;
  addedSugarsG: number | null;
  proteinG: number | null;
  micronutrients: MicronutrientValue[];
  parseConfidence: number;
  uncertainFields: string[];
  fieldConfidence: Record<string, number>;
  warnings: string[];
  rawText: string;
  source: NutritionSource;
};

export type BarcodeNutritionContext = {
  name?: string | null;
  barcodeUpc?: string | null;
  servingSizeG?: number | null;
  caloriesKcal?: number | null;
  fatG?: number | null;
  carbsG?: number | null;
  proteinG?: number | null;
};
