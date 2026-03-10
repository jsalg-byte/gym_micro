"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BarcodeNutritionContext,
  MicronutrientValue,
  ParsedNutritionDraft,
} from "@/lib/nutrition-label/types";

type FoodOption = {
  id: string;
  name: string;
  barcodeUpc: string | null;
  servingSizeG: number | null;
  servingSizeText: string | null;
  servingsPerContainer: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  fiberG: number | null;
  sugarsG: number | null;
  addedSugarsG: number | null;
  micronutrients: MicronutrientValue[];
};

type BarcodeLookupResponse = {
  found: boolean;
  source: "local" | "openfoodfacts" | "none";
  name?: string;
  servingSizeG?: number;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  food?: {
    id: string;
    name: string;
    barcodeUpc?: string;
    servingSizeG?: number;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

type Mode = "log" | "add";
type ScannerMode = "barcode" | "label";
type NutritionSource = "manual" | "barcode" | "label_scan" | "merged";
type AmountUnit = "g" | "oz" | "serving";

type IngredientRow = {
  foodId: string;
  amount: string;
  unit: AmountUnit;
};

type MicronutrientRow = {
  id: string;
  name: string;
  value: string;
  unit: string;
  confidence?: number;
};

type IngredientSummary = {
  amount: number;
  unit: AmountUnit;
  grams: number;
  conversionText: string;
  servingReferenceG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  formula: string;
  assumptionText: string | null;
  error: string | null;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toInputValue(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }

  if (decimals <= 0) {
    return String(Math.round(value));
  }

  return String(round1(value));
}

function newMicronutrientRow(data?: Partial<MicronutrientValue>): MicronutrientRow {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return {
    id,
    name: data?.name ?? "",
    value: data?.value !== undefined ? toInputValue(data.value, 2) : "",
    unit: data?.unit ?? "mg",
    confidence: data?.confidence,
  };
}

function fieldInputClass(uncertainFields: string[], fieldName: string) {
  return `mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 ${
    uncertainFields.includes(fieldName) ? "border-amber-300 bg-amber-50" : "border-slate-300"
  }`;
}

function extractBarcodeContextFromResponse(response: BarcodeLookupResponse, barcodeUpc: string): BarcodeNutritionContext {
  if (response.food) {
    return {
      name: response.food.name,
      barcodeUpc,
      servingSizeG: response.food.servingSizeG ?? null,
      caloriesKcal: response.food.caloriesKcal,
      fatG: response.food.fatG,
      carbsG: response.food.carbsG,
      proteinG: response.food.proteinG,
    };
  }

  return {
    name: response.name ?? null,
    barcodeUpc,
    servingSizeG: response.servingSizeG ?? null,
    caloriesKcal: response.caloriesKcal ?? null,
    fatG: response.fatG ?? null,
    carbsG: response.carbsG ?? null,
    proteinG: response.proteinG ?? null,
  };
}

function summarizeIngredient(food: FoodOption, amountRaw: string, unit: AmountUnit): IngredientSummary {
  const amount = Number(amountRaw);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      amount: 0,
      unit,
      grams: 0,
      conversionText: "",
      servingReferenceG: food.servingSizeG ?? 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      formula: "",
      assumptionText: null,
      error: "Enter a valid amount.",
    };
  }

  let grams = amount;
  let conversionText = `${amount}g`;

  if (unit === "oz") {
    grams = round2(amount * 28.3495);
    conversionText = `${amount} oz x 28.35 = ${grams}g`;
  }

  if (unit === "serving") {
    if (!food.servingSizeG || food.servingSizeG <= 0) {
      return {
        amount,
        unit,
        grams: 0,
        conversionText: "",
        servingReferenceG: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        formula: "",
        assumptionText: null,
        error: "This food is missing serving-size grams. Add grams mapping before logging servings.",
      };
    }

    grams = round2(amount * food.servingSizeG);
    conversionText = `${amount} servings x ${food.servingSizeG}g = ${grams}g`;
  }

  const servingReferenceG = food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100;
  const assumptionText = food.servingSizeG && food.servingSizeG > 0 ? null : "Using 100g reference (serving grams missing).";
  const factor = grams / servingReferenceG;

  const calories = Math.round(food.caloriesKcal * factor);
  const protein = round1(food.proteinG * factor);
  const carbs = round1(food.carbsG * factor);
  const fat = round1(food.fatG * factor);

  return {
    amount,
    unit,
    grams,
    conversionText,
    servingReferenceG,
    calories,
    protein,
    carbs,
    fat,
    formula: `Serving size: ${servingReferenceG}g | You ate: ${grams}g | Calories per serving: ${food.caloriesKcal} | Calculated calories: ${calories}`,
    assumptionText,
    error: null,
  };
}

