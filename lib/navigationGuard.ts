/**
 * Module-level navigation guard singleton.
 *
 * Pages that need to block in-app navigation (e.g. /add-voca with a pending
 * upload queue) register a guard function via `setNavigationGuard`.
 * Navigation entry points (AppNavSidebar) call `dispatchNavigation` which
 * checks both the async interceptor and the legacy sync guard.
 *
 * The guard/interceptor is automatically cleared on page unmount via the
 * effect cleanup.
 */

// ── Legacy synchronous guard (used by /add-voca) ──────────────────────────
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

// ── Async interceptor (used by pages that need a confirm dialog) ───────────
type InterceptorFn = (href: string, proceed: () => void) => void;

let interceptor: InterceptorFn | null = null;

/**
 * Register an async interceptor. When navigation is attempted, the interceptor
 * receives the target href and a `proceed` callback. Call `proceed()` to
 * allow the navigation (e.g. after the user confirms in a dialog).
 */
export function setNavigationInterceptor(fn: InterceptorFn): void {
  interceptor = fn;
}

/** Remove the active interceptor. */
export function clearNavigationInterceptor(): void {
  interceptor = null;
}

/**
 * Dispatch a navigation intent. Checks the async interceptor first, then
 * falls back to the legacy sync guard. Call this from navigation entry points
 * instead of calling router.push() directly.
 */
export function dispatchNavigation(href: string, proceed: () => void): void {
  if (interceptor) {
    interceptor(href, proceed);
  } else if (guard) {
    if (guard()) proceed();
  } else {
    proceed();
  }
}
