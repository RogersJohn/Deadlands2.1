import { AssistantEngine } from "../AssistantEngine";

test("assistant always produces a suggested roll", () => {
  const result = AssistantEngine.suggestRoll(
    "Alice shoots at Bob while galloping on a horse, Bob is 100 yards away"
  );

  expect(result.suggestedRoll.trait).toBe("Shooting");
  expect(result.modifiers.length).toBeGreaterThan(0);
  expect(result.assumptions.length).toBeGreaterThan(0);
});
