import { ParsedIntent } from "../types/ParsedIntent";
import { AssumptionTracker } from "../state/AssumptionTracker";

export function parseIntent(rawText: string): ParsedIntent {
  const assumptions = new AssumptionTracker();

  // VERY SIMPLE HEURISTICS — DO NOT OVERENGINEER
  const text = rawText.toLowerCase();

  const action =
    text.includes("shoot") ? "shooting" :
    text.includes("attack") ? "fighting" :
    "unknown";

  if (action === "unknown") {
    assumptions.add("Assumed physical attack due to unclear verb", "low");
  }

  const distanceMatch = text.match(/(\d+)\s*(yards|yard|yd)/);
  let distance: number;
  if (distanceMatch) {
    distance = Number(distanceMatch[1]);
    assumptions.add(`Interpreted distance as ${distance} yards`, "high");
  } else {
    distance = assumptions.assume("Target is within weapon range (assumed 30 yards)", "medium", 30);
  }

  const mounted = text.includes("horse") || text.includes("mounted") || text.includes("gallop");
  if (mounted) {
    assumptions.add("Actor is mounted on horseback", "high");
  }

  return {
    rawText,
    action,
    distance,
    mounted,
    assumptions
  };
}
