import { AssumptionTracker } from "../state/AssumptionTracker";

export interface ParsedIntent {
  rawText: string;
  action: string;
  distance: number;
  mounted: boolean;
  assumptions: AssumptionTracker;
}
