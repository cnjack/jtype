// ESM port of `use-sync-external-store/with-selector` (React team's shim,
// MIT). The npm package ships CJS only; bundling it verbatim leaves a runtime
// `require("react")` against our externalized react peer, which crashes every
// pure-ESM consumer of the dist. @headlessui/react (react-glue.js) is the only
// importer; the package vite config aliases the specifier here. Logic follows
// the upstream production build 1:1 — only module format and types changed.
import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

const objectIs: (x: unknown, y: unknown) => boolean =
  typeof Object.is === 'function'
    ? Object.is
    : (x, y) =>
        (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
        (x !== x && y !== y)

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = useRef<{ hasValue: boolean; value: Selection | null } | null>(null)
  let inst: { hasValue: boolean; value: Selection | null }
  if (instRef.current === null) {
    inst = { hasValue: false, value: null }
    instRef.current = inst
  } else {
    inst = instRef.current
  }

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot: Snapshot
    let memoizedSelection: Selection
    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return currentSelection
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }
      const prevSnapshot = memoizedSnapshot
      const prevSelection = memoizedSelection
      if (objectIs(prevSnapshot, nextSnapshot)) return prevSelection
      const nextSelection = selector(nextSnapshot)
      if (isEqual !== undefined && isEqual(prevSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return prevSelection
      }
      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }
    const maybeGetServerSnapshot = getServerSnapshot ?? null
    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null ? undefined : () => memoizedSelector(maybeGetServerSnapshot()),
    ] as const
  }, [getSnapshot, getServerSnapshot, selector, isEqual])

  const value = useSyncExternalStore(subscribe, getSelection, getServerSelection)
  useEffect(() => {
    inst.hasValue = true
    inst.value = value
  }, [value])
  useDebugValue(value)
  return value
}
