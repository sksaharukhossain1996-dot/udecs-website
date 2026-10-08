import React, { createContext, useContext, useEffect, useRef } from 'react';
export type LocalBack = { label: string; run: () => void };
export const ManagementBackContext = createContext<(entry: LocalBack) => () => void>(() => () => {});
export function useLocalBack(active: boolean, label: string, run: () => void) {
  const register = useContext(ManagementBackContext);
  const latest = useRef(run); latest.current = run;
  useEffect(() => active ? register({ label, run: () => latest.current() }) : undefined, [active, label, register]);
}
export function BackButton({ onClick, label = 'Back', disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return <button type="button" className="management-back" disabled={disabled} onClick={onClick} aria-label={label} title={label}><span aria-hidden="true">←</span> Back</button>;
}
