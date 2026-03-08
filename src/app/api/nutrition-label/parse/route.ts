import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { mergeBarcodeAndLabel } from "@/lib/nutrition-label/merge";
import { parseNutritionLabelText } from "@/lib/nutrition-label/parser";

const parseRequestSchema = z.object({
  rawText: z.string().trim().min(1).max(120_000),
  ocrConfidence: z.number().min(0).max(1).optional(),
  barcodeContext: z
    .object({
      name: z.string().optional().nullable(),
      barcodeUpc: z.string().optional().nullable(),
      servingSizeG: z.number().optional().nullable(),
      caloriesKcal: z.number().optional().nullable(),
      fatG: z.number().optional().nullable(),
      carbsG: z.number().optional().nullable(),
      proteinG: z.number().optional().nullable(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const parsedLabel = parseNutritionLabelText(parsed.data.rawText, {
    ocrConfidence: parsed.data.ocrConfidence,
  });

  const merged = mergeBarcodeAndLabel(parsed.data.barcodeContext, parsedLabel);

  return NextResponse.json(
    {
      ok: true,
      parsed: merged,
    },
    { status: 200 },
  );
}
