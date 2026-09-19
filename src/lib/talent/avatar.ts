import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "storage:";

/** Marker stored in employees.avatar_url for uploaded pictures. */
export function storagePointer(path: string) {
  return `${STORAGE_PREFIX}${path}`;
}

export function isStoragePointer(value: string | null | undefined) {
  return Boolean(value?.startsWith(STORAGE_PREFIX));
}

/**
 * Resolves an avatar value to something an <img> can use.
 * Uploaded pictures live in a private bucket, so they are signed on demand.
 */
export function useAvatarUrl(avatar: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(
    avatar && !isStoragePointer(avatar) ? avatar : null,
  );

  useEffect(() => {
    let active = true;
    if (!avatar) {
      setUrl(null);
      return;
    }
    if (!isStoragePointer(avatar)) {
      setUrl(avatar);
      return;
    }
    const path = avatar.slice(STORAGE_PREFIX.length);
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [avatar]);

  return url;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
