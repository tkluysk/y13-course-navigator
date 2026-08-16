const STORAGE_PREFIX = "y13nav.";

export interface ExportedData {
  exportedAt: string;
  values: Record<string, unknown>;
}

export function exportData(): ExportedData {
  const values: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      values[key] = JSON.parse(raw);
    } catch {
      // skip anything that isn't valid JSON — shouldn't happen, but don't
      // let one bad key break the whole export
    }
  }
  return { exportedAt: new Date().toISOString(), values };
}

export function downloadExport() {
  const data = exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = data.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `y13-course-navigator-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Validates the shape and writes every y13nav.* key back into
 * localStorage. Caller is responsible for reloading the page afterwards
 * so every useLocalStorage hook picks up the restored values. */
export function importData(json: string): { ok: true } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("values" in parsed) ||
    typeof (parsed as ExportedData).values !== "object"
  ) {
    return { ok: false, error: "That file doesn't look like a Course Navigator export." };
  }
  const { values } = parsed as ExportedData;
  const entries = Object.entries(values).filter(([key]) => key.startsWith(STORAGE_PREFIX));
  if (entries.length === 0) {
    return { ok: false, error: "That file doesn't contain any Course Navigator data." };
  }
  for (const [key, value] of entries) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  return { ok: true };
}
