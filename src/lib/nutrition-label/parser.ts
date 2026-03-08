import type { MicronutrientValue, ParsedNutritionDraft } from "@/lib/nutrition-label/types";

type ExtractionResult = {
  value: number | null;
  unit: string | null;
  confidence: number;
};

type ParseOptions = {
  ocrConfidence?: number;
};

const MICRONUTRIENT_ALIASES = [
  "vitamin d",
  "calcium",
  "iron",
  "potassium",
  "vitamin a",
  "vitamin c",
  "vitamin e",
  "vitamin b6",
  "vitamin b12",
  "magnesium",
  "zinc",
  "folate",
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeText(rawText: string) {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\t/g, " ")
    .replace(/[|]/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n +/g, "\n")
    .trim();
}

function safeNumber(value: string | undefined) {
  if (!value) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function confidenceForMatch(base: number, ocrConfidence: number) {
  const adjusted = base * (0.7 + ocrConfidence * 0.3);
  return clamp(round1(adjusted), 0.35, 0.99);
}

function extractNumber(
  text: string,
  patterns: RegExp[],
  options: {
    expectedUnits?: string[];
    ocrConfidence: number;
    baseConfidence: number;
  },
): ExtractionResult {
  // OCR text can be noisy; we run multiple targeted patterns and down-rank confidence
  // when expected units are missing or ambiguous.
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const value = safeNumber(match[1]);
    if (value === null) {
      continue;
    }

    const unitRaw = (match[2] ?? "").toLowerCase();
    const unit = unitRaw || null;
    let confidence = confidenceForMatch(options.baseConfidence, options.ocrConfidence);

    if (options.expectedUnits && options.expectedUnits.length > 0) {
      if (!unit || !options.expectedUnits.includes(unit)) {
        confidence = clamp(confidence - 0.2, 0.35, 0.99);
      }
    }

    return {
      value,
      unit,
      confidence,
    };
  }

  return {
    value: null,
    unit: null,
    confidence: 0,
  };
}

function parseServingSizeText(text: string, ocrConfidence: number) {
  const servingLine = text.match(/serving\s*size\s*[:\-]?\s*([^\n]+)/i)?.[1]?.trim() ?? null;

  const servingG = servingLine
    ? safeNumber(servingLine.match(/(\d+(?:\.\d+)?)\s*g\b/i)?.[1])
    : null;

  if (servingG !== null) {
    return {
      servingSizeText: servingLine,
      servingSizeG: servingG,
      confidence: confidenceForMatch(0.95, ocrConfidence),
      warning: null,
    };
  }

  const servingOz = servingLine
    ? safeNumber(servingLine.match(/(\d+(?:\.\d+)?)\s*oz\b/i)?.[1])
    : null;

  if (servingOz !== null) {
    return {
      servingSizeText: servingLine,
      servingSizeG: round1(servingOz * 28.3495),
      confidence: confidenceForMatch(0.55, ocrConfidence),
      warning: "Serving size grams were estimated from ounces. Please confirm.",
    };
  }

  return {
    servingSizeText: servingLine,
    servingSizeG: null,
    confidence: servingLine ? confidenceForMatch(0.65, ocrConfidence) : 0,
    warning: servingLine
      ? "Serving size is not in grams. Add gram mapping manually before logging by grams/oz/servings."
      : "Serving size was not detected.",
  };
}

function parseServingsPerContainer(text: string, ocrConfidence: number) {
  const extraction = extractNumber(
    text,
    [
      /servings?\s+per\s+container\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      /about\s+(\d+(?:\.\d+)?)\s+servings?/i,
    ],
    {
      ocrConfidence,
      baseConfidence: 0.88,
    },
  );

  return extraction.value;
}

function parseProductName(lines: string[], ocrConfidence: number) {
  const nutritionFactsIndex = lines.findIndex((line) => /nutrition\s+facts/i.test(line));

  if (nutritionFactsIndex > 0) {
    for (let idx = nutritionFactsIndex - 1; idx >= 0; idx -= 1) {
      const candidate = lines[idx]?.trim();
      if (!candidate) {
        continue;
      }
      if (/serving|calories|nutrition/i.test(candidate)) {
        continue;
      }
      if (!/[a-z]/i.test(candidate)) {
        continue;
      }

      return {
        name: candidate,
        confidence: confidenceForMatch(0.8, ocrConfidence),
      };
    }
  }

  const firstUseful = lines.find((line) => /[a-z]/i.test(line) && !/nutrition\s+facts/i.test(line));
  if (firstUseful) {
    return {
      name: firstUseful.trim(),
      confidence: confidenceForMatch(0.55, ocrConfidence),
    };
  }

  return {
    name: null,
    confidence: 0,
  };
}

function parseMicronutrients(text: string, ocrConfidence: number) {
  const micronutrients: MicronutrientValue[] = [];

  for (const alias of MICRONUTRIENT_ALIASES) {
    const extraction = extractNumber(
      text,
      [new RegExp(`${alias}[^\\d\\n]{0,24}(\\d+(?:\\.\\d+)?)\\s*(mg|mcg|µg|g)?`, "i")],
      {
        expectedUnits: ["mg", "mcg", "µg", "g"],
        ocrConfidence,
        baseConfidence: 0.82,
      },
    );

    if (extraction.value === null) {
      continue;
    }

    micronutrients.push({
      name: alias
        .split(" ")
        .map((token) => token[0].toUpperCase() + token.slice(1))
        .join(" "),
      value: extraction.value,
      unit: extraction.unit ?? "mg",
      confidence: extraction.confidence,
    });
  }

  return micronutrients;
}

