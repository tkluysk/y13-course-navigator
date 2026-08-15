import { useState } from "react";
import type { Scenario } from "../scenarios";

interface Props {
  scenarios: Scenario[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export default function ScenarioBar({
  scenarios,
  activeId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onDuplicate,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startRename = (s: Scenario) => {
    setRenamingId(s.id);
    setDraftName(s.name);
  };

  const commitRename = () => {
    if (renamingId && draftName.trim()) {
      onRename(renamingId, draftName.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="scenario-bar">
      <div className="scenario-tabs">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={"scenario-tab" + (s.id === activeId ? " active" : "")}
          >
            {renamingId === s.id ? (
              <input
                autoFocus
                className="scenario-rename-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="scenario-tab-label"
                onClick={() => onSwitch(s.id)}
                onDoubleClick={() => startRename(s)}
                title="Click to switch, double-click to rename"
              >
                {s.name}
              </button>
            )}
            {scenarios.length > 1 && (
              <button
                type="button"
                className="scenario-tab-close"
                onClick={() => onDelete(s.id)}
                title="Delete this scenario"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="scenario-add"
          onClick={() => onCreate(`Scenario ${scenarios.length + 1}`)}
          title="New scenario"
        >
          + New
        </button>
        <button
          type="button"
          className="scenario-add"
          onClick={() => onDuplicate(activeId)}
          title="Duplicate current scenario"
        >
          Duplicate
        </button>
      </div>
    </div>
  );
}
