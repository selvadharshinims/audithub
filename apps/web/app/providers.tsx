"use client";

import { QueryClient, onlineManager, useMutationState, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SwRegister } from "@/components/sw-register";
import { QUERY_CACHE_KEY } from "@/lib/api";

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data around long enough to survive reloads / offline sessions.
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        staleTime: 1000 * 30,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      // networkMode defaults to "online": while offline, queries return cached
      // data and mutations are paused (queued) until connectivity returns.
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : noopStorage,
      key: QUERY_CACHE_KEY,
      throttleTime: 1000,
    }),
  );

  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={client}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24 * 7,
          dehydrateOptions: {
            // Persist successful queries so data is viewable offline. We do NOT
            // persist queued mutations: their functions live in memory and can't
            // be replayed after a reload, so persisting them would strand writes.
            // In-session queued writes resume on reconnect; UnsyncedGuard stops
            // the user closing/reloading with unsynced work.
            shouldDehydrateQuery: (q) => q.state.status === "success",
            shouldDehydrateMutation: () => false,
          },
        }}
        onSuccess={() => client.resumePausedMutations()}
      >
        <OnlineSync />
        <UnsyncedGuard />
        <SwRegister />
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

/** When connectivity returns, replay queued writes and refresh data. */
function OnlineSync() {
  const client = useQueryClient();
  useEffect(() => {
    const flush = () => client.resumePausedMutations().then(() => client.invalidateQueries());
    const unsub = onlineManager.subscribe((online) => {
      if (online) flush();
    });
    // Belt-and-suspenders: the browser "online" event can fire without
    // onlineManager re-emitting in some browsers.
    window.addEventListener("online", flush);
    return () => {
      unsub();
      window.removeEventListener("online", flush);
    };
  }, [client]);
  return null;
}

/**
 * Warns before the page is closed/reloaded while offline writes are still
 * queued (paused mutations only replay in-session, so leaving loses them).
 */
function UnsyncedGuard() {
  const pending = useMutationState({ filters: { status: "pending" } }).length;
  useEffect(() => {
    if (pending === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending]);
  return null;
}
