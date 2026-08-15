import { CURRENT_PICKS, CURRENT_PICKS_Y12 } from "./data/lines";

export interface Scenario {
  id: string;
  name: string;
  picks: Record<number, string | null>;
  locked?: boolean;
}

export function makeDefaultY13Scenarios(): Scenario[] {
  return [{ id: "y13-actual", name: "Primary picks", picks: { ...CURRENT_PICKS } }];
}

export function makeDefaultY12Scenarios(): Scenario[] {
  return [
    { id: "y12-actual", name: "Her Y12 picks", picks: { ...CURRENT_PICKS_Y12 }, locked: true },
  ];
}

export function newScenarioId(): string {
  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
