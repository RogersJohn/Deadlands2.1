export interface AssistantOutput {
  suggestedRoll: {
    trait: string;
    targetNumber: number;
  };
  modifiers: {
    label: string;
    value: number;
    source: string;
  }[];
  netModifier: number;
  assumptions: {
    statement: string;
    confidence: "high" | "medium" | "low";
  }[];
  notes: string[];
}
