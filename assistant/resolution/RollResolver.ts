import { AssistantOutput } from "../types/AssistantOutput";
import { ParsedIntent } from "../types/ParsedIntent";

export function resolveRoll(intent: ParsedIntent): AssistantOutput {
  let trait = "Agility";

  if (intent.action === "shooting") {
    trait = "Shooting";
  } else if (intent.action === "fighting") {
    trait = "Fighting";
  }

  const modifiers: { label: string; value: number; source: string }[] = [];

  if (intent.distance > 50) {
    modifiers.push({
      label: "Long Range",
      value: -2,
      source: "Savage Worlds Ranged Modifiers"
    });
  }

  if (intent.mounted) {
    modifiers.push({
      label: "Unstable Platform (Mounted)",
      value: -2,
      source: "Mounted Combat"
    });
  }

  const netModifier = modifiers.reduce((sum, m) => sum + m.value, 0);

  return {
    suggestedRoll: {
      trait,
      targetNumber: 4
    },
    modifiers,
    netModifier,
    assumptions: intent.assumptions.list(),
    notes: [
      "Modifiers vary by weapon and mount control",
      "GM may adjust for circumstances"
    ]
  };
}
