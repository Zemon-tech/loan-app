/**
 * Tiny module-level event bus for "session expired", so the fetch client and the session
 * provider can talk without a circular import. The client emits; the session provider (and
 * any screen that wants to react) subscribes.
 *
 * No payload is carried — the event is a pure signal. Nothing sensitive is ever passed here.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Fire the "session expired" signal to every subscriber. */
export function emitSessionExpired(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A listener throwing must never break the others or the caller.
    }
  }
}

/** Subscribe to the signal. Returns an unsubscribe function. */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
