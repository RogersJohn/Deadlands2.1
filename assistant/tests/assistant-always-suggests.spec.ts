import { AssistantEngine } from "../AssistantEngine";

test("assistant never refuses to suggest a roll, regardless of input quality", () => {
  const result = AssistantEngine.suggestRoll("???");

  expect(result).toBeDefined();
  expect(result.suggestedRoll).toBeDefined();
  expect(result.suggestedRoll.trait).toBeTruthy();
});
