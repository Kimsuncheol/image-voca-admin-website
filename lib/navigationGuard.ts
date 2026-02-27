/**
 * Module-level navigation guard singleton.
 *
 * Pages that need to block in-app navigation (e.g. /add-voca with a pending
 * upload queue) register a guard function via `setNavigationGuard`.
 * Navigation entry points (AppNavSidebar) call `checkNavigationGuard` before
 * invoking `router.push` — if the guard returns false the push is skipped.
 *
 * The guard is automatically cleared on page unmount via the effect cleanup.
 */

let guard: (() => boolean) | null = null;

/** Register a synchronous function that returns true (allow) or false (block). */
export function setNavigationGuard(fn: () => boolean): void {
  guard = fn;
}

/** Remove the active guard (call in useEffect cleanup or when no longer needed). */
export function clearNavigationGuard(): void {
  guard = null;
}

/** Returns true if navigation is allowed, false if it should be blocked. */
export function checkNavigationGuard(): boolean {
  return guard ? guard() : true;
}
