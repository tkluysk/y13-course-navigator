import { useCallback, useRef, useState } from "react";

const MAX_HISTORY = 50;

/** Wraps a state setter (e.g. from useLocalStorage) with an undo stack.
 * Every call to the returned setter pushes the *previous* value onto the
 * stack before applying the update, so `undo()` restores it. History is
 * kept in memory only (not persisted) — reloading the page starts fresh,
 * which is fine since undo is for "oops, didn't mean to click that" in the
 * current session, not a permanent edit log. */
export function useUndoableState<T>(
  value: T,
  setValue: (updater: T | ((prev: T) => T)) => void
) {
  const historyRef = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const valueRef = useRef(value);
  valueRef.current = value;

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      historyRef.current.push(valueRef.current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      setCanUndo(true);
      setValue(updater);
    },
    [setValue]
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (previous === undefined) return;
    setCanUndo(historyRef.current.length > 0);
    setValue(previous);
  }, [setValue]);

  return { value, set, undo, canUndo };
}
