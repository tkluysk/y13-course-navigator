import { useState } from "react";
import type { Scenario } from "../scenarios";
import LockIcon from "./LockIcon";

interface Props {
  scenarios: Scenario[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export default function ScenarioBar({
  scenarios,
  activeId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onDuplicate,
  onToggleLock,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startRename = (s: Scenario) => {
    if (s.locked) return;
    setRenamingId(s.id);
    setDraftName(s.name);
  };

  const commitRename = () => {
    if (renamingId && draftName.trim()) {
      onRename(renamingId, draftName.trim());
    }
    setRenamingId(null);
  };

  const deletableCount = scenarios.filter((s) => !s.locked).length;

  return (
    <div className="scenario-bar">
      <div className="scenario-tabs">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={
              "scenario-tab" +
              (s.id === activeId ? " active" : "") +
              (s.locked ? " locked" : "")
            }
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
                title={
                  s.locked
                    ? "Locked — click to switch"
                    : "Click to switch, double-click to rename"
                }
              >
                {s.name}
              </button>
            )}
            {!s.locked && deletableCount > 1 && (
              <button
                type="button"
                className="scenario-tab-close"
                onClick={() => onDelete(s.id)}
                title="Delete this scenario"
              >
                ×
              </button>
            )}
            <button
              type="button"
              className={"scenario-tab-lock" + (s.locked ? " locked" : "")}
              onClick={() => onToggleLock(s.id)}
              title={s.locked ? "Unlock this scenario" : "Lock this scenario"}
            >
              <LockIcon locked={s.locked} size={15} />
            </button>
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
