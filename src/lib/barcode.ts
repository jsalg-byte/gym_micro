type BarcodeLookupResult = {
  found: boolean;
  source: "local" | "openfoodfacts" | "none";
  name?: string;
  servingSizeG?: number;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function lookupOpenFoodFacts(upc: string): Promise<BarcodeLookupResult> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${upc}.json`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { found: false, source: "none" };
  }

  const payload = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      serving_quantity?: number;
      nutriments?: {
        "energy-kcal_100g"?: number;
        proteins_100g?: number;
        carbohydrates_100g?: number;
        fat_100g?: number;
      };
    };
  };

  if (payload.status !== 1 || !payload.product) {
    return { found: false, source: "none" };
  }

  return {
    found: true,
    source: "openfoodfacts",
    name: payload.product.product_name ?? `UPC ${upc}`,
    servingSizeG: toNumber(payload.product.serving_quantity, 100),
    caloriesKcal: toNumber(payload.product.nutriments?.["energy-kcal_100g"]),
    proteinG: toNumber(payload.product.nutriments?.proteins_100g),
    carbsG: toNumber(payload.product.nutriments?.carbohydrates_100g),
    fatG: toNumber(payload.product.nutriments?.fat_100g),
  };
}
