"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AvatarTask } from "@/types";

interface UseAvatarTaskReturn {
  task: AvatarTask | null;
  loading: boolean;
  error: string | null;
}

/**
 * Real-time listener for a single avatarTask Firestore document.
 * Subscribes when `docId` is non-null, unsubscribes on unmount or change.
 */
export function useAvatarTask(docId: string | null): UseAvatarTaskReturn {
  const [task, setTask] = useState<AvatarTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setTask(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, "avatarTasks", docId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setTask(null);
          setError("Avatar task not found");
        } else {
          const data = snapshot.data();
          setTask({
            id: snapshot.id,
            playerId: data.playerId ?? "",
            imageUrl: data.imageUrl ?? "",
            meshyTaskId: data.meshyTaskId ?? null,
            status: data.status ?? "queued",
            progress: data.progress ?? null,
            modelUrls: data.modelUrls ?? null,
            textureUrls: data.textureUrls ?? null,
            thumbnailUrl: data.thumbnailUrl ?? null,
            taskError: data.taskError ?? null,
            createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
            updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
          });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useAvatarTask] Snapshot error:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [docId]);

  return { task, loading, error };
}
