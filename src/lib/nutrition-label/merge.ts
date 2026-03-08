import type { BarcodeNutritionContext, ParsedNutritionDraft } from "@/lib/nutrition-label/types";

function hasMeaningfulValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function chooseNutritionValue(
  barcodeValue: number | null | undefined,
  labelValue: number | null,
  confidence: number,
) {
  if (labelValue === null) {
    return barcodeValue ?? null;
  }

  if (!hasMeaningfulValue(barcodeValue)) {
    return labelValue;
  }

  return confidence >= 0.7 ? labelValue : (barcodeValue ?? null);
}

export function mergeBarcodeAndLabel(
  barcode: BarcodeNutritionContext | undefined,
  label: ParsedNutritionDraft,
): ParsedNutritionDraft {
  if (!barcode) {
    return label;
  }

  return {
    ...label,
    name: barcode.name?.trim() || label.name,
    barcodeUpc: barcode.barcodeUpc ?? label.barcodeUpc,
    servingSizeG: chooseNutritionValue(barcode.servingSizeG, label.servingSizeG, label.fieldConfidence.servingSizeG),
    caloriesKcal: chooseNutritionValue(barcode.caloriesKcal, label.caloriesKcal, label.fieldConfidence.caloriesKcal),
    fatG: chooseNutritionValue(barcode.fatG, label.fatG, label.fieldConfidence.fatG),
    carbsG: chooseNutritionValue(barcode.carbsG, label.carbsG, label.fieldConfidence.carbsG),
    proteinG: chooseNutritionValue(barcode.proteinG, label.proteinG, label.fieldConfidence.proteinG),
    source: barcode.barcodeUpc ? "merged" : "label_scan",
  };
}
