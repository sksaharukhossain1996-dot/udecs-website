export type NavigationState<T extends string> = { current: T; history: T[] };
export function visit<T extends string>(state: NavigationState<T>, next: T): NavigationState<T> {
  return next === state.current ? state : { current: next, history: [...state.history, state.current].slice(-100) };
}
export function previous<T extends string>(state: NavigationState<T>, home: T): NavigationState<T> {
  return { current: state.history.at(-1) ?? home, history: state.history.slice(0, -1) };
}
