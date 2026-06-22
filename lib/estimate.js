// Shared meal-photo → nutrition estimation via Claude vision.
// Used by both the local dev server (server/index.js) and the Vercel
// serverless function (api/estimate.js).

import Anthropic from "@anthropic-ai/sdk";

// Default to Sonnet for a strong accuracy/cost balance on per-photo calls.
// Override with LOUIS_MODEL (e.g. claude-opus-4-8 for max accuracy).
export const DEFAULT_MODEL = process.env.LOUIS_MODEL || "claude-sonnet-4-6";

export const SYSTEM = `You are LOUIS, an expert nutrition-vision assistant. You estimate the nutrition of a meal from a photo as accurately as a trained dietitian would.

Work through these steps before answering:
1. IDENTIFY every distinct food/drink component in the image (e.g. "grilled chicken thigh", "white rice", "olive oil drizzle"). Don't miss sauces, dressings, oils, or drinks — they carry significant calories.
2. ESTIMATE the PORTION of each component in grams, using visual size references: a standard dinner plate is ~27cm, a fork ~19cm, a closed fist ~150g, a cupped palm ~40g of carbs, a thumb ~15g of fat/oil. Judge depth/height, not just area — food is 3D.
3. Use realistic cooking assumptions: restaurant/pan dishes usually include added oil or butter (add ~10-15g fat unless clearly dry/grilled plain). Account for breading, cheese, and visible grease.
4. COMPUTE macros per component from standard nutrition values, then SUM them for the whole portion shown. Calories must be roughly consistent with 4·protein + 4·carbs + 9·fat.

Calibration guidance (typical full portions): a chicken breast ~165 kcal/100g; cooked rice ~130 kcal/100g; a fast-food cheeseburger ~300-500 kcal; a large restaurant pasta ~700-1000 kcal; a side salad with dressing ~150-250 kcal. Avoid the common mistake of underestimating oils and large restaurant portions.

Return ONLY a single JSON object (no prose, no markdown fences) with exactly these keys:
{
  "title": string,            // short dish name, e.g. "Grilled chicken bowl"
  "items": string[],          // each visible component WITH its estimated portion, e.g. "Grilled chicken (~150g)"
  "macros": {
    "calories": number,       // kcal, total for the full portion shown
    "protein": number,        // grams, total
    "carbs": number,          // grams, total
    "fat": number             // grams, total
  },
  "healthScore": number,      // 0-100 nutritional quality. Whole foods, lean
                              // protein, vegetables score high (70-95).
                              // Fried, sugary, ultra-processed score low (10-40).
  "confidence": number        // 0-1: high (0.8+) for clear single foods, lower
                              // (0.4-0.6) for mixed/obscured plates or unknown recipes
}

Give your single best estimate, never a range. If the image is not food, return zeros and confidence 0.`;

/** Pull a JSON object out of model text, tolerating stray wrapping. */
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in response");
  return JSON.parse(text.slice(start, end + 1));
}

export function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) throw new Error("expected a base64 image data URL");
  return { mediaType: m[1], data: m[2] };
}

/** Run a meal-photo estimate. Throws Anthropic.APIError on API failures. */
export async function estimateMeal(image, model = DEFAULT_MODEL) {
  const { mediaType, data } = parseDataUrl(image);
  const client = new Anthropic();

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    // System prompt is stable across requests → cache it.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: "Estimate the nutrition for this meal." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("no text block in response");
  const parsed = extractJson(textBlock.text);

  return {
    title: String(parsed.title ?? "Meal"),
    items: Array.isArray(parsed.items) ? parsed.items.map(String) : [],
    macros: {
      calories: Math.round(Number(parsed.macros?.calories) || 0),
      protein: Math.round(Number(parsed.macros?.protein) || 0),
      carbs: Math.round(Number(parsed.macros?.carbs) || 0),
      fat: Math.round(Number(parsed.macros?.fat) || 0),
    },
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore) || 50))),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
    stub: false,
  };
}
