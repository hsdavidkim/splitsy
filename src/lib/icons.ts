// Map an expense category (free text, often from a Splitwise export) to a
// playful emoji. Matching is fuzzy — we check for keywords so variants like
// "Food and drink - Other" and "Dining out" both resolve sensibly.

const RULES: [RegExp, string][] = [
  [/grocer/i, "🛒"],
  [/dining|restaurant|food|drink|coffee|brunch|lunch|dinner|takeout|takeaway/i, "🍽️"],
  [/liquor|alcohol|beer|wine|bar\b/i, "🍷"],
  [/gas|fuel/i, "⛽"],
  [/\bcar\b|auto|vehicle|parking|oil change/i, "🚗"],
  [/bicycle|bike/i, "🚲"],
  [/pet|cat|dog|vet|litter/i, "🐾"],
  [/medical|health|pharmacy|vitamin|collagen|drug/i, "💊"],
  [/household|cleaning|supplies|home/i, "🧻"],
  [/furniture|ikea/i, "🛋️"],
  [/electronic|gadget|device|vacuum|robot/i, "🔌"],
  [/game/i, "🎮"],
  [/music|concert/i, "🎵"],
  [/entertain|movie|show|museum/i, "🎭"],
  [/sport|gym|workout|fitness/i, "🏋️"],
  [/hotel|airbnb|lodging|stay/i, "🏨"],
  [/travel|flight|trip|hotel/i, "✈️"],
  [/util|electric|water|internet|phone|hydro/i, "💡"],
  [/rent|mortgage|housing/i, "🏠"],
  [/maintenance|repair|tools/i, "🛠️"],
  [/gift|present/i, "🎁"],
  [/payment|settle|transfer/i, "💸"],
];

/** Emoji for an expense given its category (and description as a fallback). */
export function categoryEmoji(
  category?: string | null,
  description?: string | null
): string {
  const haystack = `${category ?? ""} ${description ?? ""}`;
  for (const [re, emoji] of RULES) {
    if (re.test(haystack)) return emoji;
  }
  return "🧾"; // generic receipt
}
