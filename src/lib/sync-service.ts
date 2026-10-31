import { localDb } from "./db-indexed";

export async function syncLocalInterviewsToServer(): Promise<{ syncedCount: number }> {
  if (typeof window === "undefined") return { syncedCount: 0 };

  try {
    const unsynced = await localDb.interviews
      .where("syncedToServer")
      .equals(0) // Dexie boolean: 0 = false
      .toArray();

    if (unsynced.length === 0) {
      return { syncedCount: 0 };
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const res = await fetch(`${basePath}/api/interviews/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessions: unsynced }),
    });

    if (!res.ok) {
      console.warn("Sync failed with status:", res.status);
      return { syncedCount: 0 };
    }

    const data = await res.json();
    if (data.syncedIds && Array.isArray(data.syncedIds)) {
      for (const id of data.syncedIds) {
        await localDb.interviews.update(id, { syncedToServer: true });
      }
    }

    return { syncedCount: data.syncedIds?.length || 0 };
  } catch (err) {
    console.error("Failed to sync interviews to server:", err);
    return { syncedCount: 0 };
  }
}

