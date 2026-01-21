export class AssumptionTracker {
  private assumptions: { statement: string; confidence: "high" | "medium" | "low" }[] = [];

  add(statement: string, confidence: "high" | "medium" | "low") {
    this.assumptions.push({ statement, confidence });
  }

  assume<T>(statement: string, confidence: "high" | "medium" | "low", value: T): T {
    this.add(statement, confidence);
    return value;
  }

  list() {
    return this.assumptions;
  }
}