async function runOcrOnLabel(file: File, onProgress: (percent: number) => void) {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng", 1, {
    logger(message) {
      if (message.status !== "recognizing text") {
        return;
      }

      const progress = Number.isFinite(message.progress) ? message.progress : 0;
      onProgress(Math.round(progress * 100));
    },
  });

  const result = await worker.recognize(file);
  await worker.terminate();

  return {
    text: result.data.text?.trim() ?? "",
    confidence: clamp(result.data.confidence / 100, 0, 1),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NutritionWorkflow({ foods }: { foods: FoodOption[] }) {
  const router = useRouter();

  const initialMode: Mode = foods.length > 0 ? "log" : "add";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([
    { foodId: "", amount: "", unit: "g" },
  ]);
  const [mealType, setMealType] = useState("breakfast");
  const [mealPhoto, setMealPhoto] = useState<File | null>(null);

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [servingSizeText, setServingSizeText] = useState("");
  const [servingSizeG, setServingSizeG] = useState("");
  const [servingsPerContainer, setServingsPerContainer] = useState("");

  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [saturatedFatG, setSaturatedFatG] = useState("");
  const [transFatG, setTransFatG] = useState("");
  const [cholesterolMg, setCholesterolMg] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [sugarsG, setSugarsG] = useState("");
  const [addedSugarsG, setAddedSugarsG] = useState("");

  const [micronutrients, setMicronutrients] = useState<MicronutrientRow[]>([]);
  const [nutritionSource, setNutritionSource] = useState<NutritionSource>("manual");
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [labelRawText, setLabelRawText] = useState("");
  const [barcodeContext, setBarcodeContext] = useState<BarcodeNutritionContext | null>(null);

  const [addError, setAddError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("barcode");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);
  const [labelImageFile, setLabelImageFile] = useState<File | null>(null);
  const [labelImagePreviewUrl, setLabelImagePreviewUrl] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);

  const foodById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods]);

  const ingredientSummaries = useMemo(
    () =>
      ingredientRows.map((row) => {
        const food = foodById.get(row.foodId) ?? null;
        if (!food) {
          return null;
        }

        return {
          food,
          summary: summarizeIngredient(food, row.amount, row.unit),
        };
      }),
    [ingredientRows, foodById],
  );

  const totals = useMemo(() => {
    return ingredientSummaries.reduce(
      (acc, item) => {
        if (!item || item.summary.error) {
          return acc;
        }

        return {
          calories: acc.calories + item.summary.calories,
          protein: round1(acc.protein + item.summary.protein),
          carbs: round1(acc.carbs + item.summary.carbs),
          fat: round1(acc.fat + item.summary.fat),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [ingredientSummaries]);

  useEffect(() => {
    return () => {
      if (labelImagePreviewUrl) {
        URL.revokeObjectURL(labelImagePreviewUrl);
      }
    };
  }, [labelImagePreviewUrl]);

  function setDraftFromParsed(parsed: ParsedNutritionDraft) {
    setName(parsed.name ?? "");
    setBarcode(parsed.barcodeUpc ?? barcode);
    setServingSizeText(parsed.servingSizeText ?? "");
    setServingSizeG(toInputValue(parsed.servingSizeG));
    setServingsPerContainer(toInputValue(parsed.servingsPerContainer));

    setCaloriesKcal(toInputValue(parsed.caloriesKcal, 0));
    setFatG(toInputValue(parsed.fatG));
    setSaturatedFatG(toInputValue(parsed.saturatedFatG));
    setTransFatG(toInputValue(parsed.transFatG));
    setCholesterolMg(toInputValue(parsed.cholesterolMg));
    setSodiumMg(toInputValue(parsed.sodiumMg));
    setCarbsG(toInputValue(parsed.carbsG));
    setFiberG(toInputValue(parsed.fiberG));
    setSugarsG(toInputValue(parsed.sugarsG));
    setAddedSugarsG(toInputValue(parsed.addedSugarsG));
    setProteinG(toInputValue(parsed.proteinG));

    setMicronutrients(parsed.micronutrients.map((micronutrient) => newMicronutrientRow(micronutrient)));
    setNutritionSource(parsed.source);
    setParseConfidence(parsed.parseConfidence);
    setUncertainFields(parsed.uncertainFields);
    setParseWarnings(parsed.warnings);
    setLabelRawText(parsed.rawText);

    if (parsed.barcodeUpc) {
      setBarcodeContext((prev) => ({
        ...(prev ?? {}),
        barcodeUpc: parsed.barcodeUpc,
      }));
    }
  }

  function updateIngredient(index: number, next: Partial<IngredientRow>) {
    setIngredientRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...next } : row)),
    );
  }

  function addIngredientRow() {
    setIngredientRows((prev) => [...prev, { foodId: "", amount: "", unit: "g" }]);
  }

  function removeIngredientRow(index: number) {
    setIngredientRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }

  function addMicronutrientRow() {
    setMicronutrients((prev) => [...prev, newMicronutrientRow()]);
  }

  function updateMicronutrientRow(index: number, next: Partial<MicronutrientRow>) {
    setMicronutrients((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...next } : item)));
  }

  function removeMicronutrientRow(index: number) {
    setMicronutrients((prev) => prev.filter((_, idx) => idx !== index));
  }

  const lookupBarcode = useCallback(
    async (scannedCode?: string) => {
      const code = (scannedCode ?? barcode).trim();

      if (!/^\d{8,14}$/.test(code)) {
        setAddError("Enter an 8-14 digit barcode.");
        return;
      }

      if (scannedCode) {
        setBarcode(scannedCode);
      }

      setAddError(null);
      setLookupInfo(null);
      setLoading(true);

      const response = await fetch(`/api/barcode/${code}`);
      const payload = (await response.json().catch(() => null)) as BarcodeLookupResponse | { error?: string } | null;

      setLoading(false);

      if (!response.ok) {
        setAddError((payload as { error?: string } | null)?.error ?? "Barcode lookup failed.");
        return;
      }

      const result = payload as BarcodeLookupResponse;
      if (!result.found) {
        setLookupInfo("No product found for this barcode. You can enter details manually or scan the nutrition label.");
        return;
      }

      const context = extractBarcodeContextFromResponse(result, code);
      setBarcodeContext(context);

      if (result.food?.id) {
        setLookupInfo(`Found existing food: ${result.food.name}. You can use it in meal builder.`);
        setMode("log");
        if (ingredientRows.length > 0) {
          updateIngredient(0, { foodId: result.food.id });
        }
        return;
      }

      setNutritionSource("barcode");
      setName(result.name ?? "");
      setServingSizeG(String(Math.round(result.servingSizeG ?? 100)));
      setCaloriesKcal(String(Math.round(result.caloriesKcal ?? 0)));
      setProteinG(String(Math.round(result.proteinG ?? 0)));
      setCarbsG(String(Math.round(result.carbsG ?? 0)));
      setFatG(String(Math.round(result.fatG ?? 0)));
      setLookupInfo(
        "Barcode data loaded. You can save now or scan nutrition label to merge more complete nutrition fields.",
      );
    },
    [barcode, ingredientRows.length],
  );

  useEffect(() => {
    if (!scannerOpen || scannerMode !== "barcode") {
      return;
    }

    const video = scannerVideoRef.current;
    if (!video) {
      setScanError("Camera preview could not initialize. Try reopening scanner.");
      setScannerOpen(false);
      return;
    }

    let disposed = false;
    let controls: IScannerControls | null = null;
    const reader = new BrowserMultiFormatReader();

    async function startScanner(preview: HTMLVideoElement) {
      setScanError(null);

      try {
        controls = await reader.decodeFromVideoDevice(undefined, preview, (result, _error, runningControls) => {
          if (!result || disposed) {
            return;
          }

          const scannedCode = result.getText().trim();
          if (!/^\d{8,14}$/.test(scannedCode)) {
            return;
          }

          runningControls.stop();
          setScannerOpen(false);
          setScannerMode("barcode");
          void lookupBarcode(scannedCode);
        });
      } catch {
        if (disposed) {
          return;
        }
        setScanError("Camera scanning is unavailable in this browser/session. Enter barcode manually.");
      }
    }

    void startScanner(video);

    return () => {
      disposed = true;
      controls?.stop();
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [lookupBarcode, scannerMode, scannerOpen]);

  async function parseNutritionLabelImage() {
    if (!labelImageFile) {
      setScanError("Choose or capture a nutrition label image first.");
      return;
    }

    setScanError(null);
    setScanInfo(null);
    setOcrBusy(true);
    setOcrProgress(0);

    try {
      const ocr = await runOcrOnLabel(labelImageFile, setOcrProgress);

      if (!ocr.text || ocr.text.length < 20) {
        throw new Error("OCR text was too short. Try a clearer photo focused on the nutrition facts panel.");
      }

      const parseRes = await fetch("/api/nutrition-label/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText: ocr.text,
          ocrConfidence: ocr.confidence,
          barcodeContext: barcodeContext ?? undefined,
        }),
      });

      const parsePayload = (await parseRes.json().catch(() => null)) as
        | {
            error?: string;
            parsed?: ParsedNutritionDraft;
          }
        | null;

      if (!parseRes.ok || !parsePayload?.parsed) {
        throw new Error(parsePayload?.error ?? "Nutrition label parse failed.");
      }

      setDraftFromParsed(parsePayload.parsed);
      setMode("add");
      setScannerOpen(false);
      setScannerMode("barcode");
      setScanInfo(
        `Nutrition label parsed (confidence ${Math.round(parsePayload.parsed.parseConfidence * 100)}%). Review highlighted fields and save.`,
      );
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Could not parse nutrition label image.");
    } finally {
      setOcrBusy(false);
    }
  }

  async function submitMealLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogError(null);

    const normalizedItems = ingredientRows
      .map((row, index) => {
        const info = ingredientSummaries[index];
        if (!info || info.summary.error) {
          return null;
        }

        return {
          foodId: row.foodId,
          grams: info.summary.grams,
        };
      })
      .filter((item): item is { foodId: string; grams: number } => Boolean(item));

    if (normalizedItems.length === 0) {
      setLogError("Add at least one valid ingredient and amount.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/meals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mealType,
        items: normalizedItems,
      }),
    });

    if (!response.ok) {
      setLoading(false);
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setLogError(payload?.error ?? "Unable to log meal.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as { id?: string; ids?: string[] } | null;
    const mealLogId = payload?.ids?.[0] ?? payload?.id;

    if (mealPhoto && mealLogId) {
      try {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: mealPhoto.name,
            contentType: mealPhoto.type || "application/octet-stream",
          }),
        });

        if (!presignRes.ok) {
          const presignPayload = (await presignRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(presignPayload?.error ?? "Unable to create meal photo upload URL.");
        }

        const presign = (await presignRes.json()) as {
          url: string;
          key: string;
        };

        const uploadRes = await fetch(presign.url, {
          method: "PUT",
          headers: {
            "content-type": mealPhoto.type || "application/octet-stream",
          },
          body: mealPhoto,
        });

        if (!uploadRes.ok) {
          throw new Error("Meal photo upload to storage failed.");
        }

        const metadataRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entityType: "meal_log_photo",
            entityId: mealLogId,
            objectKey: presign.key,
            mimeType: mealPhoto.type || "application/octet-stream",
            sizeBytes: mealPhoto.size,
          }),
        });

        if (!metadataRes.ok) {
          const metadataPayload = (await metadataRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(metadataPayload?.error ?? "Unable to save meal photo metadata.");
        }
      } catch (uploadError) {
        setLoading(false);
        setLogError(
          uploadError instanceof Error
            ? `Meal logged, but photo failed: ${uploadError.message}`
            : "Meal logged, but photo upload failed.",
        );
        router.refresh();
        return;
      }
    }

    setLoading(false);
    setMealPhoto(null);
    setIngredientRows([{ foodId: "", amount: "", unit: "g" }]);
    router.refresh();
  }

  async function submitFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);

    if (!name.trim()) {
      setAddError("Food name is required.");
      return;
    }

    if (!servingSizeG || Number(servingSizeG) <= 0) {
      setAddError("Serving size grams are required so grams/oz logging works correctly.");
      return;
    }

    if (!caloriesKcal || Number(caloriesKcal) < 0) {
      setAddError("Calories are required.");
      return;
    }

    setLoading(true);

  const payloadBody = {
      name: name.trim(),
      barcodeUpc: barcode.trim() || undefined,
      // If this draft started from a barcode and then got a label scan,
      // update the existing barcode record instead of creating duplicates.
      mergeIntoExisting: Boolean(barcode.trim() && (nutritionSource === "merged" || nutritionSource === "label_scan")),
      caloriesKcal: Number(caloriesKcal),
      servingSizeText: servingSizeText.trim() || undefined,
      servingSizeG: Number(servingSizeG),
      servingsPerContainer: servingsPerContainer ? Number(servingsPerContainer) : undefined,
      proteinG: proteinG ? Number(proteinG) : 0,
      carbsG: carbsG ? Number(carbsG) : 0,
      fatG: fatG ? Number(fatG) : 0,
      saturatedFatG: saturatedFatG ? Number(saturatedFatG) : undefined,
      transFatG: transFatG ? Number(transFatG) : undefined,
      cholesterolMg: cholesterolMg ? Number(cholesterolMg) : undefined,
      sodiumMg: sodiumMg ? Number(sodiumMg) : undefined,
      fiberG: fiberG ? Number(fiberG) : undefined,
      sugarsG: sugarsG ? Number(sugarsG) : undefined,
      addedSugarsG: addedSugarsG ? Number(addedSugarsG) : undefined,
      micronutrients: micronutrients
        .map((item) => ({
          name: item.name.trim(),
          value: Number(item.value),
          unit: item.unit.trim() || "mg",
          confidence: item.confidence,
        }))
        .filter((item) => item.name && Number.isFinite(item.value)),
      nutritionSource,
      parseConfidence: parseConfidence ?? undefined,
      labelRawText: labelRawText || undefined,
    };

    const response = await fetch("/api/foods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadBody),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          food?: { id: string };
          reused?: boolean;
          merged?: boolean;
        }
      | null;

    setLoading(false);

    if (!response.ok) {
      setAddError(payload?.error ?? "Unable to save food.");
      return;
    }

    if (payload?.food?.id && ingredientRows.length > 0) {
      updateIngredient(0, { foodId: payload.food.id });
      setMode("log");
    }

    setLookupInfo(payload?.merged ? "Food merged with barcode record and updated." : "Food saved.");
    router.refresh();
  }

  if (mode === "log") {
    return (
      <article className="panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-black text-slate-900">Meal Builder</h1>
            <p className="text-xs text-slate-600">
              Fast flow: pick food, enter amount (g, oz, or servings), then save. Calculations are shown line by line.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode("add")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add New Food
          </button>
        </div>

        {foods.length === 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Add at least one food first, then build meals.
          </div>
        ) : (
          <form onSubmit={submitMealLog} className="mt-3 space-y-3">
            {ingredientRows.map((row, index) => {
              const info = ingredientSummaries[index];
              const summary = info?.summary;

              return (
                <div key={`ingredient-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
                    <select
                      value={row.foodId}
                      onChange={(event) => updateIngredient(index, { foodId: event.target.value })}
                      required
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="">Select food</option>
                      {foods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(event) => updateIngredient(index, { amount: event.target.value })}
                      min={0.1}
                      step="0.1"
                      required
                      placeholder="Amount"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                    <select
                      value={row.unit}
                      onChange={(event) => updateIngredient(index, { unit: event.target.value as AmountUnit })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    >
                      <option value="g">grams (g)</option>
                      <option value="oz">ounces (oz)</option>
                      <option value="serving">servings</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>

                  {summary ? (
                    <div className="mt-2 text-xs text-slate-600">
                      {summary.error ? (
                        <p className="text-rose-700">{summary.error}</p>
                      ) : (
                        <>
                          <p>
                            {summary.calories} kcal · Protein {summary.protein}g · Carbs {summary.carbs}g · Fat {summary.fat}
                            g
                          </p>
                          <p className="mt-1 text-slate-500">Amount conversion: {summary.conversionText}</p>
                          <p className="mt-1 text-slate-500">Calc: {summary.formula}</p>
                          {summary.assumptionText ? <p className="mt-1 text-amber-700">{summary.assumptionText}</p> : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addIngredientRow}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Add Ingredient
            </button>

            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">
              <p className="font-semibold text-cyan-900">
                Total: {totals.calories} kcal · Protein {totals.protein}g · Carbs {totals.carbs}g · Fat {totals.fat}g
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={mealType}
                onChange={(event) => setMealType(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <div>
                <p className="text-xs text-slate-600">Meal Photo (optional)</p>
                <label
                  htmlFor="meal-photo-input"
                  className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 7a2 2 0 0 1 2-2h3l1.2 1.5a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                    <circle cx="9" cy="12" r="1.5" />
                    <path d="m20 16-4.5-4.5a1 1 0 0 0-1.4 0L8 17.6" />
                  </svg>
                  <span>{mealPhoto ? mealPhoto.name : "Click to choose an image"}</span>
                </label>
                <input
                  id="meal-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setMealPhoto(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Meal"}
            </button>
            {logError ? <p className="text-sm text-rose-600">{logError}</p> : null}
          </form>
        )}
      </article>
    );
  }

  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Add Food</h2>
          <p className="text-xs text-slate-600">
            Scan barcode or nutrition label, review/edit parsed fields, then save to your food library.
          </p>
        </div>
        {foods.length > 0 ? (
          <button
            type="button"
            onClick={() => setMode("log")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Meal Builder
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            placeholder="Barcode (UPC/EAN)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="button"
            onClick={() => void lookupBarcode()}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Lookup Barcode
          </button>
          <button
            type="button"
            onClick={() => {
              setScannerOpen(true);
              setScannerMode("barcode");
            }}
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
          >
            Open Scanner
          </button>
        </div>
        {lookupInfo ? <p className="mt-2 text-xs text-emerald-700">{lookupInfo}</p> : null}
      </div>

      {scannerOpen ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Scanner</p>
            <button
              type="button"
              onClick={() => {
                setScannerOpen(false);
                setScannerMode("barcode");
              }}
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScannerMode("barcode")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                scannerMode === "barcode" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
              }`}
            >
              Barcode Scan
            </button>
            <button
              type="button"
              onClick={() => setScannerMode("label")}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                scannerMode === "label" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
              }`}
            >
              Nutrition Label Scan
            </button>
          </div>

          {scannerMode === "barcode" ? (
            <div className="mt-3">
              <video
                ref={scannerVideoRef}
                className="w-full rounded-lg border border-slate-300"
                muted
                playsInline
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Point your camera at a barcode. Detection auto-runs lookup.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-slate-700">
                Capture or Upload Nutrition Label
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setLabelImageFile(file);
                    if (labelImagePreviewUrl) {
                      URL.revokeObjectURL(labelImagePreviewUrl);
                    }
                    setLabelImagePreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              {labelImagePreviewUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={labelImagePreviewUrl}
                    alt="Nutrition label preview"
                    className="max-h-64 w-full rounded-lg border border-slate-300 object-contain"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void parseNutritionLabelImage()}
                disabled={!labelImageFile || ocrBusy}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {ocrBusy ? `Parsing label... ${ocrProgress}%` : "Parse Nutrition Label"}
              </button>
              <p className="text-[11px] text-slate-500">
                Best results: keep the label flat, clear, and fully visible. Blurry or partial labels reduce confidence.
              </p>
            </div>
          )}

          {scanInfo ? <p className="mt-2 text-xs text-emerald-700">{scanInfo}</p> : null}
          {scanError ? <p className="mt-2 text-xs text-rose-700">{scanError}</p> : null}
        </div>
      ) : null}

      <form onSubmit={submitFood} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-600">
            Food Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Food name"
              className={fieldInputClass(uncertainFields, "name")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Serving Size Text
            <input
              value={servingSizeText}
              onChange={(event) => setServingSizeText(event.target.value)}
              placeholder="e.g. 1 tbsp (15g)"
              className={fieldInputClass(uncertainFields, "servingSizeText")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Serving Size (g)
            <input
              value={servingSizeG}
              onChange={(event) => setServingSizeG(event.target.value)}
              type="number"
              min={0.1}
              step="0.1"
              required
              placeholder="15"
              className={fieldInputClass(uncertainFields, "servingSizeG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Servings / Container
            <input
              value={servingsPerContainer}
              onChange={(event) => setServingsPerContainer(event.target.value)}
              type="number"
              min={0.1}
              step="0.1"
              placeholder="about 16"
              className={fieldInputClass(uncertainFields, "servingsPerContainer")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Calories (kcal)
            <input
              value={caloriesKcal}
              onChange={(event) => setCaloriesKcal(event.target.value)}
              type="number"
              min={0}
              required
              placeholder="90"
              className={fieldInputClass(uncertainFields, "caloriesKcal")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Protein (g)
            <input
              value={proteinG}
              onChange={(event) => setProteinG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "proteinG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Carbohydrates (g)
            <input
              value={carbsG}
              onChange={(event) => setCarbsG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "carbsG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Total Fat (g)
            <input
              value={fatG}
              onChange={(event) => setFatG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "fatG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Saturated Fat (g)
            <input
              value={saturatedFatG}
              onChange={(event) => setSaturatedFatG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "saturatedFatG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Trans Fat (g)
            <input
              value={transFatG}
              onChange={(event) => setTransFatG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "transFatG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Cholesterol (mg)
            <input
              value={cholesterolMg}
              onChange={(event) => setCholesterolMg(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "cholesterolMg")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Sodium (mg)
            <input
              value={sodiumMg}
              onChange={(event) => setSodiumMg(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "sodiumMg")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Dietary Fiber (g)
            <input
              value={fiberG}
              onChange={(event) => setFiberG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "fiberG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Total Sugars (g)
            <input
              value={sugarsG}
              onChange={(event) => setSugarsG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "sugarsG")}
            />
          </label>

          <label className="text-xs text-slate-600">
            Added Sugars (g)
            <input
              value={addedSugarsG}
              onChange={(event) => setAddedSugarsG(event.target.value)}
              type="number"
              min={0}
              step="0.1"
              placeholder="0"
              className={fieldInputClass(uncertainFields, "addedSugarsG")}
            />
          </label>
        </div>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Micronutrients</p>
            <button
              type="button"
              onClick={addMicronutrientRow}
              className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              Add Micronutrient
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {micronutrients.map((micronutrient, index) => (
              <div key={micronutrient.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
                <input
                  value={micronutrient.name}
                  onChange={(event) => updateMicronutrientRow(index, { name: event.target.value })}
                  placeholder="Name (e.g. Vitamin D)"
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                />
                <input
                  value={micronutrient.value}
                  onChange={(event) => updateMicronutrientRow(index, { value: event.target.value })}
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Value"
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                />
                <input
                  value={micronutrient.unit}
                  onChange={(event) => updateMicronutrientRow(index, { unit: event.target.value })}
                  placeholder="mg"
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => removeMicronutrientRow(index)}
                  className="rounded-md border border-rose-300 px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>
            ))}

            {micronutrients.length === 0 ? <p className="text-xs text-slate-500">No micronutrients added.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-semibold text-slate-700">Parse Quality</p>
          <p className="mt-1 text-slate-600">
            Source: {nutritionSource}
            {parseConfidence !== null ? ` · Confidence: ${Math.round(parseConfidence * 100)}%` : ""}
          </p>
          {uncertainFields.length > 0 ? (
            <p className="mt-1 text-amber-700">Low-confidence fields: {uncertainFields.join(", ")} (review before save)</p>
          ) : null}
          {parseWarnings.length > 0 ? (
            <ul className="mt-1 list-disc pl-4 text-amber-700">
              {parseWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">OCR Raw Text</summary>
          <textarea
            value={labelRawText}
            onChange={(event) => setLabelRawText(event.target.value)}
            rows={8}
            placeholder="Raw OCR text will appear here after label scan"
            className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
          />
        </details>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Food"}
        </button>

        {addError ? <p className="text-sm text-rose-600">{addError}</p> : null}
      </form>
    </article>
  );
}
