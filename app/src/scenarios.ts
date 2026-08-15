import { CURRENT_PICKS } from "./data/lines";

export interface Scenario {
  id: string;
  name: string;
  picks: Record<number, string | null>;
}

export function makeDefaultScenario(): Scenario {
  return { id: "actual", name: "Primary picks", picks: { ...CURRENT_PICKS } };
}

export function newScenarioId(): string {
  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
