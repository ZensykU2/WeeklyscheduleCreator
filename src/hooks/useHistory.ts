import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
    const [state, _setState] = useState<T>(initialState);
    const [past, setPast] = useState<T[]>([]);
    const [future, setFuture] = useState<T[]>([]);

    const setState = useCallback(
        (nextState: T | ((curr: T) => T), saveToHistory = true) => {
            _setState((curr) => {
                const resolved = typeof nextState === 'function'
                    ? (nextState as (c: T) => T)(curr)
                    : nextState;

                if (saveToHistory) {
                    setPast((p) => [...p, curr]);
                    setFuture([]);
                }
                return resolved;
            });
        },
        []
    );

    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setFuture((prev) => [state, ...prev]);
        _setState(previous);
    }, [past, state]);

    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast((prev) => [...prev, state]);
        setFuture(newFuture);
        _setState(next);
    }, [future, state]);

    return { state, setState, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
