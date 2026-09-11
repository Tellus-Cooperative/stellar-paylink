import type { LinkStore } from "@/lib/db/types";
import { InMemoryLinkStore } from "@/lib/db/memory-store";
import { PostgresLinkStore } from "@/lib/db/postgres-store";

/*
 * Next bundles route handlers and server components into separate module
 * graphs, so a plain module-level singleton is instantiated once per graph and
 * each one gets its own store. Pinning it to globalThis keeps every graph in
 * the same process on one store. This only holds within a single process —
 * sharing across instances is what the PostgreSQL store is for.
 */
const MEMORY_KEY = Symbol.for("stellar-paylink.link-store");
const POSTGRES_KEY = Symbol.for("stellar-paylink.postgres-store");

type StoreGlobal = typeof globalThis & {
  [MEMORY_KEY]?: InMemoryLinkStore;
  [POSTGRES_KEY]?: PostgresLinkStore;
};

function databaseUrl(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  return raw ? raw : null;
}

export function getLinkStore(): LinkStore {
  const url = databaseUrl();
  const store = globalThis as StoreGlobal;
  if (url) {
    if (!store[POSTGRES_KEY]) {
      store[POSTGRES_KEY] = new PostgresLinkStore(undefined, url);
    }
    return store[POSTGRES_KEY];
  }
  if (!store[MEMORY_KEY]) {
    store[MEMORY_KEY] = new InMemoryLinkStore();
  }
  return store[MEMORY_KEY];
}

export function resetLinkStoreForTests(): void {
  delete (globalThis as StoreGlobal)[MEMORY_KEY];
}

export async function closeLinkStoreForTests(): Promise<void> {
  const store = globalThis as StoreGlobal;
  if (store[POSTGRES_KEY]) {
    await store[POSTGRES_KEY]?.close();
    delete store[POSTGRES_KEY];
  }
  delete store[MEMORY_KEY];
}