export function parseNutritionLabelText(rawText: string, options: ParseOptions = {}): ParsedNutritionDraft {
  const ocrConfidence = clamp(options.ocrConfidence ?? 0.75, 0, 1);
  const normalizedText = normalizeText(rawText);
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name = parseProductName(lines, ocrConfidence);
  const serving = parseServingSizeText(normalizedText, ocrConfidence);
  const servingsPerContainer = parseServingsPerContainer(normalizedText, ocrConfidence);

  const calories = extractNumber(
    normalizedText,
    [/calories\s*[:\-]?\s*(\d{1,4})\b/i, /calories\s+from\s+fat\s+\d+\s+\(?(\d{1,4})\)?/i],
    {
      ocrConfidence,
      baseConfidence: 0.95,
    },
  );

  const fat = extractNumber(normalizedText, [/(?:total\s+)?fat[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.9,
  });

  const saturatedFat = extractNumber(normalizedText, [/saturated\s+fat[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.87,
  });

  const transFat = extractNumber(normalizedText, [/trans\s+fat[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.84,
  });

  const cholesterol = extractNumber(normalizedText, [/cholesterol[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(mg|g)?/i], {
    expectedUnits: ["mg", "g"],
    ocrConfidence,
    baseConfidence: 0.9,
  });

  const sodium = extractNumber(normalizedText, [/sodium[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(mg|g)?/i], {
    expectedUnits: ["mg", "g"],
    ocrConfidence,
    baseConfidence: 0.9,
  });

  const carbs = extractNumber(normalizedText, [/total\s+carbohydrate[s]?[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.9,
  });

  const fiber = extractNumber(normalizedText, [/dietary\s+fiber[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.88,
  });

  const sugars = extractNumber(normalizedText, [/total\s+sugars?[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.86,
  });

  const addedSugars = extractNumber(
    normalizedText,
    [/includes[^\d\n]{0,10}(\d+(?:\.\d+)?)\s*(g|mg)?\s+added\s+sugars?/i, /added\s+sugars?[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i],
    {
      expectedUnits: ["g", "mg"],
      ocrConfidence,
      baseConfidence: 0.84,
    },
  );

  const protein = extractNumber(normalizedText, [/protein[^\d\n]{0,18}(\d+(?:\.\d+)?)\s*(g|mg)?/i], {
    expectedUnits: ["g", "mg"],
    ocrConfidence,
    baseConfidence: 0.9,
  });

  const micronutrients = parseMicronutrients(normalizedText, ocrConfidence);

  const fieldConfidence: Record<string, number> = {
    name: name.confidence,
    servingSizeText: serving.servingSizeText ? confidenceForMatch(0.8, ocrConfidence) : 0,
    servingSizeG: serving.confidence,
    servingsPerContainer: servingsPerContainer ? confidenceForMatch(0.88, ocrConfidence) : 0,
    caloriesKcal: calories.confidence,
    fatG: fat.confidence,
    saturatedFatG: saturatedFat.confidence,
    transFatG: transFat.confidence,
    cholesterolMg: cholesterol.confidence,
    sodiumMg: sodium.confidence,
    carbsG: carbs.confidence,
    fiberG: fiber.confidence,
    sugarsG: sugars.confidence,
    addedSugarsG: addedSugars.confidence,
    proteinG: protein.confidence,
  };

  const uncertainFields = Object.entries(fieldConfidence)
    .filter(([, confidence]) => confidence > 0 && confidence < 0.7)
    .map(([field]) => field);

  const confidenceValues = Object.values(fieldConfidence).filter((confidence) => confidence > 0);
  const parseConfidence =
    confidenceValues.length > 0
      ? round1(confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length)
      : 0;

  const warnings: string[] = [];
  if (!normalizedText) {
    warnings.push("No OCR text was detected in the uploaded image.");
  }
  if (!calories.value) {
    warnings.push("Calories were not detected. Please fill them manually.");
  }
  if (!serving.servingSizeText) {
    warnings.push("Serving size text was not detected. Fill it manually if available.");
  }
  if (serving.warning) {
    warnings.push(serving.warning);
  }

  return {
    name: name.name,
    servingSizeText: serving.servingSizeText,
    servingSizeG: serving.servingSizeG,
    servingsPerContainer,
    caloriesKcal: calories.value,
    fatG: fat.value,
    saturatedFatG: saturatedFat.value,
    transFatG: transFat.value,
    cholesterolMg: cholesterol.value,
    sodiumMg: sodium.value,
    carbsG: carbs.value,
    fiberG: fiber.value,
    sugarsG: sugars.value,
    addedSugarsG: addedSugars.value,
    proteinG: protein.value,
    micronutrients,
    parseConfidence,
    uncertainFields,
    fieldConfidence,
    warnings,
    rawText: normalizedText,
    source: "label_scan",
  };
}
