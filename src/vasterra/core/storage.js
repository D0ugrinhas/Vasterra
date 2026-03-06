const DB_NAME = "vasterra-db";
const DB_STORE = "kv";
const DB_VERSION = 1;

let dbPromise = null;

const storageProvider = () => {
  if (typeof window === "undefined") return null;
  if (window.storage && typeof window.storage.get === "function" && typeof window.storage.set === "function") {
    return window.storage;
  }
  return null;
};

const parseAnyJson = (value) => {
  if (value == null) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") {
      try { return JSON.parse(value.value); } catch { return null; }
    }
    return value;
  }
  return null;
};

const openDb = () => {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
};

const idbGetRaw = async (key) => {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const idbSetRaw = async (key, raw) => {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      store.put({ key, value: raw, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const stGet = async (key) => {
  try {
    const provider = storageProvider();
    if (provider) {
      const result = await provider.get(key);
      const parsed = parseAnyJson(result);
      if (parsed !== null) return parsed;
    }

    const rawDb = await idbGetRaw(key);
    const parsedDb = parseAnyJson(rawDb);
    if (parsedDb !== null) return parsedDb;

    if (typeof window !== "undefined") {
      const rawLocal = window.localStorage.getItem(key);
      return parseAnyJson(rawLocal);
    }

    return null;
  } catch {
    try {
      const rawDb = await idbGetRaw(key);
      const parsedDb = parseAnyJson(rawDb);
      if (parsedDb !== null) return parsedDb;
      if (typeof window !== "undefined") {
        return parseAnyJson(window.localStorage.getItem(key));
      }
    } catch {
      // ignore
    }
    return null;
  }
};

export const stSet = async (key, value) => {
  const payload = JSON.stringify(value);

  const provider = storageProvider();
  if (provider) {
    try {
      await provider.set(key, payload);
    } catch {
      try {
        await provider.set(key, { value: payload });
      } catch {
        // continue to fallbacks
      }
    }
  }

  await idbSetRaw(key, payload);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, payload);
    } catch {
      // localStorage quota can be exceeded for large payloads; IndexedDB still has data.
    }
  }
};
