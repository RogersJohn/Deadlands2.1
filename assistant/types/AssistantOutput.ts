export interface AssistantOutput {
  advisory: true;

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
