import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserAuth } from "./api";

const SESSION_KEY = "CASPIAN_USER_SESSION_V1";

let memorySession: UserAuth | null = null;
const listeners = new Set<(user: UserAuth | null) => void>();

function notify(user: UserAuth | null) {
  memorySession = user;
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch {}
  });
}

export async function saveSession(user: UserAuth): Promise<void> {
  memorySession = user;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn("Failed to persist session to storage:", err);
  }
  notify(user);
}

export async function getSession(): Promise<UserAuth | null> {
  if (memorySession) return memorySession;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memorySession = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to read session from storage:", err);
  }
  return null;
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn("Failed to clear session from storage:", err);
  }
  notify(null);
}

export function useSession() {
  const [user, setUser] = useState<UserAuth | null>(memorySession);
  const [loadingSession, setLoadingSession] = useState(memorySession === null);

  useEffect(() => {
    let mounted = true;
    getSession().then((s) => {
      if (mounted) {
        setUser(s);
        setLoadingSession(false);
      }
    });

    const handler = (u: UserAuth | null) => {
      if (mounted) {
        setUser(u);
        setLoadingSession(false);
      }
    };
    listeners.add(handler);
    return () => {
      mounted = false;
      listeners.delete(handler);
    };
  }, []);

  return {
    user,
    loadingSession,
    saveSession,
    clearSession,
  };
}
