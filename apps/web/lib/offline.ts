import { onlineManager } from "@tanstack/react-query";

/**
 * True when the browser is offline. Mutations use networkMode "online", so while
 * offline they are *paused* (queued) and their `mutateAsync` promise never
 * settles until connectivity returns. Callers that block UI on that promise
 * (e.g. closing a modal after `await mutateAsync`) must not await it when
 * offline — otherwise the form appears frozen on "Saving…" forever even though
 * the write was safely queued. Check this and resolve the UI optimistically.
 */
export function isOffline(): boolean {
  return !onlineManager.isOnline();
}
